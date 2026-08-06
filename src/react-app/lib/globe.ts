import * as THREE from 'three'
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
import type {
  GalleryItem,
  GlobeAnimation,
  GlobeArrangement,
  GlobeAspectRatio,
  GlobeDisplaySettings,
  Complexity,
} from '../types/gallery'
import { computeClusterLayout } from './clusterLayout'
import { itemFilterKey, resolveGlobeImageSrc } from './taxonomy'

export const DEFAULT_GLOBE_ITEM_COUNT = 1000
export const MIN_GLOBE_ITEM_COUNT = 10
export const MAX_GLOBE_ITEM_COUNT = 1000
export const GLOBE_RADIUS = 420
export const GLOBE_CAMERA_FOV = 42
export const GLOBE_OVERVIEW_SCREEN_FRACTION = 0.6
export const GLOBE_COMPREHENSIVE_SCREEN_FRACTION = 1
export const GLOBE_LOAD_SPAN_MS = 2400
export const GLOBE_BLUR_IN_MIN_MS = 900
export const GLOBE_INTRO_BLUR_IN_MIN_MS = 600
export const DEFAULT_CAMERA_Z = 1100
export const MIN_CAMERA_Z = 520
export const MAX_CAMERA_Z = 2400
export const BASE_IMAGE_WIDTH = 56
export const BASE_IMAGE_HEIGHT = 74

export type ZoomMotion = 'sine' | 'breathe' | 'surge' | 'dolly' | 'swell'

export type AnimationPreset = {
  label: string
  autoRotateY: number
  autoRotateX: number
  friction: number
  dragSensitivity: number
  wobble?: boolean
  wobbleAmplitude?: number
  wobbleSpeed?: number
  zoomMotion?: ZoomMotion
  zoomAmplitude?: number
  zoomSpeed?: number
}

export const GLOBE_ANIMATION_IDS: GlobeAnimation[] = [
  'drift',
  'calm',
  'orbit',
  'sway',
  'static',
  'pulse',
  'bloom',
  'surge',
  'tide',
  'dolly',
]

export function isGlobeAnimation(value: unknown): value is GlobeAnimation {
  return (
    typeof value === 'string' &&
    (GLOBE_ANIMATION_IDS as string[]).includes(value)
  )
}

export const ARRANGEMENT_OPTIONS: { id: GlobeArrangement; label: string }[] = [
  { id: 'even', label: 'Even' },
  { id: 'rings', label: 'Rings' },
  { id: 'helix', label: 'Helix' },
  { id: 'cloud', label: 'Cloud' },
  { id: 'clusters', label: 'Constellation' },
]

export const ANIMATION_OPTIONS: { id: GlobeAnimation; label: string }[] = [
  { id: 'drift', label: 'Drift' },
  { id: 'calm', label: 'Calm' },
  { id: 'orbit', label: 'Orbit' },
  { id: 'sway', label: 'Sway' },
  { id: 'static', label: 'Static' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'bloom', label: 'Bloom' },
  { id: 'surge', label: 'Surge' },
  { id: 'tide', label: 'Tide' },
  { id: 'dolly', label: 'Dolly' },
]

export const ANIMATION_PRESETS: Record<GlobeAnimation, AnimationPreset> = {
  drift: {
    label: 'Drift',
    autoRotateY: 0.0012,
    autoRotateX: 0,
    friction: 0.94,
    dragSensitivity: 0.004,
  },
  calm: {
    label: 'Calm',
    autoRotateY: 0.00035,
    autoRotateX: 0,
    friction: 0.97,
    dragSensitivity: 0.003,
  },
  orbit: {
    label: 'Orbit',
    autoRotateY: 0.002,
    autoRotateX: 0.0006,
    friction: 0.92,
    dragSensitivity: 0.005,
  },
  sway: {
    label: 'Sway',
    autoRotateY: 0.001,
    autoRotateX: 0,
    friction: 0.93,
    dragSensitivity: 0.004,
    wobble: true,
    wobbleAmplitude: 0.18,
    wobbleSpeed: 0.0008,
  },
  static: {
    label: 'Static',
    autoRotateY: 0,
    autoRotateX: 0,
    friction: 0.88,
    dragSensitivity: 0.004,
  },
  pulse: {
    label: 'Pulse',
    autoRotateY: 0.00085,
    autoRotateX: 0,
    friction: 0.94,
    dragSensitivity: 0.004,
    zoomMotion: 'sine',
    zoomAmplitude: 0.12,
    zoomSpeed: 0.0026,
  },
  bloom: {
    label: 'Bloom',
    autoRotateY: 0.00028,
    autoRotateX: 0.00012,
    friction: 0.97,
    dragSensitivity: 0.003,
    zoomMotion: 'breathe',
    zoomAmplitude: 0.22,
    zoomSpeed: 0.00055,
  },
  surge: {
    label: 'Surge',
    autoRotateY: 0.0024,
    autoRotateX: 0.00045,
    friction: 0.9,
    dragSensitivity: 0.005,
    zoomMotion: 'surge',
    zoomAmplitude: 0.16,
    zoomSpeed: 0.0019,
  },
  tide: {
    label: 'Tide',
    autoRotateY: 0.001,
    autoRotateX: 0,
    friction: 0.93,
    dragSensitivity: 0.004,
    wobble: true,
    wobbleAmplitude: 0.22,
    wobbleSpeed: 0.0007,
    zoomMotion: 'swell',
    zoomAmplitude: 0.18,
    zoomSpeed: 0.00075,
  },
  dolly: {
    label: 'Dolly',
    autoRotateY: 0.00135,
    autoRotateX: 0.00032,
    friction: 0.92,
    dragSensitivity: 0.004,
    zoomMotion: 'dolly',
    zoomAmplitude: 0.26,
    zoomSpeed: 0.00038,
  },
}

export function computeAnimationZoomOffset(
  preset: AnimationPreset,
  time: number,
  baseZ: number,
): number {
  if (!preset.zoomMotion || !preset.zoomAmplitude) return 0

  const amp = preset.zoomAmplitude * baseZ
  const speed = preset.zoomSpeed ?? 0.001
  const t = time * speed

  switch (preset.zoomMotion) {
    case 'sine':
      return Math.sin(t) * amp
    case 'breathe': {
      const inhale = Math.sin(t * 0.55) * 0.65 + Math.sin(t * 1.1) * 0.35
      return inhale * amp
    }
    case 'surge': {
      const wave = Math.sin(t * 1.85)
      const envelope = 0.55 + 0.45 * Math.sin(t * 0.24)
      return wave * amp * envelope
    }
    case 'dolly': {
      const cycle = (t % (Math.PI * 2)) / (Math.PI * 2)
      const tri = cycle < 0.5 ? cycle * 2 : 2 - cycle * 2
      const eased = tri * tri * (3 - 2 * tri)
      return (eased - 0.5) * 2 * amp
    }
    case 'swell':
      return Math.sin(t * 0.45) * amp + Math.sin(t * 0.12) * amp * 0.35
    default:
      return 0
  }
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export function sampleEvenly(items: GalleryItem[], max: number): GalleryItem[] {
  if (items.length <= max) return items
  const step = items.length / max
  const out: GalleryItem[] = []
  for (let i = 0; i < max; i++) out.push(items[Math.floor(i * step)])
  return out
}

/** Angular distance from +Z (view axis); smaller = closer to screen center. */
export function viewAxisAngularDistance(position: THREE.Vector3): number {
  const len = position.length()
  if (len < 1e-6) return 0
  return Math.atan2(Math.hypot(position.x, position.y), position.z)
}

const _viewSpacePos = new THREE.Vector3()

/** View-axis angular distance in camera space (updates as the globe rotates). */
export function viewSpaceAngularDistance(
  worldPosition: THREE.Vector3,
  camera: THREE.Camera,
): number {
  _viewSpacePos.copy(worldPosition).applyMatrix4(camera.matrixWorldInverse)
  return Math.atan2(
    Math.hypot(_viewSpacePos.x, _viewSpacePos.y),
    Math.max(1e-6, -_viewSpacePos.z),
  )
}

export function globeStaggeredLoadDelayMs(rank: number, total: number): number {
  if (total <= 1 || rank <= 0) return 0
  const t = rank / (total - 1)
  const eased = 1 - (1 - t) * (1 - t)
  return Math.round(eased * GLOBE_LOAD_SPAN_MS)
}

const _globeFaceDir = new THREE.Vector3()
const _globeFaceGlobe = new THREE.Group()
_globeFaceGlobe.rotation.order = 'XYZ'
export const GLOBE_ROTATION_ORDER: THREE.EulerOrder = 'XYZ'

export function sphericalMeanDirection(positions: THREE.Vector3[]): THREE.Vector3 {
  if (positions.length === 0) return new THREE.Vector3(0, 0, 1)

  const mean = new THREE.Vector3()
  for (let i = 0; i < positions.length; i++) {
    mean.add(_globeFaceDir.copy(positions[i]).normalize())
  }
  return mean.normalize()
}

export function medianSphereCentroid(positions: THREE.Vector3[]): THREE.Vector3 {
  if (positions.length === 0) return new THREE.Vector3(0, 0, 1)

  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)]
  }

  return new THREE.Vector3(
    median(positions.map((position) => position.x)),
    median(positions.map((position) => position.y)),
    median(positions.map((position) => position.z)),
  ).normalize()
}

function collectGlobeObjectPosition(
  object: CSS3DObject,
  clusterFieldCenters?: Map<string, THREE.Vector3>,
): THREE.Vector3 | null {
  const fieldLocal = object.userData.fieldLocal as THREE.Vector3 | undefined
  const sphereLocal = object.userData.sphereLocal as THREE.Vector3 | undefined
  const clusterId = object.userData.clusterId as string | undefined

  if (fieldLocal && clusterId && clusterFieldCenters?.has(clusterId)) {
    return clusterFieldCenters.get(clusterId)!.clone().add(fieldLocal)
  }
  if (fieldLocal) return fieldLocal.clone()
  if (sphereLocal) return sphereLocal.clone()
  return null
}

function scoreGlobeRotationForDirections(
  selected: THREE.Vector3[],
  excluded: THREE.Vector3[],
  rotationX: number,
  rotationY: number,
  preferBackHemisphere = false,
): number {
  _globeFaceGlobe.rotation.x = rotationX
  _globeFaceGlobe.rotation.y = rotationY
  _globeFaceGlobe.updateMatrixWorld()

  let selectedFront = 0
  let meanX = 0
  let meanY = 0
  let meanZ = 0

  for (let i = 0; i < selected.length; i++) {
    _globeFaceDir.copy(selected[i]).applyMatrix4(_globeFaceGlobe.matrixWorld)
    selectedFront += preferBackHemisphere
      ? Math.max(0, -_globeFaceDir.z)
      : Math.max(0, _globeFaceDir.z)
    meanX += _globeFaceDir.x
    meanY += _globeFaceDir.y
    meanZ += _globeFaceDir.z
  }

  let excludedFront = 0
  for (let i = 0; i < excluded.length; i++) {
    _globeFaceDir.copy(excluded[i]).applyMatrix4(_globeFaceGlobe.matrixWorld)
    excludedFront += preferBackHemisphere
      ? Math.max(0, -_globeFaceDir.z)
      : Math.max(0, _globeFaceDir.z)
  }

  if (selected.length === 0) return -Infinity

  const inv = 1 / selected.length
  meanX *= inv
  meanY *= inv
  meanZ *= inv

  const depthBias = preferBackHemisphere ? -meanZ : meanZ

  return (
    selectedFront * 2 +
    depthBias * selected.length * 0.45 -
    Math.hypot(meanX, meanY) * 0.25 -
    excludedFront * 1.35
  )
}

function searchGlobeRotationForDirections(
  selected: THREE.Vector3[],
  excluded: THREE.Vector3[] = [],
  preferBackHemisphere = false,
): { x: number; y: number } {
  const unitSelected = selected.map((position) => position.clone().normalize())
  const unitExcluded = excluded.map((position) => position.clone().normalize())

  let bestX = 0
  let bestY = 0
  let bestScore = -Infinity

  const search = (
    rxMin: number,
    rxMax: number,
    rxStep: number,
    ryMin: number,
    ryMax: number,
    ryStep: number,
  ) => {
    for (let ry = ryMin; ry <= ryMax; ry += ryStep) {
      for (let rx = rxMin; rx <= rxMax; rx += rxStep) {
        const score = scoreGlobeRotationForDirections(
          unitSelected,
          unitExcluded,
          rx,
          ry,
          preferBackHemisphere,
        )
        if (score > bestScore) {
          bestScore = score
          bestX = rx
          bestY = ry
        }
      }
    }
  }

  search(-0.9, 0.9, 0.1, -Math.PI, Math.PI, Math.PI / 16)
  search(
    Math.max(-0.9, bestX - 0.12),
    Math.min(0.9, bestX + 0.12),
    0.02,
    bestY - 0.28,
    bestY + 0.28,
    Math.PI / 64,
  )

  return { x: bestX, y: bestY }
}

export function globeRotationToFacePoint(point: THREE.Vector3): {
  x: number
  y: number
} {
  return searchGlobeRotationForDirections([point.clone().normalize()])
}

export function globeRotationToFaceDirections(
  selected: THREE.Vector3[],
  excluded: THREE.Vector3[] = [],
  preferBackHemisphere = false,
): { x: number; y: number } | null {
  if (selected.length === 0) return null
  return searchGlobeRotationForDirections(selected, excluded, preferBackHemisphere)
}

export function computeFilterFocusRotation(
  objects: CSS3DObject[],
  options: {
    complexity: Complexity | null
    highlightedFilter: string | null
    preferBackHemisphere?: boolean
    clusterFieldCenters?: Map<string, THREE.Vector3>
  },
): { x: number; y: number } | null {
  const {
    complexity,
    highlightedFilter,
    preferBackHemisphere = false,
    clusterFieldCenters,
  } = options
  const filterActive = highlightedFilter !== null
  if (!complexity && !filterActive) return null

  const selected: THREE.Vector3[] = []
  const excluded: THREE.Vector3[] = []

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i]
    const item = obj.userData.item as GalleryItem | undefined
    if (!item) continue

    const position = collectGlobeObjectPosition(obj, clusterFieldCenters)
    if (!position) continue

    const matchesComplexity = !complexity || item.complexity === complexity
    const matchesFilter =
      !filterActive || itemFilterKey(item) === highlightedFilter

    if (matchesComplexity && matchesFilter) {
      selected.push(position)
    } else {
      excluded.push(position)
    }
  }

  return globeRotationToFaceDirections(selected, excluded, preferBackHemisphere)
}

export function computeComplexityFocusRotation(
  objects: CSS3DObject[],
  complexity: Complexity,
  clusterFieldCenters?: Map<string, THREE.Vector3>,
  preferBackHemisphere = false,
): { x: number; y: number } | null {
  return computeFilterFocusRotation(objects, {
    complexity,
    highlightedFilter: null,
    preferBackHemisphere,
    clusterFieldCenters,
  })
}

/** Camera Z so a sphere of `boundingRadius` fills `screenFraction` of viewport height. */
export function computeGlobeOverviewCameraZ(
  boundingRadius: number,
  fovDeg = GLOBE_CAMERA_FOV,
  screenFraction = GLOBE_OVERVIEW_SCREEN_FRACTION,
): number {
  const halfFovRad = (fovDeg * Math.PI) / 180 / 2
  const targetHalfAngle = halfFovRad * screenFraction
  const tan = Math.tan(targetHalfAngle)
  if (tan < 1e-6) return DEFAULT_CAMERA_Z
  return boundingRadius / tan
}

export function computeZoomFocusRotation(
  objects: CSS3DObject[],
  clusterFieldCenters?: Map<string, THREE.Vector3>,
): { x: number; y: number } | null {
  const selected: THREE.Vector3[] = []

  for (let i = 0; i < objects.length; i++) {
    const position = collectGlobeObjectPosition(objects[i], clusterFieldCenters)
    if (position) selected.push(position)
  }

  if (selected.length === 0) return null
  return globeRotationToFaceDirections(selected, [], true)
}

/** Closest overview zoom so the globe fills the viewport (comprehensive mode). */
export function computeComprehensiveCameraZ(
  boundingRadius: number,
  fovDeg = GLOBE_CAMERA_FOV,
): number {
  const fillZ = computeGlobeOverviewCameraZ(
    boundingRadius,
    fovDeg,
    GLOBE_COMPREHENSIVE_SCREEN_FRACTION,
  )
  return Math.min(fillZ, MIN_CAMERA_Z)
}

const _globeFacingOrigin = new THREE.Vector3()
const _globeFacingOutward = new THREE.Vector3()
const _globeFacingToCamera = new THREE.Vector3()

export function isGlobePointFacingCamera(
  object: CSS3DObject,
  camera: THREE.Camera,
  globeCenter = _globeFacingOrigin,
): boolean {
  _worldPos.setFromMatrixPosition(object.matrixWorld)
  _globeFacingOutward.copy(_worldPos).sub(globeCenter)
  if (_globeFacingOutward.lengthSq() < 1e-6) return true
  _globeFacingOutward.normalize()
  _globeFacingToCamera.copy(camera.position).sub(_worldPos)
  if (_globeFacingToCamera.lengthSq() < 1e-6) return true
  _globeFacingToCamera.normalize()
  return _globeFacingOutward.dot(_globeFacingToCamera) > 0.04
}

export function layoutBoundingRadius(
  positions: THREE.Vector3[],
  fallbackRadius: number,
): number {
  let maxR = fallbackRadius
  for (let i = 0; i < positions.length; i++) {
    maxR = Math.max(maxR, positions[i].length())
  }
  return maxR
}

export function fibonacciSpherePositions(
  count: number,
  radius: number,
): THREE.Vector3[] {
  if (count === 0) return []
  if (count === 1) return [new THREE.Vector3(0, 0, radius)]

  const phi = Math.PI * (3 - Math.sqrt(5))
  const points: THREE.Vector3[] = []

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const ring = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = phi * i
    points.push(
      new THREE.Vector3(
        Math.cos(theta) * ring * radius,
        y * radius,
        Math.sin(theta) * ring * radius,
      ),
    )
  }

  return points
}

export function ringSpherePositions(
  count: number,
  radius: number,
): THREE.Vector3[] {
  if (count === 0) return []
  const ringCount = Math.max(4, Math.round(Math.sqrt(count / 3)))
  const points: THREE.Vector3[] = []

  for (let i = 0; i < count; i++) {
    const ring = i % ringCount
    const y = 1 - (ring / (ringCount - 1)) * 2
    const ringR = Math.sqrt(Math.max(0, 1 - y * y))
    const perRing = Math.ceil(count / ringCount)
    const idx = Math.floor(i / ringCount)
    const theta = (idx / perRing) * Math.PI * 2 + ring * 0.4
    points.push(
      new THREE.Vector3(
        Math.cos(theta) * ringR * radius,
        y * radius,
        Math.sin(theta) * ringR * radius,
      ),
    )
  }

  return points
}

export function helixSpherePositions(
  count: number,
  radius: number,
): THREE.Vector3[] {
  if (count === 0) return []
  const turns = 3.5
  const points: THREE.Vector3[] = []

  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1)
    const y = 1 - t * 2
    const ringR = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = t * Math.PI * 2 * turns
    points.push(
      new THREE.Vector3(
        Math.cos(theta) * ringR * radius,
        y * radius,
        Math.sin(theta) * ringR * radius,
      ),
    )
  }

  return points
}

export function cloudSpherePositions(
  count: number,
  radius: number,
): THREE.Vector3[] {
  const base = fibonacciSpherePositions(count, radius)
  return base.map((pos, i) => {
    const normal = pos.clone().normalize()
    const jitter = (seededRandom(i + 1) - 0.5) * 0.22
    const radial = radius * (1 + jitter)
    const tangent = new THREE.Vector3(
      seededRandom(i + 11) - 0.5,
      seededRandom(i + 23) - 0.5,
      seededRandom(i + 37) - 0.5,
    )
      .normalize()
      .multiplyScalar(radius * 0.06 * seededRandom(i + 51))
    return normal.multiplyScalar(radial).add(tangent)
  })
}

export function getGlobePositions(
  arrangement: GlobeArrangement,
  count: number,
  radius: number,
  items: GalleryItem[] = [],
): THREE.Vector3[] {
  switch (arrangement) {
    case 'clusters':
      return computeClusterLayout(items).positions
    case 'rings':
      return ringSpherePositions(count, radius)
    case 'helix':
      return helixSpherePositions(count, radius)
    case 'cloud':
      return cloudSpherePositions(count, radius)
    case 'even':
    default:
      return fibonacciSpherePositions(count, radius)
  }
}

export {
  computeClusterLayout,
  type ClusterLayout,
  type ClusterBridge,
  type ClusterGlobe,
  CLUSTER_FIELD_RADIUS,
  CLUSTER_DEFAULT_CAMERA_Z,
  CLUSTER_OVERVIEW_CAMERA_Z,
  CLUSTER_MIN_CAMERA_Z,
  CLUSTER_MAX_CAMERA_Z,
  CLUSTER_FOCUS_CAMERA_Z,
  CLUSTER_MIN_FOCUS_Z,
  CLUSTER_MAX_FOCUS_Z,
} from './clusterLayout'

const ASPECT_WIDTH_OVER_HEIGHT: Record<GlobeAspectRatio, number> = {
  portrait: 3 / 4,
  square: 1,
  landscape: 4 / 3,
  wide: 16 / 9,
}

const _worldPos = new THREE.Vector3()
const _cameraSpace = new THREE.Vector3()
const _pullWorld = new THREE.Vector3()
const _pullCamDir = new THREE.Vector3()
const _pullTargetWorld = new THREE.Vector3()
const _pullTargetLocal = new THREE.Vector3()

export const COMPLEXITY_FOCUS_PULL_TOWARD = 130
export const COMPLEXITY_FOCUS_PULL_AWAY = 36

export function shortestAngleDelta(current: number, target: number): number {
  let delta = target - current
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  return delta
}

export function applyComplexityPositionPull(
  object: CSS3DObject,
  globe: THREE.Group,
  camera: THREE.Camera,
  baseLocal: THREE.Vector3,
  pullAmount: number,
): void {
  if (Math.abs(pullAmount) < 0.5) {
    object.position.copy(baseLocal)
    return
  }

  object.position.copy(baseLocal)
  object.updateMatrixWorld(true)
  _pullWorld.setFromMatrixPosition(object.matrixWorld)
  _pullCamDir.copy(camera.position).sub(_pullWorld)
  if (_pullCamDir.lengthSq() < 1e-6) {
    object.position.copy(baseLocal)
    return
  }
  _pullCamDir.normalize()
  _pullTargetWorld.copy(_pullWorld).addScaledVector(_pullCamDir, pullAmount)
  _pullTargetLocal.copy(_pullTargetWorld)
  globe.worldToLocal(_pullTargetLocal)
  object.position.copy(_pullTargetLocal)
}

export function imageDimensions(settings: GlobeDisplaySettings): {
  width: number
  height: number
} {
  const baseHeight = BASE_IMAGE_HEIGHT * settings.imageSize
  const ratio =
    settings.imageShape === 'circle'
      ? 1
      : ASPECT_WIDTH_OVER_HEIGHT[settings.aspectRatio]
  const height = Math.round(baseHeight)
  const width = Math.round(height * ratio)
  return { width, height }
}

export function imageBorderRadius(
  settings: GlobeDisplaySettings,
): string {
  if (settings.imageShape === 'circle') return '50%'
  return `${settings.cornerRadius}px`
}

export function applyDisplaySettings(
  object: CSS3DObject,
  settings: GlobeDisplaySettings,
): void {
  const element = object.userData.element as HTMLDivElement
  const clip = object.userData.clip as HTMLDivElement | undefined
  const img = object.userData.img as HTMLImageElement
  if (!element || !clip || !img) return

  const { width, height } = imageDimensions(settings)
  const isCircle = settings.imageShape === 'circle'

  element.style.width = `${width}px`
  element.style.height = `${height}px`
  element.classList.toggle('globe-photo--circle', isCircle)

  clip.style.width = '100%'
  clip.style.height = '100%'

  if (isCircle) {
    clip.style.borderRadius = '50%'
    clip.style.clipPath = 'none'
    img.style.borderRadius = '0'
    img.style.clipPath = 'none'
  } else {
    const radius = imageBorderRadius(settings)
    clip.style.borderRadius = radius
    clip.style.clipPath = 'none'
    img.style.borderRadius = '0'
    img.style.clipPath = 'none'
  }

  img.style.boxShadow = 'none'
  const item = object.userData.item as GalleryItem | undefined
  if (item && !object.userData.holdImageLoad) {
    img.src = resolveGlobeImageSrc(item)
  }
  object.scale.set(1, 1, 1)
}

export function createPhotoElement(
  item: GalleryItem,
  settings: GlobeDisplaySettings,
  onActivate: (item: GalleryItem) => void,
  onHover: (item: GalleryItem | null) => void,
  options: {
    eager?: boolean
    loadDelayMs?: number
    holdLoad?: boolean
    introBlur?: boolean
  } = {},
): { object: CSS3DObject; element: HTMLDivElement } {
  const eager = options.eager ?? false
  const loadDelayMs = options.loadDelayMs ?? 0
  const holdLoad = options.holdLoad ?? false
  const introBlur = options.introBlur ?? false
  const element = document.createElement('div')
  element.className = 'globe-photo'
  element.dataset.itemId = item.id
  element.style.cssText = `
    cursor: none;
    transform-style: preserve-3d;
    backface-visibility: hidden;
    background: transparent;
    box-shadow: none;
    filter: none;
    position: relative;
    isolation: isolate;
  `

  const clip = document.createElement('div')
  clip.className = 'globe-photo-clip'

  const media = document.createElement('div')
  media.className = `globe-photo-media blur-in-img${introBlur ? ' globe-photo-media--intro' : ''} is-loading`
  if (loadDelayMs > 0) {
    media.style.setProperty('--globe-reveal-delay', `${loadDelayMs}ms`)
  }

  const img = document.createElement('img')
  img.className = 'globe-photo-img'
  img.alt = ''
  img.decoding = 'async'
  img.draggable = false
  img.style.cssText = `
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    pointer-events: none;
    backface-visibility: hidden;
    box-shadow: none;
    background: transparent;
  `
  media.appendChild(img)
  clip.appendChild(media)
  element.appendChild(clip)

  const createdAt = performance.now()
  let imageReady = false
  let blurReleased = false

  const showBlurredImage = () => {
    if (imageReady) return
    imageReady = true
    media.classList.add('is-ready')
  }

  const releaseBlur = () => {
    if (blurReleased) return
    blurReleased = true
    const elapsed = performance.now() - createdAt
    const minBlurMs = introBlur ? GLOBE_INTRO_BLUR_IN_MIN_MS : GLOBE_BLUR_IN_MIN_MS
    const cached = img.complete && img.naturalWidth > 0
    const wait = cached ? 0 : Math.max(0, minBlurMs - elapsed)
    window.setTimeout(() => {
      media.classList.remove('is-loading')
    }, wait)
  }

  const onImageAvailable = () => {
    showBlurredImage()
    releaseBlur()
  }

  let loadTimer: ReturnType<typeof setTimeout> | undefined
  const object = new CSS3DObject(element)

  const beginLoad = () => {
    loadTimer = undefined
    object.userData.holdImageLoad = false
    img.src = resolveGlobeImageSrc(item)
    img.loading = eager ? 'eager' : 'lazy'
    img.addEventListener('load', onImageAvailable, { once: true })
    img.addEventListener('error', onImageAvailable, { once: true })
    if (img.complete && img.naturalWidth > 0) {
      onImageAvailable()
    }
  }

  const scheduleLoad = () => {
    if (loadDelayMs > 0) {
      loadTimer = window.setTimeout(beginLoad, loadDelayMs)
    } else {
      beginLoad()
    }
  }

  element.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return
    e.stopPropagation()
    onActivate(item)
  })
  element.addEventListener('mouseenter', () => {
    element.dataset.hovered = 'true'
    element.style.opacity = '1'
    element.style.zIndex = '100'
    onHover(item)
  })
  element.addEventListener('mouseleave', () => {
    delete element.dataset.hovered
    element.style.zIndex = '1'
    onHover(null)
  })

  object.userData.item = item
  object.userData.element = element
  object.userData.clip = clip
  object.userData.media = media
  object.userData.img = img
  object.userData.holdImageLoad = holdLoad
  object.userData.cancelDeferredLoad = () => {
    if (loadTimer !== undefined) {
      clearTimeout(loadTimer)
      loadTimer = undefined
    }
  }
  object.userData.flushDeferredLoad = () => {
    if (loadTimer !== undefined) {
      clearTimeout(loadTimer)
      loadTimer = undefined
    }
    if (!img.src) scheduleLoad()
  }
  applyDisplaySettings(object, settings)

  if (!holdLoad) {
    scheduleLoad()
  }

  return { object, element }
}

export function placeOnSphere(
  object: CSS3DObject,
  position: THREE.Vector3,
): void {
  object.position.copy(position)
}

export function billboardTowardCamera(
  object: CSS3DObject,
  camera: THREE.Camera,
): void {
  object.lookAt(camera.position)
}

export function updateObjectVisibility(
  object: CSS3DObject,
  camera: THREE.Camera,
  element: HTMLElement,
  maxCameraZ = 80,
): boolean {
  _worldPos.setFromMatrixPosition(object.matrixWorld)
  _cameraSpace.copy(_worldPos).applyMatrix4(camera.matrixWorldInverse)
  const visible = _cameraSpace.z < maxCameraZ
  const wasVisible = object.userData.globeVisible === true
  if (visible !== wasVisible) {
    element.style.visibility = visible ? 'visible' : 'hidden'
    element.style.pointerEvents = visible ? 'auto' : 'none'
    object.userData.globeVisible = visible
  }
  return visible
}

export const DEPTH_FADE_NEAR_BASE = 0.85
export const DEPTH_FADE_FAR_BASE = 0.95

export function depthFadeDistanceBounds(
  cameraZ: number,
  fieldRadius: number,
  fadeRange = 1,
): { near: number; far: number } {
  return {
    near: cameraZ - fieldRadius * DEPTH_FADE_NEAR_BASE * fadeRange,
    far: cameraZ + fieldRadius * DEPTH_FADE_FAR_BASE * fadeRange,
  }
}

export function depthFadeDistanceT(
  distance: number,
  cameraZ: number,
  fieldRadius: number,
  fadeRange = 1,
): number {
  const { near, far } = depthFadeDistanceBounds(cameraZ, fieldRadius, fadeRange)
  return Math.max(0, Math.min(1, (distance - near) / (far - near)))
}

export function distanceOpacity(
  object: CSS3DObject,
  camera: THREE.Camera,
  element: HTMLElement,
  cameraZ: number,
  depthFade: number,
  fadeRange = 1,
): void {
  if (element.dataset.hovered === 'true' || depthFade <= 0) {
    if (element.style.opacity !== '1') element.style.opacity = '1'
    return
  }

  _worldPos.setFromMatrixPosition(object.matrixWorld)
  const dist = _worldPos.distanceTo(camera.position)
  const t = depthFadeDistanceT(dist, cameraZ, GLOBE_RADIUS, fadeRange)
  const opacity = String(Math.max(1 - depthFade * 0.85, 1 - t * 0.72 * depthFade))
  if (element.style.opacity !== opacity) element.style.opacity = opacity
}

export const CLUSTER_VIEWPORT_MARGIN = 0.1

export function clusterFitsInViewport(
  objects: CSS3DObject[],
  margin = CLUSTER_VIEWPORT_MARGIN,
  container?: HTMLElement | null,
): boolean {
  const bounds = container?.getBoundingClientRect()
  const left = bounds?.left ?? 0
  const top = bounds?.top ?? 0
  const width = bounds?.width ?? window.innerWidth
  const height = bounds?.height ?? window.innerHeight
  const minX = left + width * margin
  const maxX = left + width * (1 - margin)
  const minY = top + height * margin
  const maxY = top + height * (1 - margin)

  let measured = 0
  for (let i = 0; i < objects.length; i++) {
    const el = objects[i].userData.element as HTMLElement | undefined
    if (!el || el.style.visibility === 'hidden') continue
    const opacity = Number.parseFloat(el.style.opacity || '1')
    if (opacity < 0.15) continue
    const rect = el.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) continue
    measured++
    if (
      rect.left < minX ||
      rect.right > maxX ||
      rect.top < minY ||
      rect.bottom > maxY
    ) {
      return false
    }
  }

  return measured > 0 && measured === objects.length
}

export function pullClusterIntoViewport(
  objects: CSS3DObject[],
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  cssRenderer: CSS3DRenderer,
  margin = CLUSTER_VIEWPORT_MARGIN,
  container?: HTMLElement | null,
): number {
  if (objects.length === 0) return camera.position.z

  let z = camera.position.z
  for (let step = 0; step < 24; step++) {
    camera.position.z = z
    cssRenderer.render(scene, camera)
    if (clusterFitsInViewport(objects, margin, container)) return z
    z *= 1.08
  }

  camera.position.z = z
  cssRenderer.render(scene, camera)
  return z
}

export function fitClusterCameraToViewport(
  objects: CSS3DObject[],
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  cssRenderer: CSS3DRenderer,
  startZ: number,
  margin = CLUSTER_VIEWPORT_MARGIN,
  container?: HTMLElement | null,
): number {
  if (objects.length === 0) return startZ

  let z = Math.max(startZ, camera.position.z, 300)
  camera.position.z = z

  for (let step = 0; step < 60; step++) {
    cssRenderer.render(scene, camera)
    if (clusterFitsInViewport(objects, margin, container)) return z
    z *= 1.1
    camera.position.z = z
  }

  cssRenderer.render(scene, camera)
  return z
}

export function createGlobeRenderers(
  container: HTMLElement,
): {
  cssRenderer: CSS3DRenderer
  camera: THREE.PerspectiveCamera
  scene: THREE.Scene
  globe: THREE.Group
} {
  const scene = new THREE.Scene()
  const globe = new THREE.Group()
  globe.rotation.order = GLOBE_ROTATION_ORDER
  scene.add(globe)

  const camera = new THREE.PerspectiveCamera(GLOBE_CAMERA_FOV, 1, 1, 16000)
  camera.position.set(0, 0, DEFAULT_CAMERA_Z)

  const cssRenderer = new CSS3DRenderer()
  cssRenderer.domElement.style.position = 'absolute'
  cssRenderer.domElement.style.inset = '0'
  cssRenderer.domElement.style.zIndex = '2'
  cssRenderer.domElement.style.pointerEvents = 'auto'
  cssRenderer.domElement.style.background = 'transparent'
  container.appendChild(cssRenderer.domElement)

  return { cssRenderer, camera, scene, globe }
}
