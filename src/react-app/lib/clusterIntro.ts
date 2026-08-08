import * as THREE from 'three'
import {
  clamp01,
  easeInOutCubic,
  GLOBE_INTRO_CAMERA_START_FACTOR,
  GLOBE_INTRO_CUTOUT_CLOSE_BY_ZOOM,
  GLOBE_INTRO_LINE1_START,
  GLOBE_INTRO_LINE2_START,
  GLOBE_INTRO_LINE3_START,
  GLOBE_INTRO_LINE3_OUT_END,
  GLOBE_INTRO_SCREEN_CENTER_CUTOUT_RAD,
  GLOBE_INTRO_ZOOM_DURATION_SCALE,
  GLOBE_INTRO_ZOOM_END,
  globeIntroLine1InProgress,
  globeIntroLine2InProgress,
  globeIntroLine3InProgress,
  introSharedHemisphereLoadCaps,
  smoothstep,
} from '../utils/globeIntro'
import {
  computeGlobeOverviewCameraZ,
  GLOBE_CAMERA_FOV,
  GLOBE_RADIUS,
  viewAxisAngularDistance,
} from './globe'
import { type ClusterGlobe, type ClusterLayout } from './clusterLayout'

/** Share of post-reveal timeline for hero ring → globe morph. */
export const CLUSTER_INTRO_FILL_PHASE_SHARE = 0.42

/** Hero ring tiles placed evenly around the intro text. */
export const CLUSTER_INTRO_RING_SIZE = 12

/** Ring loads begin slightly before line 1 types in. */
export const CLUSTER_INTRO_RING_START = 0.02

/** Reveal, zoom, and image load begin after line 3 has fully faded out. */
export const CLUSTER_INTRO_REVEAL_START = GLOBE_INTRO_LINE3_OUT_END

export function clusterIntroRevealActive(progress: number): boolean {
  return progress >= CLUSTER_INTRO_REVEAL_START
}

/** Images load only once line 3 is gone and the camera zoom has started. */
export function clusterIntroImagesLoadActive(progress: number): boolean {
  if (progress < CLUSTER_INTRO_REVEAL_START) return false
  return clusterIntroZoomProgress(progress) > 0.001
}

/** Larger cutout during intro text so ring tiles never cover type. */
export function clusterIntroTextCenterCutoutRad(): number {
  return GLOBE_INTRO_SCREEN_CENTER_CUTOUT_RAD * 1.2
}

export function clusterIntroTextPhaseActive(progress: number): boolean {
  return (
    progress >= CLUSTER_INTRO_RING_START && !clusterIntroRevealActive(progress)
  )
}

/** How many hero ring tiles may appear — 4 per intro line, synced to type-in progress. */
export function clusterIntroTextSyncedRingAllowedCount(progress: number): number {
  const perLine = CLUSTER_INTRO_RING_SIZE / 3
  const line1 = globeIntroLine1InProgress(progress)
  const line2 = globeIntroLine2InProgress(progress)
  const line3 = globeIntroLine3InProgress(progress)

  if (progress < GLOBE_INTRO_LINE1_START) return 0

  let allowed = perLine * line1
  if (progress >= GLOBE_INTRO_LINE2_START) {
    allowed = perLine + perLine * line2
  }
  if (progress >= GLOBE_INTRO_LINE3_START) {
    allowed = perLine * 2 + perLine * line3
  }

  return Math.min(
    CLUSTER_INTRO_RING_SIZE,
    Math.max(0, Math.ceil(allowed - 1e-6)),
  )
}

function clusterIntroRingStartRank(loadTotal: number): number {
  return Math.max(0, loadTotal - CLUSTER_INTRO_RING_SIZE)
}

function clusterIntroRingCount(loadTotal: number): number {
  return Math.min(CLUSTER_INTRO_RING_SIZE, loadTotal)
}

function clusterIntroCenterFillRank(rank: number, loadTotal: number): number {
  const ringStart = clusterIntroRingStartRank(loadTotal)
  if (rank >= ringStart) return -1
  return ringStart - 1 - rank
}

function clusterIntroCenterFillCount(loadTotal: number): number {
  return clusterIntroRingStartRank(loadTotal)
}

export function clusterIntroRingHemisphereLoadCaps(
  progress: number,
  frontTotal: number,
  backTotal: number,
): { frontCap: number; backCap: number } {
  if (!clusterIntroImagesLoadActive(progress)) {
    return { frontCap: 0, backCap: 0 }
  }

  const ringTotal = frontTotal + backTotal
  if (ringTotal <= 0) return { frontCap: 0, backCap: 0 }

  const zoomP = clusterIntroZoomProgress(progress)
  return introSharedHemisphereLoadCaps(
    frontTotal,
    backTotal,
    easeInOutCubic(clamp01(zoomP * 0.92)),
  )
}

/** Hero center tiles load as the ring morphs into the globe. */
export function clusterIntroCenterLoadCaps(
  progress: number,
  frontTotal: number,
  backTotal: number,
): { frontCap: number; backCap: number } {
  if (!clusterIntroImagesLoadActive(progress)) {
    return { frontCap: 0, backCap: 0 }
  }
  const formP = clusterIntroHeroFormProgress(progress)
  if (formP <= 0.001) {
    return { frontCap: 0, backCap: 0 }
  }
  return introSharedHemisphereLoadCaps(frontTotal, backTotal, formP)
}

export function clusterIntroScreenCenterCutoutRad(progress: number): number {
  if (
    progress >= CLUSTER_INTRO_RING_START &&
    progress < CLUSTER_INTRO_REVEAL_START
  ) {
    return clusterIntroTextCenterCutoutRad()
  }

  if (clusterIntroRevealActive(progress)) {
    const zoomT = clusterIntroPostRevealT(progress)
    const cutoutP = easeInOutCubic(
      clamp01(zoomT / GLOBE_INTRO_CUTOUT_CLOSE_BY_ZOOM),
    )
    return clusterIntroTextCenterCutoutRad() * (1 - cutoutP)
  }

  return 0
}

export function clusterIntroHeroSphereRadius(separation: number): number {
  return GLOBE_RADIUS * 0.82 * separation
}

export function clusterIntroHeroStartCameraZ(separation: number): number {
  const overviewZ = computeGlobeOverviewCameraZ(
    clusterIntroHeroSphereRadius(separation),
    GLOBE_CAMERA_FOV,
  )
  return overviewZ * GLOBE_INTRO_CAMERA_START_FACTOR
}

export function pickHeroClusterGlobe(
  clusterGlobes: ClusterGlobe[],
): ClusterGlobe | null {
  if (clusterGlobes.length === 0) return null

  const centroid = new THREE.Vector3()
  for (const globe of clusterGlobes) {
    centroid.add(globe.center)
  }
  centroid.multiplyScalar(1 / clusterGlobes.length)

  return clusterGlobes.reduce((best, globe) => {
    if (globe.itemIds.size > best.itemIds.size) return globe
    if (globe.itemIds.size < best.itemIds.size) return best
    return globe.center.distanceToSquared(centroid) <
      best.center.distanceToSquared(centroid)
      ? globe
      : best
  })
}

/** Scale hero center tiles onto the intro sphere; ring uses applyHeroClusterIntroRingLayout. */
export function applyHeroClusterIntroSphereLayout(
  objects: Array<{
    userData: Record<string, unknown>
    position: THREE.Vector3
  }>,
  heroClusterId: string,
  separation: number,
  fieldMiniRadius: number,
): void {
  const introRadius = clusterIntroHeroSphereRadius(separation)
  const scale = fieldMiniRadius > 1e-6 ? introRadius / fieldMiniRadius : 1

  for (const obj of objects) {
    if (obj.userData.clusterId !== heroClusterId) continue
    if (obj.userData.introIsRingMember) continue
    const fieldLocal = obj.userData.fieldLocal as THREE.Vector3 | undefined
    if (!fieldLocal) continue
    const introLocal = fieldLocal.clone().multiplyScalar(scale * 0.42)
    obj.userData.introSphereLocal = introLocal
    obj.position.copy(introLocal)
    obj.userData.introHemisphereFront = introLocal.z >= 0
  }
}

/** Place hero ring tiles in an XY-plane belt (constant distance from view axis). */
export function applyHeroClusterIntroRingLayout(
  objects: Array<{
    userData: Record<string, unknown>
    position: THREE.Vector3
  }>,
  heroClusterId: string,
  separation: number,
): void {
  const introRadius = clusterIntroHeroSphereRadius(separation)
  const ringRadius = introRadius * 1.1
  const ringObjects = objects
    .filter(
      (obj) =>
        obj.userData.clusterId === heroClusterId &&
        obj.userData.introIsRingMember,
    )
    .sort(
      (a, b) =>
        ((a.userData.introLoadRank as number) ?? 0) -
        ((b.userData.introLoadRank as number) ?? 0),
    )

  const count = ringObjects.length
  ringObjects.forEach((obj, index) => {
    const theta = (index / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2
    const introLocal = new THREE.Vector3(
      Math.cos(theta) * ringRadius,
      Math.sin(theta) * ringRadius,
      Math.sin(theta * 1.6 + 0.3) * introRadius * 0.07,
    )
    obj.userData.introSphereLocal = introLocal
    obj.position.copy(introLocal)
    obj.userData.introHemisphereFront = introLocal.z >= 0
  })
}

export function recenterClusterLayoutAtCentroid(layout: ClusterLayout): boolean {
  if (layout.clusterGlobes.length === 0) return false

  const centroid = new THREE.Vector3()
  for (const globe of layout.clusterGlobes) {
    centroid.add(globe.center)
  }
  centroid.multiplyScalar(1 / layout.clusterGlobes.length)
  if (centroid.lengthSq() < 1e-6) return true

  for (const globe of layout.clusterGlobes) {
    globe.center.sub(centroid)
  }
  for (const position of layout.positions) {
    position.sub(centroid)
  }
  return true
}

export function centerSurroundingClustersAtOrigin(
  layout: ClusterLayout,
  heroId: string,
): boolean {
  const others = layout.clusterGlobes.filter((globe) => globe.id !== heroId)
  if (others.length === 0) return true

  const centroid = new THREE.Vector3()
  for (const globe of others) {
    centroid.add(globe.center)
  }
  centroid.multiplyScalar(1 / others.length)
  if (centroid.lengthSq() < 1e-6) return true

  for (const globe of others) {
    globe.center.sub(centroid)
  }
  for (let i = 0; i < layout.positions.length; i++) {
    layout.positions[i].sub(centroid)
  }
  return true
}

export function anchorHeroClusterAtOrigin(
  layout: ClusterLayout,
  heroId: string,
): boolean {
  const hero = layout.clusterGlobes.find((globe) => globe.id === heroId)
  if (!hero) return false

  const offset = hero.center.clone()
  if (offset.lengthSq() < 1e-6) return true

  for (const globe of layout.clusterGlobes) {
    globe.center.sub(offset)
  }
  for (const position of layout.positions) {
    position.sub(offset)
  }
  return true
}

export function centerHeroClusterFieldPositions(
  layout: ClusterLayout,
  heroId: string,
): boolean {
  const hero = layout.clusterGlobes.find((globe) => globe.id === heroId)
  if (!hero || hero.fieldPositions.size === 0) return false

  const centroid = new THREE.Vector3()
  for (const local of hero.fieldPositions.values()) {
    centroid.add(local)
  }
  centroid.multiplyScalar(1 / hero.fieldPositions.size)
  if (centroid.lengthSq() < 1e-6) return true

  for (const [itemId, local] of hero.fieldPositions.entries()) {
    hero.fieldPositions.set(itemId, local.clone().sub(centroid))
    const focusLocal = hero.focusPositions.get(itemId)
    if (focusLocal) {
      hero.focusPositions.set(itemId, focusLocal.clone().sub(centroid))
    }
  }

  return true
}

export function clusterIntroFieldBoundingRadius(layout: ClusterLayout): number {
  let maxR = layout.fieldRadius
  for (const globe of layout.clusterGlobes) {
    maxR = Math.max(maxR, globe.center.length() + globe.radius)
  }
  return maxR
}

function clusterIntroMinRingAxisAngle(): number {
  return clusterIntroTextCenterCutoutRad() * 1.05
}

export function configureClusterIntroParticipation(
  objects: Array<{ userData: Record<string, unknown> }>,
  heroClusterId: string,
): void {
  const heroObjects = objects.filter(
    (obj) => obj.userData.clusterId === heroClusterId,
  )
  const heroRanked = heroObjects
    .map((obj) => ({
      obj,
      centrality: viewAxisAngularDistance(
        (obj.userData.fieldLocal as THREE.Vector3 | undefined) ??
          new THREE.Vector3(),
      ),
    }))
    .sort((a, b) => a.centrality - b.centrality)

  const heroLoadTotal = heroRanked.length
  const heroRingCount = clusterIntroRingCount(heroLoadTotal)
  const heroCenterFillCount = clusterIntroCenterFillCount(heroLoadTotal)
  const minRingAngle = clusterIntroMinRingAxisAngle()
  const ringEligible = heroRanked.filter(
    (entry) => entry.centrality >= minRingAngle,
  )
  const ringPool =
    ringEligible.length >= heroRingCount
      ? ringEligible.slice(-heroRingCount)
      : heroRanked.slice(-heroRingCount)
  const ringObjects = new Set(ringPool.map((entry) => entry.obj))

  heroRanked.forEach((entry, rank) => {
    const isRingMember = ringObjects.has(entry.obj)
    const isCenterMember = !isRingMember
    entry.obj.userData.introIsRingMember = isRingMember
    entry.obj.userData.introIsCenterMember = isCenterMember
    entry.obj.userData.introLoadRank = rank
    entry.obj.userData.introRingCount = heroRingCount
    entry.obj.userData.introCenterFillRank = isCenterMember
      ? clusterIntroCenterFillRank(rank, heroLoadTotal)
      : -1
    entry.obj.userData.introCenterFillCount = heroCenterFillCount
    entry.obj.userData.introIsDeferredCluster = false
  })

  for (const obj of objects) {
    if (obj.userData.clusterId === heroClusterId) continue

    obj.userData.introIsRingMember = false
    obj.userData.introIsCenterMember = false
    obj.userData.introIsDeferredCluster = true
    delete obj.userData.introSphereLocal
  }
}

function clusterIntroPostRevealT(progress: number): number {
  if (!clusterIntroRevealActive(progress)) return 0
  const span = GLOBE_INTRO_ZOOM_END - CLUSTER_INTRO_REVEAL_START
  const slowedSpan = span * GLOBE_INTRO_ZOOM_DURATION_SCALE
  return clamp01((progress - CLUSTER_INTRO_REVEAL_START) / Math.max(0.0001, slowedSpan))
}

export function clusterIntroMotionEase(progress: number): number {
  if (!clusterIntroRevealActive(progress)) return 0
  return easeInOutCubic(clusterIntroPostRevealT(progress))
}

/** Rotation stays locked for the entire intro — handoff happens on intro exit only. */
export function clusterIntroRotationHandoff(_progress: number): number {
  return 0
}

/** Steady intro spin rate until the intro unlocks. */
export function clusterIntroSpinYScale(progress: number): number {
  if (progress < CLUSTER_INTRO_RING_START) return 0
  return 0.55
}

/** Center fill is part of hero form — no separate pre-zoom center burst. */
export function clusterIntroCenterFillProgress(progress: number): number {
  return clusterIntroHeroFormProgress(progress)
}

/** 0→1 while the hero intro ring morphs into the central cluster globe. */
export function clusterIntroHeroFormProgress(progress: number): number {
  if (!clusterIntroImagesLoadActive(progress)) return 0
  const zoomP = clusterIntroZoomProgress(progress)
  if (zoomP >= CLUSTER_INTRO_FILL_PHASE_SHARE) return 1
  return easeInOutCubic(
    clamp01(zoomP / Math.max(0.001, CLUSTER_INTRO_FILL_PHASE_SHARE)),
  )
}

/** 0→1 camera zoom — begins as soon as line 3 has faded out. */
export function clusterIntroZoomProgress(progress: number): number {
  if (!clusterIntroRevealActive(progress)) return 0
  return easeInOutCubic(clusterIntroPostRevealT(progress))
}

export function clusterIntroZoomActive(progress: number): boolean {
  return clusterIntroZoomProgress(progress) > 0.001
}

export function clusterIntroDeferredLoadActive(progress: number): boolean {
  if (!clusterIntroImagesLoadActive(progress)) return false
  return clusterIntroZoomProgress(progress) > 0.18
}

export function clusterIntroHeroItemBlend(progress: number): number {
  return clusterIntroHeroFormProgress(progress)
}

export function clusterIntroCameraZ(
  progress: number,
  heroStartZ: number,
  overviewZ: number,
): number {
  const zoomP = clusterIntroZoomProgress(progress)
  if (zoomP <= 0.001) return heroStartZ

  const heroGlobeZ = heroStartZ + (overviewZ - heroStartZ) * 0.34
  if (zoomP < 0.38) {
    return (
      heroStartZ +
      (heroGlobeZ - heroStartZ) * easeInOutCubic(zoomP / 0.38)
    )
  }

  const outerP = easeInOutCubic(clamp01((zoomP - 0.38) / 0.62))
  return heroGlobeZ + (overviewZ - heroGlobeZ) * outerP
}

export function clusterIntroConstellationSpreadProgress(
  progress: number,
): number {
  return clusterIntroZoomProgress(progress)
}

export function clusterIntroMaxSpread(
  clusterGlobes: ClusterGlobe[],
  heroId: string,
): number {
  const hero = clusterGlobes.find((globe) => globe.id === heroId)
  if (!hero) return 1
  let max = 1
  for (const globe of clusterGlobes) {
    if (globe.id === heroId) continue
    max = Math.max(max, hero.center.distanceTo(globe.center))
  }
  return max
}

export function clusterIntroDistanceNorm(
  clusterGlobes: ClusterGlobe[],
  heroId: string,
  clusterId: string,
): number {
  const hero = clusterGlobes.find((globe) => globe.id === heroId)
  const target = clusterGlobes.find((globe) => globe.id === clusterId)
  if (!hero || !target || heroId === clusterId) return 0
  const maxSpread = clusterIntroMaxSpread(clusterGlobes, heroId)
  return clamp01(hero.center.distanceTo(target.center) / maxSpread)
}

export function clusterIntroOtherReveal(
  progress: number,
  distanceNorm: number,
): number {
  return clusterIntroOtherOpacity(progress, distanceNorm)
}

/** Opacity for non-hero clusters — fade in at final layout positions as the camera zooms out. */
export function clusterIntroOtherOpacity(
  progress: number,
  distanceNorm: number,
): number {
  const zoomP = clusterIntroZoomProgress(progress)
  if (zoomP <= 0.001) return 0
  const threshold = 0.04 + clamp01(distanceNorm) * 0.26
  const fadeWindow = 0.44
  return smoothstep(clamp01((zoomP - threshold) / Math.max(0.001, fadeWindow)))
}
