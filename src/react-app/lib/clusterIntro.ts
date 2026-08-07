import * as THREE from 'three'
import {
  clamp01,
  easeInOutCubic,
  globeIntroZoomPhaseT,
  GLOBE_INTRO_CAMERA_START_FACTOR,
  introCenterPrefetchActive,
  introRevealActive,
} from '../utils/globeIntro'
import {
  computeGlobeOverviewCameraZ,
  GLOBE_CAMERA_FOV,
  GLOBE_RADIUS,
} from './globe'
import { miniGlobePositions } from './clusterLayout'

/** Share of post-reveal timeline spent filling the hero globe before zoom-out. */
export const CLUSTER_INTRO_FILL_PHASE_SHARE = 0.36

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

export function applyClusterIntroSphereLayout(
  objects: Array<{
    userData: Record<string, unknown>
    position: THREE.Vector3
  }>,
  separation: number,
): void {
  const radius = clusterIntroHeroSphereRadius(separation)
  const ranked = [...objects].sort(
    (a, b) =>
      ((a.userData.introLoadRank as number) ?? 0) -
      ((b.userData.introLoadRank as number) ?? 0),
  )
  const positions = miniGlobePositions(ranked.length, radius)

  ranked.forEach((obj, index) => {
    const introLocal = positions[index].clone()
    obj.userData.introSphereLocal = introLocal
    obj.position.copy(introLocal)
    obj.userData.introHemisphereFront = introLocal.z >= 0
    obj.userData.introIsDeferredCluster = false
  })
}

export function clusterIntroHeroItemBlend(progress: number): number {
  return clusterIntroZoomProgress(progress)
}

function clusterIntroPostRevealT(progress: number): number {
  if (!introRevealActive(progress)) return 0
  return globeIntroZoomPhaseT(progress)
}

/** 0→1 while the hero globe center-fills; camera stays put. */
export function clusterIntroCenterFillProgress(progress: number): number {
  if (!introCenterPrefetchActive(progress)) return 0
  const postRevealT = clusterIntroPostRevealT(progress)
  if (postRevealT <= 0) return 0
  if (postRevealT >= CLUSTER_INTRO_FILL_PHASE_SHARE) return 1
  return easeInOutCubic(
    clamp01(postRevealT / Math.max(0.001, CLUSTER_INTRO_FILL_PHASE_SHARE)),
  )
}

/** 0→1 during zoom-out after the hero globe has filled in. */
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

export function clusterIntroCameraZ(
  progress: number,
  heroStartZ: number,
  overviewZ: number,
): number {
  const t = clusterIntroZoomProgress(progress)
  return heroStartZ + (overviewZ - heroStartZ) * t
}

export function clusterIntroHeroGroupBlend(progress: number): number {
  return clusterIntroZoomProgress(progress)
}

export function clusterIntroHeroPosition(
  fieldCenter: THREE.Vector3,
  blend: number,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  return out.lerpVectors(new THREE.Vector3(0, 0, 0), fieldCenter, blend)
}
