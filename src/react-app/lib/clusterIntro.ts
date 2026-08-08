import * as THREE from 'three'
import {
  clamp01,
  easeInOutCubic,
  easeOutCubic,
  GLOBE_INTRO_CAMERA_START_FACTOR,
  GLOBE_INTRO_CUTOUT_CLOSE_BY_ZOOM,
  GLOBE_INTRO_REVEAL_START,
  GLOBE_INTRO_RING_START,
  GLOBE_INTRO_SCREEN_CENTER_CUTOUT_RAD,
  GLOBE_INTRO_ZOOM_DURATION_SCALE,
  GLOBE_INTRO_ZOOM_END,
  introRingLoadProgress,
  introSharedHemisphereLoadCaps,
} from '../utils/globeIntro'
import {
  computeGlobeOverviewCameraZ,
  GLOBE_CAMERA_FOV,
  GLOBE_RADIUS,
  viewAxisAngularDistance,
} from './globe'
import { type ClusterGlobe, type ClusterLayout } from './clusterLayout'

/** Share of post-reveal timeline spent completing the hero globe before zoom-out. */
export const CLUSTER_INTRO_FILL_PHASE_SHARE = 0.36

/** Hero mini-globe compresses during the final portion of constellation zoom-out. */
export const CLUSTER_INTRO_HERO_SETTLE_START = 0.72

/** Share of zoom-out spent framing the hero globe before revealing the constellation. */
export const CLUSTER_INTRO_HERO_ZOOM_SHARE = 0.44

/** Ring tiles on the hero intro sphere (matches single-globe outer band). */
export const CLUSTER_INTRO_RING_SIZE = 15

/** Ring loads use the same start as the standard globe intro. */
export const CLUSTER_INTRO_RING_START = GLOBE_INTRO_RING_START

/** Center fill and zoom begin with the standard globe reveal window. */
export const CLUSTER_INTRO_REVEAL_START = GLOBE_INTRO_REVEAL_START

export function clusterIntroRevealActive(progress: number): boolean {
  return progress >= CLUSTER_INTRO_REVEAL_START
}

export function clusterIntroTextPhaseActive(progress: number): boolean {
  return (
    progress >= CLUSTER_INTRO_RING_START && !clusterIntroRevealActive(progress)
  )
}

/** 0→1 ring load budget — aligned with the standard globe intro. */
export function clusterIntroRingLoadProgress(progress: number): number {
  return introRingLoadProgress(progress)
}

function clusterIntroRingStartRank(loadTotal: number): number {
  return Math.max(0, loadTotal - CLUSTER_INTRO_RING_SIZE)
}

function clusterIntroRingCount(loadTotal: number): number {
  return Math.min(CLUSTER_INTRO_RING_SIZE, loadTotal)
}

function clusterIntroIsRingMember(rank: number, loadTotal: number): boolean {
  return rank >= clusterIntroRingStartRank(loadTotal)
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
  return introSharedHemisphereLoadCaps(
    frontTotal,
    backTotal,
    clusterIntroRingLoadProgress(progress),
  )
}

/** Prefetch inner hero tiles once the ring is complete and reveal begins. */
export function clusterIntroEarlyCenterLoadCaps(
  progress: number,
  frontTotal: number,
  backTotal: number,
): { frontCap: number; backCap: number } {
  if (!clusterIntroRevealActive(progress)) {
    return { frontCap: 0, backCap: 0 }
  }
  return introSharedHemisphereLoadCaps(
    frontTotal,
    backTotal,
    clusterIntroCenterFillProgress(progress),
  )
}

export function clusterIntroScreenCenterCutoutRad(progress: number): number {
  if (
    progress >= CLUSTER_INTRO_RING_START &&
    progress < CLUSTER_INTRO_REVEAL_START
  ) {
    return GLOBE_INTRO_SCREEN_CENTER_CUTOUT_RAD
  }

  if (clusterIntroRevealActive(progress)) {
    const zoomT = clusterIntroPostRevealT(progress)
    const cutoutP = easeInOutCubic(
      clamp01(zoomT / GLOBE_INTRO_CUTOUT_CLOSE_BY_ZOOM),
    )
    return GLOBE_INTRO_SCREEN_CENTER_CUTOUT_RAD * (1 - cutoutP)
  }

  return 0
}

export function clusterIntroHeroSphereRadius(separation: number): number {
  return GLOBE_RADIUS * 0.82 * separation
}

export function clusterIntroHeroOverviewCameraZ(separation: number): number {
  return computeGlobeOverviewCameraZ(
    clusterIntroHeroSphereRadius(separation),
    GLOBE_CAMERA_FOV,
  )
}

export function clusterIntroHeroStartCameraZ(separation: number): number {
  return (
    clusterIntroHeroOverviewCameraZ(separation) * GLOBE_INTRO_CAMERA_START_FACTOR
  )
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

/** Scale the hero mini-globe onto the intro sphere — same outer-band ring as single globe. */
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
    const fieldLocal = obj.userData.fieldLocal as THREE.Vector3 | undefined
    if (!fieldLocal) continue
    const introLocal = fieldLocal.clone().multiplyScalar(scale)
    obj.userData.introSphereLocal = introLocal
    obj.position.copy(introLocal)
    obj.userData.introHemisphereFront = introLocal.z >= 0
  }
}

/** Shift the constellation so its centroid sits at the origin (viewport center). */
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

/** Nudge the field so the hero cluster globe center is exactly at the origin. */
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

/** Center hero tile offsets on x/y/z so the mini-globe sits at the cluster origin. */
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
        (obj.userData.introSphereLocal as THREE.Vector3 | undefined) ??
          (obj.userData.fieldLocal as THREE.Vector3) ??
          new THREE.Vector3(),
      ),
    }))
    .sort((a, b) => a.centrality - b.centrality)

  const heroLoadTotal = heroRanked.length
  const heroRingCount = clusterIntroRingCount(heroLoadTotal)
  const heroCenterFillCount = clusterIntroCenterFillCount(heroLoadTotal)

  heroRanked.forEach((entry, rank) => {
    const isRingMember = clusterIntroIsRingMember(rank, heroLoadTotal)
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

function clusterIntroZoomWindowT(progress: number): number {
  if (!clusterIntroRevealActive(progress)) return 0
  const postRevealT = clusterIntroPostRevealT(progress)
  if (postRevealT <= CLUSTER_INTRO_FILL_PHASE_SHARE) return 0
  const zoomSpan = 1 - CLUSTER_INTRO_FILL_PHASE_SHARE
  return clamp01((postRevealT - CLUSTER_INTRO_FILL_PHASE_SHARE) / Math.max(0.001, zoomSpan))
}

export function clusterIntroMotionEase(progress: number): number {
  if (!clusterIntroRevealActive(progress)) return 0
  return easeInOutCubic(clusterIntroPostRevealT(progress))
}

export function clusterIntroRotationHandoff(progress: number): number {
  return clusterIntroMotionEase(progress)
}

/** 0→1 while the hero globe center-fills on the intro sphere; camera stays put. */
export function clusterIntroCenterFillProgress(progress: number): number {
  if (!clusterIntroRevealActive(progress)) return 0
  const postRevealT = clusterIntroPostRevealT(progress)
  if (postRevealT <= 0) return 0
  if (postRevealT >= CLUSTER_INTRO_FILL_PHASE_SHARE) return 1
  return easeInOutCubic(
    clamp01(postRevealT / Math.max(0.001, CLUSTER_INTRO_FILL_PHASE_SHARE)),
  )
}

/** 0→1 while the camera zooms out to frame the completed hero globe. */
export function clusterIntroHeroZoomProgress(progress: number): number {
  const zoomT = clusterIntroZoomWindowT(progress)
  if (zoomT <= 0) return 0
  if (zoomT >= CLUSTER_INTRO_HERO_ZOOM_SHARE) return 1
  return easeInOutCubic(
    clamp01(zoomT / Math.max(0.001, CLUSTER_INTRO_HERO_ZOOM_SHARE)),
  )
}

/** 0→1 while the camera zooms out to reveal the full constellation. */
export function clusterIntroConstellationZoomProgress(progress: number): number {
  const zoomT = clusterIntroZoomWindowT(progress)
  if (zoomT <= CLUSTER_INTRO_HERO_ZOOM_SHARE) return 0
  return easeInOutCubic(
    clamp01(
      (zoomT - CLUSTER_INTRO_HERO_ZOOM_SHARE) /
        Math.max(0.001, 1 - CLUSTER_INTRO_HERO_ZOOM_SHARE),
    ),
  )
}

/** Combined zoom for deferred-cluster reveal and completion checks. */
export function clusterIntroZoomProgress(progress: number): number {
  return clusterIntroConstellationZoomProgress(progress)
}

export function clusterIntroZoomActive(progress: number): boolean {
  return clusterIntroZoomWindowT(progress) > 0.001
}

export function clusterIntroDeferredLoadActive(progress: number): boolean {
  return clusterIntroConstellationZoomProgress(progress) > 0.001
}

export function clusterIntroHeroSettleBlend(progress: number): number {
  const zoom = clusterIntroConstellationZoomProgress(progress)
  if (zoom <= CLUSTER_INTRO_HERO_SETTLE_START) return 0
  return easeInOutCubic(
    clamp01(
      (zoom - CLUSTER_INTRO_HERO_SETTLE_START) /
        Math.max(0.001, 1 - CLUSTER_INTRO_HERO_SETTLE_START),
    ),
  )
}

/** Hero compresses from intro sphere → field layout during constellation zoom-out. */
export function clusterIntroHeroItemBlend(progress: number): number {
  return clusterIntroHeroSettleBlend(progress)
}

/** 1 while the hero is viewport-centered; eases to 0 during constellation zoom. */
export function clusterIntroGlobePanBlend(progress: number): number {
  if (!clusterIntroRevealActive(progress)) return 1
  return 1 - easeInOutCubic(clusterIntroConstellationZoomProgress(progress))
}

export function clusterIntroGlobePanOffset(
  heroCenter: THREE.Vector3,
  progress: number,
): THREE.Vector3 {
  const blend = clusterIntroGlobePanBlend(progress)
  if (blend <= 0.001) {
    return new THREE.Vector3(0, 0, 0)
  }
  return heroCenter.clone().multiplyScalar(-blend)
}

export function clusterIntroCameraZ(
  progress: number,
  heroStartZ: number,
  heroOverviewZ: number,
  constellationOverviewZ: number,
): number {
  const heroZoom = clusterIntroHeroZoomProgress(progress)
  const constellationZoom = clusterIntroConstellationZoomProgress(progress)
  const heroPhaseZ = heroStartZ + (heroOverviewZ - heroStartZ) * heroZoom
  return (
    heroPhaseZ +
    (constellationOverviewZ - heroPhaseZ) * constellationZoom
  )
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
  const t = clusterIntroConstellationZoomProgress(progress)
  if (t <= 0.001) return 0
  const threshold = clamp01(distanceNorm) * 0.42
  if (t <= threshold) return 0
  return easeOutCubic(clamp01((t - threshold) / Math.max(0.001, 1 - threshold)))
}
