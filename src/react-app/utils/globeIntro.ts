import type * as THREE from 'three'

import { viewAxisAngularDistance, viewSpaceAngularDistance } from '../lib/globe'

export const GLOBE_INTRO_CENTER_FRACTION = 0.55
export const GLOBE_INTRO_SCREEN_CENTER_CUTOUT_RAD = 0.34
export const GLOBE_INTRO_AUTO_DURATION_MS = 14400
export const GLOBE_INTRO_TILE_LOAD_INTERVAL_MS = 90
export const GLOBE_INTRO_CENTER_PREFETCH_INTERVAL_MS = 65
export const GLOBE_INTRO_RING_PAIR_INTERVAL_MS = 118
export const GLOBE_INTRO_TILE_FADE_MS = 1440
export const GLOBE_INTRO_CENTER_TILE_FADE_MS = 1308
export const GLOBE_INTRO_EXIT_BLEND_MS = 990

export const GLOBE_INTRO_RING_START = 0.04
export const GLOBE_INTRO_RING_END = 0.2

export const GLOBE_INTRO_LINE1_START = 0.08
export const GLOBE_INTRO_LINE1_END = 0.248
export const GLOBE_INTRO_LINE1_OUT_START = 0.272
export const GLOBE_INTRO_LINE1_OUT_END = 0.368

export const GLOBE_INTRO_LINE2_START = 0.392
export const GLOBE_INTRO_LINE2_END = 0.536
export const GLOBE_INTRO_LINE2_OUT_START = 0.56
export const GLOBE_INTRO_LINE2_OUT_END = 0.704

export const GLOBE_INTRO_LINE3_START = 0.724
export const GLOBE_INTRO_LINE3_END = 0.812
export const GLOBE_INTRO_LINE3_OUT_START = 0.832
export const GLOBE_INTRO_LINE3_OUT_END = 0.88

/** Begin zoom at this point through the final line blur-out (0–1). */
export const GLOBE_INTRO_REVEAL_AT_LINE2_OUT = 0.75

const GLOBE_INTRO_LAST_LINE_OUT_SPAN =
  GLOBE_INTRO_LINE3_OUT_END - GLOBE_INTRO_LINE3_OUT_START

/** Last ring tile should start loading this long before the final line fades out. */
export const GLOBE_INTRO_RING_LOAD_END =
  GLOBE_INTRO_LINE3_OUT_START -
  GLOBE_INTRO_TILE_FADE_MS / GLOBE_INTRO_AUTO_DURATION_MS

/** Center/full-set load begins as the final line nears the end of its blur-out. */
export const GLOBE_INTRO_POST_REVEAL_LOAD_START =
  GLOBE_INTRO_LINE3_OUT_START +
  GLOBE_INTRO_LAST_LINE_OUT_SPAN * GLOBE_INTRO_REVEAL_AT_LINE2_OUT

/** Zoom, cutout release, and center fill begin near the end of line 2 blur-out. */
export const GLOBE_INTRO_REVEAL_START = GLOBE_INTRO_POST_REVEAL_LOAD_START
export const GLOBE_INTRO_REVEAL_END = 1
export const GLOBE_INTRO_ZOOM_END = 0.96
/** Stretch zoom-out duration (1.25 = 25% slower). */
export const GLOBE_INTRO_ZOOM_DURATION_SCALE = 1.25
/** All images loaded before the camera reaches full zoom-out. */
export const GLOBE_INTRO_LOAD_COMPLETE = 0.92

export const GLOBE_INTRO_CAMERA_START_FACTOR = 0.48
export const GLOBE_INTRO_RING_DRIFT_Z = -0.00038
/** Share of the load timeline completed by ring before center fill (at reveal). */
export const GLOBE_INTRO_RING_LOAD_SHARE = 0.4
/** Cutout closes ahead of camera zoom so the screen center is not masked late. */
export const GLOBE_INTRO_CUTOUT_CLOSE_BY_ZOOM = 0.82
/** Back hemisphere center tiles trail front slightly on the zoom reveal curve. */
export const GLOBE_INTRO_BACK_REVEAL_LAG = 0.05

export function introInScreenCenterCutout(
  worldPosition: THREE.Vector3,
  camera: THREE.Camera,
  cutoutRad = GLOBE_INTRO_SCREEN_CENTER_CUTOUT_RAD,
): boolean {
  if (cutoutRad <= 0.001) return false
  return viewSpaceAngularDistance(worldPosition, camera) < cutoutRad
}

export function introScreenCenterCutoutRad(progress: number): number {
  if (
    progress >= GLOBE_INTRO_RING_START &&
    progress < GLOBE_INTRO_REVEAL_START
  ) {
    return GLOBE_INTRO_SCREEN_CENTER_CUTOUT_RAD
  }

  if (introRevealActive(progress)) {
    const zoomT = globeIntroZoomPhaseT(progress)
    const cutoutP = easeInOutCubic(
      clamp01(zoomT / GLOBE_INTRO_CUTOUT_CLOSE_BY_ZOOM),
    )
    return GLOBE_INTRO_SCREEN_CENTER_CUTOUT_RAD * (1 - cutoutP)
  }

  return 0
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function globeIntroPhaseProgress(
  progress: number,
  start: number,
  end: number,
): number {
  if (end <= start) return progress >= end ? 1 : 0
  return clamp01((progress - start) / (end - start))
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function easeInCubic(t: number): number {
  return t * t * t
}

export function smoothstep(t: number): number {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}

export function globeIntroLine1InProgress(progress: number): number {
  return globeIntroPhaseProgress(
    progress,
    GLOBE_INTRO_LINE1_START,
    GLOBE_INTRO_LINE1_END,
  )
}

export function globeIntroLine1OutProgress(progress: number): number {
  return globeIntroPhaseProgress(
    progress,
    GLOBE_INTRO_LINE1_OUT_START,
    GLOBE_INTRO_LINE1_OUT_END,
  )
}

export function globeIntroLine2InProgress(progress: number): number {
  return globeIntroPhaseProgress(
    progress,
    GLOBE_INTRO_LINE2_START,
    GLOBE_INTRO_LINE2_END,
  )
}

export function globeIntroLine2OutProgress(progress: number): number {
  return globeIntroPhaseProgress(
    progress,
    GLOBE_INTRO_LINE2_OUT_START,
    GLOBE_INTRO_LINE2_OUT_END,
  )
}

export function globeIntroLine3InProgress(progress: number): number {
  return globeIntroPhaseProgress(
    progress,
    GLOBE_INTRO_LINE3_START,
    GLOBE_INTRO_LINE3_END,
  )
}

export function globeIntroLine3OutProgress(progress: number): number {
  return globeIntroPhaseProgress(
    progress,
    GLOBE_INTRO_LINE3_OUT_START,
    GLOBE_INTRO_LINE3_OUT_END,
  )
}

export function globeIntroLine1Strength(progress: number): number {
  const line1In = globeIntroLine1InProgress(progress)
  const line1Out = globeIntroLine1OutProgress(progress)
  return easeOutCubic(line1In) * (1 - easeOutCubic(line1Out))
}

export function globeIntroLine2Strength(progress: number): number {
  const line2In = globeIntroLine2InProgress(progress)
  const line2Out = globeIntroLine2OutProgress(progress)
  return easeOutCubic(line2In) * (1 - easeOutCubic(line2Out))
}

export function globeIntroLine3Strength(progress: number): number {
  const line3In = globeIntroLine3InProgress(progress)
  const line3Out = globeIntroLine3OutProgress(progress)
  return easeOutCubic(line3In) * (1 - easeOutCubic(line3Out))
}

export function introTypeReadable(progress: number): boolean {
  return (
    globeIntroLine3Strength(progress) > 0.06 ||
    globeIntroLine2Strength(progress) > 0.06
  )
}

/** Zoom, center fill, and back-hemisphere load begin near the end of line 2 blur-out. */
export function introRevealActive(progress: number): boolean {
  return progress >= GLOBE_INTRO_REVEAL_START
}

/** Center prefetch begins as line 2 nears the end of its blur-out. */
export function introCenterPrefetchActive(progress: number): boolean {
  return progress >= GLOBE_INTRO_POST_REVEAL_LOAD_START
}

/** Assign shuffled load order so the ring fills in at scattered positions. */
export function assignRingLoadSeqShuffled(
  items: Array<{ setSeq: (seq: number) => void }>,
): void {
  const order = items.map((_, index) => index)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  order.forEach((itemIndex, seq) => {
    items[itemIndex].setSeq(seq)
  })
}

/** How many ring tiles should have started loading at this intro progress. */
export function introRingAllowedLoadCount(
  progress: number,
  ringTotal: number,
): number {
  if (progress < GLOBE_INTRO_RING_START || ringTotal <= 0) return 0
  if (progress >= GLOBE_INTRO_RING_LOAD_END) return ringTotal

  const window =
    GLOBE_INTRO_RING_LOAD_END - GLOBE_INTRO_RING_START
  const elapsed = progress - GLOBE_INTRO_RING_START
  const t = clamp01(elapsed / Math.max(0.0001, window))
  return Math.min(ringTotal, Math.max(1, Math.ceil(t * ringTotal)))
}

/** 0→1 ring load progress (shared by both hemispheres). */
export function introRingLoadProgress(progress: number): number {
  if (progress < GLOBE_INTRO_RING_START) return 0
  if (progress >= GLOBE_INTRO_RING_LOAD_END) return 1
  const window = GLOBE_INTRO_RING_LOAD_END - GLOBE_INTRO_RING_START
  const elapsed = progress - GLOBE_INTRO_RING_START
  return clamp01(elapsed / Math.max(0.0001, window))
}

export function globeIntroPostRevealLoadEndProgress(): number {
  return GLOBE_INTRO_LOAD_COMPLETE
}

/** 0→1 for hemisphere/center load — completes before final zoom-out. */
export function introHemisphereLoadProgress(progress: number): number {
  if (progress < GLOBE_INTRO_POST_REVEAL_LOAD_START) return 0
  if (progress >= GLOBE_INTRO_LOAD_COMPLETE) return 1
  return easeInOutCubic(
    globeIntroPhaseProgress(
      progress,
      GLOBE_INTRO_POST_REVEAL_LOAD_START,
      GLOBE_INTRO_LOAD_COMPLETE,
    ),
  )
}

/** 0→1 after line 2 has fully faded; completes at full zoom-out. */
export function globeIntroPostRevealLoadProgress(progress: number): number {
  return introHemisphereLoadProgress(progress)
}

/** 0→1 load budget — ring pre-reveal, then full set after line 2 fade-out. */
export function globeIntroImageLoadTimeline(progress: number): number {
  if (progress < GLOBE_INTRO_POST_REVEAL_LOAD_START) {
    const ringP = globeIntroPhaseProgress(
      progress,
      GLOBE_INTRO_RING_START,
      GLOBE_INTRO_LINE3_OUT_END,
    )
    return easeInOutCubic(ringP) * GLOBE_INTRO_RING_LOAD_SHARE
  }
  const postP = globeIntroPostRevealLoadProgress(progress)
  return GLOBE_INTRO_RING_LOAD_SHARE + (1 - GLOBE_INTRO_RING_LOAD_SHARE) * postP
}

export function introLoadTargetCount(progress: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(total, Math.ceil(total * globeIntroImageLoadTimeline(progress)))
}

export function introLoadBehindSchedule(
  progress: number,
  loaded: number,
  total: number,
): boolean {
  return loaded < introLoadTargetCount(progress, total) - 1
}

/** Center prefetch cap per hemisphere — synced to zoom-out, 100% at full zoom. */
export function introCenterLoadCapPerHemisphere(
  progress: number,
  hemisphereTotal: number,
): number {
  if (hemisphereTotal <= 0) return 0
  const loadP = introHemisphereLoadProgress(progress)
  if (loadP <= 0) return 0
  if (loadP >= 1) return hemisphereTotal
  return Math.ceil(hemisphereTotal * loadP)
}

/** Same load percentage for both hemispheres — avoids count skew from ceil. */
export function introSharedHemisphereLoadCaps(
  frontTotal: number,
  backTotal: number,
  loadP: number,
): { frontCap: number; backCap: number } {
  if (loadP <= 0) {
    return { frontCap: 0, backCap: 0 }
  }
  if (loadP >= 1) {
    return { frontCap: frontTotal, backCap: backTotal }
  }
  return {
    frontCap: Math.min(
      frontTotal,
      Math.max(loadP > 0 ? 1 : 0, Math.floor(frontTotal * loadP + 1e-6)),
    ),
    backCap: Math.min(
      backTotal,
      Math.max(loadP > 0 ? 1 : 0, Math.floor(backTotal * loadP + 1e-6)),
    ),
  }
}

export function introCenterHemisphereLoadCaps(
  progress: number,
  frontTotal: number,
  backTotal: number,
): { frontCap: number; backCap: number } {
  return introSharedHemisphereLoadCaps(
    frontTotal,
    backTotal,
    introHemisphereLoadProgress(progress),
  )
}

export function introRingHemisphereLoadCaps(
  progress: number,
  frontTotal: number,
  backTotal: number,
): { frontCap: number; backCap: number } {
  return introSharedHemisphereLoadCaps(
    frontTotal,
    backTotal,
    introRingLoadProgress(progress),
  )
}

/** Back tiles stay hidden until front has reached the same loaded %. */
export function introBackHemisphereMayShow(
  isBackHemisphere: boolean,
  frontLoaded: number,
  frontTotal: number,
  backLoaded: number,
  backTotal: number,
): boolean {
  if (!isBackHemisphere) return true
  if (frontTotal <= 0 || backTotal <= 0) return true
  const frontP = frontLoaded / frontTotal
  const backP = backLoaded / backTotal
  return backP <= frontP + 0.02
}

/** Fill/reveal progress for center tiles — follows the timeline zoom curve. */
export function globeIntroFillProgress(progress: number): number {
  return globeIntroCameraProgress(progress)
}

export function introGlobeLoadFraction(
  loadedCount: number,
  totalCount: number,
): number {
  if (totalCount <= 0) return 1
  return clamp01(loadedCount / totalCount)
}

export function globeIntroRevealProgress(progress: number): number {
  if (!introRevealActive(progress)) return 0
  return easeInOutCubic(globeIntroZoomPhaseT(progress))
}

/** 0→1 over the slowed zoom-out window (after line 2 fade). */
export function globeIntroZoomPhaseT(progress: number): number {
  if (!introRevealActive(progress)) return 0
  const baseSpan = GLOBE_INTRO_ZOOM_END - GLOBE_INTRO_REVEAL_START
  const slowedSpan = baseSpan * GLOBE_INTRO_ZOOM_DURATION_SCALE
  return clamp01((progress - GLOBE_INTRO_REVEAL_START) / slowedSpan)
}

export function globeIntroCameraProgress(progress: number): number {
  if (!introRevealActive(progress)) return 0
  return easeInOutCubic(globeIntroZoomPhaseT(progress))
}

export function introZoomTimelineComplete(progress: number): boolean {
  if (progress >= 1) return true
  return globeIntroCameraProgress(progress) >= 0.995
}

export function globeIntroMotionEase(progress: number): number {
  if (!introRevealActive(progress)) return 0
  return easeInOutCubic(globeIntroZoomPhaseT(progress))
}

/** Blend intro rotation (Z drift, XY damping) into normal globe spin during reveal. */
export function globeIntroRotationHandoff(progress: number): number {
  if (!introRevealActive(progress)) return 0
  return easeInOutCubic(globeIntroZoomPhaseT(progress))
}

/** Depth fade ramps subtly during ring, then fully alongside zoom-out. */
export function globeIntroDepthFadeProgress(progress: number): number {
  if (progress < GLOBE_INTRO_RING_START) return 0
  if (!introRevealActive(progress)) {
    const ringP = globeIntroPhaseProgress(
      progress,
      GLOBE_INTRO_RING_START,
      GLOBE_INTRO_LINE3_OUT_END,
    )
    return easeInOutCubic(ringP) * 0.1
  }
  const revealP = globeIntroZoomPhaseT(progress)
  return 0.1 + 0.9 * easeInOutCubic(revealP)
}

export function introDepthOpacityAtDistance(
  depthFadeStrength: number,
  distT: number,
): number {
  if (depthFadeStrength <= 0.001) return 1
  const fullStrength = Math.max(
    1 - depthFadeStrength * 0.85,
    1 - distT * 0.72 * depthFadeStrength,
  )
  return 1 - depthFadeStrength * (1 - fullStrength)
}

export function introCenterCount(loadTotal: number): number {
  if (loadTotal <= 1) return 0
  return Math.min(
    loadTotal - 1,
    Math.floor(loadTotal * GLOBE_INTRO_CENTER_FRACTION),
  )
}

export function introIsRingMember(
  loadRank: number,
  loadTotal: number,
): boolean {
  return loadRank >= introCenterCount(loadTotal)
}

export function introRingCount(loadTotal: number): number {
  return Math.max(1, loadTotal - introCenterCount(loadTotal))
}

export function introRingRevealRank(
  loadRank: number,
  loadTotal: number,
): number {
  return loadRank - introCenterCount(loadTotal)
}

export function introCenterFillRank(
  loadRank: number,
  loadTotal: number,
): number {
  const centerCount = introCenterCount(loadTotal)
  return centerCount - 1 - loadRank
}

export function introCenterFillCount(loadTotal: number): number {
  return Math.max(1, introCenterCount(loadTotal))
}

/** Assign load/reveal ranks by advancing front and back hemispheres in parallel. */
export function assignParallelHemisphereRanks<T extends { front: boolean }>(
  items: T[],
  sortKey: (item: T) => number,
  assignRank: (item: T, seq: number) => void,
): void {
  const front = items
    .filter((item) => item.front)
    .sort((a, b) => sortKey(a) - sortKey(b))
  const back = items
    .filter((item) => !item.front)
    .sort((a, b) => sortKey(a) - sortKey(b))

  let seq = 0
  const maxLen = Math.max(front.length, back.length)
  for (let i = 0; i < maxLen; i++) {
    if (front[i]) assignRank(front[i], seq++)
    if (back[i]) assignRank(back[i], seq++)
  }
}

/** Stagger center tiles centre → edge, synced to zoom-out progress. */
export function introCenterItemReveal(
  fillProgress: number,
  fillRank: number,
  fillCount: number,
  isBackHemisphere = false,
): number {
  if (fillCount <= 0 || fillRank < 0) return 0
  const revealProgress = isBackHemisphere
    ? Math.max(0, fillProgress - GLOBE_INTRO_BACK_REVEAL_LAG)
    : fillProgress
  if (revealProgress >= 0.9) return 1
  const inwardDist =
    fillCount <= 1 ? 1 : fillRank / Math.max(1, fillCount - 1)
  const start = (1 - inwardDist) * 0.14
  const window = 0.86
  return smoothstep(
    clamp01((revealProgress - start) / Math.max(0.001, window)),
  )
}

/** Softer fade for center tiles as they begin to fill in. */
export function introCenterTileOpacity(
  loadStartedAt: number | undefined,
  nowMs: number,
  imageLoaded: boolean,
): number {
  if (!loadStartedAt) return 0
  const t = clamp01((nowMs - loadStartedAt) / GLOBE_INTRO_CENTER_TILE_FADE_MS)
  const fade = smoothstep(t)
  if (!imageLoaded) return fade * fade * 0.2
  return fade
}

/** Assign load order outermost-first (visible ring tiles outside text cutout). */
export function assignRingLoadSeqOuterFirst(
  items: Array<{ pos: THREE.Vector3; setSeq: (seq: number) => void }>,
): void {
  const sorted = [...items].sort(
    (a, b) => viewAxisAngularDistance(b.pos) - viewAxisAngularDistance(a.pos),
  )
  sorted.forEach((item, seq) => item.setSeq(seq))
}

/** Per-tile fade after its load begins (blur → sharp). */
export function introTileOpacity(
  loadStartedAt: number | undefined,
  nowMs: number,
  imageLoaded: boolean,
): number {
  if (!loadStartedAt) return 0
  const t = clamp01((nowMs - loadStartedAt) / GLOBE_INTRO_TILE_FADE_MS)
  const fade = smoothstep(t)
  if (!imageLoaded) return fade * fade * 0.16
  return fade
}

// Legacy aliases used by overlay
export function globeIntroTextOutProgress(progress: number): number {
  return globeIntroLine3OutProgress(progress)
}

export function globeIntroRingReveal(progress: number): number {
  return easeOutCubic(
    globeIntroPhaseProgress(
      progress,
      GLOBE_INTRO_RING_START,
      GLOBE_INTRO_RING_END,
    ),
  )
}

export function globeIntroLine2OffScreen(progress: number): boolean {
  return globeIntroLine3Strength(progress) <= 0.01
}

/** Zoom-out finished and every intro image has loaded. */
export function introGlobeSequenceComplete(
  progress: number,
  loadedCount: number,
  totalCount: number,
): boolean {
  if (!introZoomTimelineComplete(progress)) return false
  if (totalCount <= 0) return true
  return loadedCount >= totalCount
}
