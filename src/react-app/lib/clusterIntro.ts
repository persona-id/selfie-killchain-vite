import * as THREE from 'three'
import {
  clamp01,
  easeOutCubic,
  globeIntroCameraProgress,
  introCenterFillCount,
  introCenterFillRank,
  introIsRingMember,
  introRevealActive,
  introRingCount,
} from '../utils/globeIntro'
import { viewAxisAngularDistance } from './globe'
import type { ClusterGlobe } from './clusterLayout'

export function pickHeroClusterGlobe(
  clusterGlobes: ClusterGlobe[],
): ClusterGlobe | null {
  if (clusterGlobes.length === 0) return null
  return clusterGlobes.reduce((best, globe) =>
    viewAxisAngularDistance(globe.center) <
    viewAxisAngularDistance(best.center)
      ? globe
      : best,
  )
}

export function clusterIntroCameraZ(
  progress: number,
  heroStartZ: number,
  overviewZ: number,
): number {
  const t = globeIntroCameraProgress(progress)
  return heroStartZ + (overviewZ - heroStartZ) * t
}

export function clusterIntroHeroGroupBlend(progress: number): number {
  return globeIntroCameraProgress(progress)
}

export function clusterIntroOtherReveal(
  progress: number,
  distanceNorm: number,
): number {
  if (!introRevealActive(progress)) return 0
  const t = globeIntroCameraProgress(progress)
  const threshold = clamp01(distanceNorm) * 0.42
  if (t <= threshold) return 0
  return easeOutCubic(clamp01((t - threshold) / Math.max(0.001, 1 - threshold)))
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

export function clusterIntroHeroPosition(
  fieldCenter: THREE.Vector3,
  blend: number,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  return out.lerpVectors(new THREE.Vector3(0, 0, 0), fieldCenter, blend)
}

export function configureHeroClusterIntroRanks(
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
        obj.userData.fieldLocal as THREE.Vector3,
      ),
    }))
    .sort((a, b) => a.centrality - b.centrality)

  const heroLoadTotal = heroRanked.length
  const ringCount = introRingCount(heroLoadTotal)
  const centerFillCount = introCenterFillCount(heroLoadTotal)

  heroRanked.forEach((entry, rank) => {
    const isRingMember = introIsRingMember(rank, heroLoadTotal)
    const isCenterMember = !isRingMember
    entry.obj.userData.introIsRingMember = isRingMember
    entry.obj.userData.introIsCenterMember = isCenterMember
    entry.obj.userData.introLoadRank = rank
    entry.obj.userData.introRingCount = ringCount
    entry.obj.userData.introCenterFillRank = isCenterMember
      ? introCenterFillRank(rank, heroLoadTotal)
      : -1
    entry.obj.userData.introCenterFillCount = centerFillCount
    entry.obj.userData.introIsDeferredCluster = false
  })

  for (const obj of objects) {
    if (obj.userData.clusterId === heroClusterId) continue
    obj.userData.introIsRingMember = false
    obj.userData.introIsCenterMember = false
    obj.userData.introIsDeferredCluster = true
  }
}
