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
  globeIntroCameraProgress,
  globeIntroFillProgress,
  introCenterFillCount,
  introCenterFillRank,
  introIsRingMember,
  introRingCount,
  introRingLoadProgress,
  introSharedHemisphereLoadCaps,
} from '../utils/globeIntro'
import {
  computeGlobeOverviewCameraZ,
  fibonacciSpherePositions,
  GLOBE_CAMERA_FOV,
  GLOBE_RADIUS,
  viewAxisAngularDistance,
} from './globe'
import { type ClusterGlobe, type ClusterLayout } from './clusterLayout'

export const CLUSTER_INTRO_RING_START = GLOBE_INTRO_RING_START
export const CLUSTER_INTRO_REVEAL_START = GLOBE_INTRO_REVEAL_START

export function clusterIntroRevealActive(progress: number): boolean {
  return progress >= CLUSTER_INTRO_REVEAL_START
}

export function clusterIntroTextPhaseActive(progress: number): boolean {
  return (
    progress >= CLUSTER_INTRO_RING_START && !clusterIntroRevealActive(progress)
  )
}

export function clusterIntroRingLoadProgress(progress: number): number {
  return introRingLoadProgress(progress)
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

export function clusterIntroHeroOverviewCameraZ(): number {
  return computeGlobeOverviewCameraZ(GLOBE_RADIUS, GLOBE_CAMERA_FOV)
}

export function clusterIntroHeroStartCameraZ(): number {
  return clusterIntroHeroOverviewCameraZ() * GLOBE_INTRO_CAMERA_START_FACTOR
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

export function snapshotClusterCenters(
  clusterGlobes: ClusterGlobe[],
): Map<string, THREE.Vector3> {
  const centers = new Map<string, THREE.Vector3>()
  for (const globe of clusterGlobes) {
    centers.set(globe.id, globe.center.clone())
  }
  return centers
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

/** Shift the layout so the hero cluster sits at world origin for the intro ring/globe. */
export function anchorHeroClusterAtOrigin(
  layout: ClusterLayout,
  heroId: string,
): boolean {
  const hero = layout.clusterGlobes.find((globe) => globe.id === heroId)
  if (!hero) return false

  const offset = hero.center.clone().negate()
  if (offset.lengthSq() < 1e-6) return true

  for (const globe of layout.clusterGlobes) {
    globe.center.add(offset)
  }
  for (const position of layout.positions) {
    position.add(offset)
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

export function clusterIntroFieldBoundingRadius(
  clusterGlobes: ClusterGlobe[],
  centers: Map<string, THREE.Vector3>,
  fieldRadius: number,
): number {
  let maxR = fieldRadius
  for (const globe of clusterGlobes) {
    const center = centers.get(globe.id) ?? globe.center
    maxR = Math.max(maxR, center.length() + globe.radius)
  }
  return maxR
}

/** Place hero tiles on the same fibonacci intro sphere as the single-globe intro. */
export function applyHeroClusterIntroSphereLayout(
  objects: Array<{
    userData: Record<string, unknown>
    position: THREE.Vector3
  }>,
  heroClusterId: string,
): void {
  const heroObjects = objects.filter(
    (obj) => obj.userData.clusterId === heroClusterId,
  )
  if (heroObjects.length === 0) return

  const spherePositions = fibonacciSpherePositions(
    heroObjects.length,
    GLOBE_RADIUS,
  )
  const sorted = [...heroObjects].sort((a, b) => {
    const itemA = a.userData.item as { id?: string } | undefined
    const itemB = b.userData.item as { id?: string } | undefined
    return (itemA?.id ?? '').localeCompare(itemB?.id ?? '')
  })

  sorted.forEach((obj, index) => {
    const introLocal = spherePositions[index].clone()
    obj.userData.introSphereLocal = introLocal
    obj.position.copy(introLocal)
    obj.userData.introHemisphereFront = introLocal.z >= 0
  })
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
  const heroRingCount = introRingCount(heroLoadTotal)
  const heroCenterFillCount = introCenterFillCount(heroLoadTotal)

  heroRanked.forEach((entry, rank) => {
    const isRingMember = introIsRingMember(rank, heroLoadTotal)
    const isCenterMember = !isRingMember
    entry.obj.userData.introIsRingMember = isRingMember
    entry.obj.userData.introIsCenterMember = isCenterMember
    entry.obj.userData.introLoadRank = rank
    entry.obj.userData.introRingCount = heroRingCount
    entry.obj.userData.introCenterFillRank = isCenterMember
      ? introCenterFillRank(rank, heroLoadTotal)
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

export function clusterIntroGroupPosition(
  clusterId: string,
  introCenters: Map<string, THREE.Vector3>,
  finalCenters: Map<string, THREE.Vector3>,
  constellationZoom: number,
  target: THREE.Vector3,
): THREE.Vector3 {
  const intro = introCenters.get(clusterId)
  const final = finalCenters.get(clusterId)
  if (!intro || !final) {
    return target.set(0, 0, 0)
  }
  return target.lerpVectors(intro, final, easeInOutCubic(constellationZoom))
}

function clusterIntroPostRevealT(progress: number): number {
  if (!clusterIntroRevealActive(progress)) return 0
  const span = GLOBE_INTRO_ZOOM_END - CLUSTER_INTRO_REVEAL_START
  const slowedSpan = span * GLOBE_INTRO_ZOOM_DURATION_SCALE
  return clamp01((progress - CLUSTER_INTRO_REVEAL_START) / Math.max(0.0001, slowedSpan))
}

export function clusterIntroCenterFillProgress(progress: number): number {
  return globeIntroFillProgress(progress)
}

export function clusterIntroMotionEase(progress: number): number {
  if (!clusterIntroRevealActive(progress)) return 0
  return easeInOutCubic(clusterIntroPostRevealT(progress))
}

export function clusterIntroRotationHandoff(progress: number): number {
  return clusterIntroMotionEase(progress)
}

export function clusterIntroHeroCameraComplete(progress: number): boolean {
  return clusterIntroRevealActive(progress) && globeIntroCameraProgress(progress) >= 0.995
}

export function clusterIntroConstellationZoomProgress(progress: number): number {
  if (!clusterIntroHeroCameraComplete(progress)) return 0
  const heroCameraEnd =
    CLUSTER_INTRO_REVEAL_START +
    (GLOBE_INTRO_ZOOM_END - CLUSTER_INTRO_REVEAL_START) *
      GLOBE_INTRO_ZOOM_DURATION_SCALE *
      0.72
  const constellationStart = Math.min(
    GLOBE_INTRO_ZOOM_END - 0.001,
    heroCameraEnd,
  )
  if (progress <= constellationStart) return 0
  const span = Math.max(0.001, GLOBE_INTRO_ZOOM_END - constellationStart)
  return easeInOutCubic(clamp01((progress - constellationStart) / span))
}

export function clusterIntroZoomProgress(progress: number): number {
  return clusterIntroConstellationZoomProgress(progress)
}

export function clusterIntroZoomActive(progress: number): boolean {
  return clusterIntroConstellationZoomProgress(progress) > 0.001
}

export function clusterIntroDeferredLoadActive(progress: number): boolean {
  return clusterIntroConstellationZoomProgress(progress) > 0.001
}

export function clusterIntroHeroItemBlend(progress: number): number {
  const zoom = clusterIntroConstellationZoomProgress(progress)
  if (zoom <= 0) return 0
  return easeInOutCubic(zoom)
}

export function clusterIntroCameraZ(
  progress: number,
  heroStartZ: number,
  heroOverviewZ: number,
  constellationOverviewZ: number,
): number {
  const heroCameraT = globeIntroCameraProgress(progress)
  const heroPhaseZ = heroStartZ + (heroOverviewZ - heroStartZ) * heroCameraT
  const constellationZoom = clusterIntroConstellationZoomProgress(progress)
  return (
    heroPhaseZ +
    (constellationOverviewZ - heroPhaseZ) * constellationZoom
  )
}

export function clusterIntroHeroZoomTimelineComplete(progress: number): boolean {
  if (progress >= 1) return true
  return clusterIntroHeroCameraComplete(progress)
}

export function clusterIntroZoomTimelineComplete(progress: number): boolean {
  if (progress >= 1) return true
  return clusterIntroConstellationZoomProgress(progress) >= 0.995
}

export function clusterIntroHeroGlobeSequenceComplete(
  progress: number,
  loadedCount: number,
  totalCount: number,
): boolean {
  if (!clusterIntroHeroZoomTimelineComplete(progress)) return false
  if (totalCount <= 0) return true
  return loadedCount >= totalCount
}

export function clusterIntroMaxSpread(
  clusterGlobes: ClusterGlobe[],
  heroId: string,
  centers: Map<string, THREE.Vector3>,
): number {
  const heroCenter = centers.get(heroId)
  if (!heroCenter) return 1
  let max = 1
  for (const globe of clusterGlobes) {
    if (globe.id === heroId) continue
    const center = centers.get(globe.id) ?? globe.center
    max = Math.max(max, heroCenter.distanceTo(center))
  }
  return max
}

export function clusterIntroDistanceNorm(
  clusterGlobes: ClusterGlobe[],
  heroId: string,
  clusterId: string,
  centers: Map<string, THREE.Vector3>,
): number {
  const heroCenter = centers.get(heroId)
  const target = centers.get(clusterId)
  if (!heroCenter || !target || heroId === clusterId) return 0
  const maxSpread = clusterIntroMaxSpread(clusterGlobes, heroId, centers)
  return clamp01(heroCenter.distanceTo(target) / maxSpread)
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
