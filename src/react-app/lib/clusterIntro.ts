import * as THREE from 'three'
import {
  clamp01,
  easeInOutCubic,
  easeOutCubic,
  globeIntroZoomPhaseT,
  GLOBE_INTRO_CAMERA_START_FACTOR,
  introCenterFillCount,
  introCenterFillRank,
  introCenterPrefetchActive,
  introIsRingMember,
  introRevealActive,
  introRingCount,
} from '../utils/globeIntro'
import {
  computeGlobeOverviewCameraZ,
  GLOBE_CAMERA_FOV,
  GLOBE_RADIUS,
  viewAxisAngularDistance,
} from './globe'
import {
  miniGlobePositions,
  type ClusterGlobe,
  type ClusterLayout,
} from './clusterLayout'

/** Share of post-reveal timeline spent completing the hero globe before zoom-out. */
export const CLUSTER_INTRO_FILL_PHASE_SHARE = 0.36

/** Hero mini-globe compresses during the final portion of zoom-out. */
export const CLUSTER_INTRO_HERO_SETTLE_START = 0.72

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
  return clusterGlobes.reduce((best, globe) =>
    globe.itemIds.size > best.itemIds.size ? globe : best,
  )
}

/** Every hero image shares one large intro sphere so ring → globe is seamless. */
export function applyHeroClusterIntroSphereLayout(
  objects: Array<{
    userData: Record<string, unknown>
    position: THREE.Vector3
  }>,
  heroClusterId: string,
  separation: number,
): void {
  const heroObjects = objects
    .filter((obj) => obj.userData.clusterId === heroClusterId)
    .sort(
      (a, b) =>
        ((a.userData.introLoadRank as number) ?? 0) -
        ((b.userData.introLoadRank as number) ?? 0),
    )

  const positions = miniGlobePositions(
    heroObjects.length,
    clusterIntroHeroSphereRadius(separation),
  )

  heroObjects.forEach((obj, index) => {
    const introLocal = positions[index].clone()
    obj.userData.introSphereLocal = introLocal
    obj.position.copy(introLocal)
    obj.userData.introHemisphereFront = introLocal.z >= 0
  })
}

/** Shift the field so the hero cluster sits at the origin. */
export function recenterClusterLayoutAroundHero(
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
        (obj.userData.fieldLocal as THREE.Vector3) ?? new THREE.Vector3(),
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

function clusterIntroPostRevealT(progress: number): number {
  if (!introRevealActive(progress)) return 0
  return globeIntroZoomPhaseT(progress)
}

/** 0→1 while the hero globe center-fills on the intro sphere; camera stays put. */
export function clusterIntroCenterFillProgress(progress: number): number {
  if (!introCenterPrefetchActive(progress)) return 0
  const postRevealT = clusterIntroPostRevealT(progress)
  if (postRevealT <= 0) return 0
  if (postRevealT >= CLUSTER_INTRO_FILL_PHASE_SHARE) return 1
  return easeInOutCubic(
    clamp01(postRevealT / Math.max(0.001, CLUSTER_INTRO_FILL_PHASE_SHARE)),
  )
}

/** 0→1 during zoom-out after the hero globe has formed at center. */
export function clusterIntroZoomProgress(progress: number): number {
  if (!introRevealActive(progress)) return 0
  const postRevealT = clusterIntroPostRevealT(progress)
  if (postRevealT <= CLUSTER_INTRO_FILL_PHASE_SHARE) return 0
  return easeInOutCubic(
    clamp01(
      (postRevealT - CLUSTER_INTRO_FILL_PHASE_SHARE) /
        Math.max(0.001, 1 - CLUSTER_INTRO_FILL_PHASE_SHARE),
    ),
  )
}

export function clusterIntroZoomActive(progress: number): boolean {
  return clusterIntroZoomProgress(progress) > 0.001
}

export function clusterIntroDeferredLoadActive(progress: number): boolean {
  return clusterIntroZoomActive(progress)
}

export function clusterIntroHeroSettleBlend(progress: number): number {
  const zoom = clusterIntroZoomProgress(progress)
  if (zoom <= CLUSTER_INTRO_HERO_SETTLE_START) return 0
  return easeInOutCubic(
    clamp01(
      (zoom - CLUSTER_INTRO_HERO_SETTLE_START) /
        Math.max(0.001, 1 - CLUSTER_INTRO_HERO_SETTLE_START),
    ),
  )
}

/** Hero compresses from intro sphere → field layout during late zoom-out. */
export function clusterIntroHeroItemBlend(progress: number): number {
  return clusterIntroHeroSettleBlend(progress)
}

export function clusterIntroCameraZ(
  progress: number,
  heroStartZ: number,
  overviewZ: number,
): number {
  const t = clusterIntroZoomProgress(progress)
  return heroStartZ + (overviewZ - heroStartZ) * t
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
  const t = clusterIntroZoomProgress(progress)
  if (t <= 0.001) return 0
  const threshold = clamp01(distanceNorm) * 0.42
  if (t <= threshold) return 0
  return easeOutCubic(clamp01((t - threshold) / Math.max(0.001, 1 - threshold)))
}

