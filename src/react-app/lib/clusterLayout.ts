import * as THREE from 'three'
import {
  DEFAULT_CONSTELLATION,
  type CategoryViewSettings,
  type ClusterElementLayout,
  type ClusterFieldLayout,
  type ConstellationSettings,
  type GalleryItem,
} from '../types/gallery'
import { fraudMediumForItem } from './taxonomy'
import type { ImageCluster } from './threads'

export const CLUSTER_FIELD_RADIUS = 1450
export const CLUSTER_DEFAULT_CAMERA_Z = 3000
export const CLUSTER_OVERVIEW_CAMERA_Z = 2500
export const CLUSTER_MIN_CAMERA_Z = 1400
export const CLUSTER_MAX_CAMERA_Z = 5800
export const CLUSTER_FOCUS_CAMERA_Z = 460
export const CLUSTER_FOCUS_SCREEN_FRACTION = 0.85
export const CLUSTER_FOCUS_SAFETY = 1.02
export const CLUSTER_FOCUS_SCALE = 1
export const CLUSTER_MIN_FOCUS_Z = 300
export const CLUSTER_MAX_FOCUS_Z = 12000
export const MINI_GLOBE_RADIUS = 88
export const GLOBE_CAMERA_FOV = 42

const _focusCamera = new THREE.PerspectiveCamera(GLOBE_CAMERA_FOV, 1, 1, 20000)
const _localCorner = new THREE.Vector3()

export function focusClusterRadius(separation: number): number {
  return MINI_GLOBE_RADIUS * 1.45 * separation
}

function clusterObjectsFitAtCameraZ(
  objects: THREE.Object3D[],
  imageWidth: number,
  imageHeight: number,
  aspect: number,
  cameraZ: number,
  screenFraction: number,
): boolean {
  _focusCamera.position.set(0, 0, cameraZ)
  _focusCamera.aspect = aspect
  _focusCamera.lookAt(0, 0, 0)
  _focusCamera.updateProjectionMatrix()
  _focusCamera.updateMatrixWorld(true)

  const halfW = imageWidth / 2
  const halfH = imageHeight / 2
  let maxAbsX = 0
  let maxAbsY = 0

  for (let i = 0; i < objects.length; i++) {
    objects[i].updateWorldMatrix(true, false)
    for (const sx of [-1, 1] as const) {
      for (const sy of [-1, 1] as const) {
        _localCorner.set(sx * halfW, sy * halfH, 0)
        _localCorner.applyMatrix4(objects[i].matrixWorld)
        _localCorner.project(_focusCamera)
        maxAbsX = Math.max(maxAbsX, Math.abs(_localCorner.x))
        maxAbsY = Math.max(maxAbsY, Math.abs(_localCorner.y))
      }
    }
  }

  return maxAbsX <= screenFraction && maxAbsY <= screenFraction
}

export function computeClusterFocusCameraZForObjects(
  objects: THREE.Object3D[],
  imageWidth: number,
  imageHeight: number,
  aspect: number,
  screenFraction = CLUSTER_FOCUS_SCREEN_FRACTION,
): number {
  if (objects.length === 0) return CLUSTER_FOCUS_CAMERA_Z

  const fits = (cameraZ: number) =>
    clusterObjectsFitAtCameraZ(
      objects,
      imageWidth,
      imageHeight,
      aspect,
      cameraZ,
      screenFraction,
    )

  let lo = CLUSTER_MIN_FOCUS_Z
  let hi = CLUSTER_MAX_FOCUS_Z
  if (!fits(hi)) return hi * CLUSTER_FOCUS_SAFETY

  while (hi - lo > 2) {
    const mid = (lo + hi) / 2
    if (fits(mid)) hi = mid
    else lo = mid
  }

  return hi * CLUSTER_FOCUS_SAFETY
}

export const CLUSTER_ELEMENT_LAYOUT_OPTIONS: {
  id: ClusterElementLayout
  label: string
  hint: string
}[] = [
  { id: 'globe', label: 'Globe', hint: 'Fibonacci sphere' },
  { id: 'sphere', label: 'Sphere', hint: 'Uniform sphere surface' },
  { id: 'ring', label: 'Ring', hint: 'Flat circle' },
  { id: 'disc', label: 'Disc', hint: 'Filled spiral' },
  { id: 'helix', label: 'Helix', hint: 'Spiral column' },
  { id: 'burst', label: 'Burst', hint: 'Radial spray' },
  { id: 'orbit', label: 'Orbit', hint: 'Twin rings' },
]

export const CLUSTER_FIELD_LAYOUT_OPTIONS: {
  id: ClusterFieldLayout
  label: string
  hint: string
}[] = [
  { id: 'scattered', label: 'Nebula', hint: 'Loose cloud' },
  { id: 'globe', label: 'Globe', hint: 'Big sphere' },
  { id: 'grid', label: 'Cube', hint: '3D cube surface' },
  { id: 'wall', label: 'Wall', hint: 'Flat screen grid' },
  { id: 'belt', label: 'Ring', hint: 'Equatorial ring' },
  { id: 'helix', label: 'Helix', hint: 'Cosmic spiral' },
  { id: 'column', label: 'Tower', hint: 'Vertical stack' },
  { id: 'cross', label: 'Cross', hint: 'Axis arms' },
  { id: 'arc', label: 'Arc', hint: 'Semicircle sweep' },
  { id: 'diamond', label: 'Diamond', hint: 'Octahedron lattice' },
]

const MAX_CLUSTER_SIZE = 12
const BASE_CLUSTER_SPREAD = 1280
const BASE_MIN_CLUSTER_SEP = 620

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function fibonacciDirections(count: number): THREE.Vector3[] {
  if (count === 0) return []
  if (count === 1) return [new THREE.Vector3(0, 1, 0)]

  const phi = Math.PI * (3 - Math.sqrt(5))
  const dirs: THREE.Vector3[] = []

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const ring = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = phi * i
    dirs.push(
      new THREE.Vector3(
        Math.cos(theta) * ring,
        y,
        Math.sin(theta) * ring,
      ).normalize(),
    )
  }

  return dirs
}

export function miniGlobePositions(
  count: number,
  radius: number,
): THREE.Vector3[] {
  return fibonacciDirections(count).map((dir) =>
    dir.clone().multiplyScalar(radius),
  )
}

function perfectSpherePositions(count: number, radius: number): THREE.Vector3[] {
  if (count === 0) return []
  if (count === 1) return [new THREE.Vector3(0, radius, 0)]

  const goldenRatio = (1 + Math.sqrt(5)) / 2
  const points: THREE.Vector3[] = []

  for (let i = 0; i < count; i++) {
    const inclination = Math.acos(1 - (2 * (i + 0.5)) / count)
    const azimuth = (2 * Math.PI * i) / goldenRatio
    const sinInclination = Math.sin(inclination)
    points.push(
      new THREE.Vector3(
        sinInclination * Math.cos(azimuth) * radius,
        Math.cos(inclination) * radius,
        sinInclination * Math.sin(azimuth) * radius,
      ),
    )
  }

  return points
}

function applyFraudAxisToClusterCenters(
  groups: GalleryItem[][],
  centers: THREE.Vector3[],
  spread: number,
): void {
  const bandOffset = BASE_CLUSTER_SPREAD * spread * 0.72

  for (let i = 0; i < groups.length; i++) {
    const medium = fraudMediumForItem(groups[i][0])
    centers[i].y *= 0.4
    centers[i].y += medium === 'digital' ? bandOffset : -bandOffset
  }
}

function miniRingPositions(count: number, radius: number): THREE.Vector3[] {
  if (count === 0) return []
  if (count === 1) return [new THREE.Vector3(0, 0, 0)]

  const points: THREE.Vector3[] = []
  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2 - Math.PI / 2
    points.push(
      new THREE.Vector3(
        Math.cos(theta) * radius,
        0,
        Math.sin(theta) * radius,
      ),
    )
  }
  return points
}

function miniDiscPositions(count: number, radius: number): THREE.Vector3[] {
  if (count === 0) return []
  if (count === 1) return [new THREE.Vector3(0, 0, 0)]

  const phi = Math.PI * (3 - Math.sqrt(5))
  const points: THREE.Vector3[] = []
  for (let i = 0; i < count; i++) {
    const r = radius * Math.sqrt((i + 0.5) / count) * 0.96
    const theta = phi * i
    points.push(
      new THREE.Vector3(Math.cos(theta) * r, 0, Math.sin(theta) * r),
    )
  }
  return points
}

function miniHelixPositions(count: number, radius: number): THREE.Vector3[] {
  if (count === 0) return []
  if (count === 1) return [new THREE.Vector3(0, 0, 0)]

  const turns = 1.65
  const height = radius * 1.75
  const points: THREE.Vector3[] = []
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1)
    const theta = t * Math.PI * 2 * turns
    const y = (t - 0.5) * height
    points.push(
      new THREE.Vector3(
        Math.cos(theta) * radius * 0.88,
        y,
        Math.sin(theta) * radius * 0.88,
      ),
    )
  }
  return points
}

function miniBurstPositions(count: number, radius: number): THREE.Vector3[] {
  return fibonacciDirections(count).map((dir, i) => {
    const stretch = 0.68 + seededRandom(i * 41 + 7) * 0.62
    return dir.clone().multiplyScalar(radius * stretch)
  })
}

function miniOrbitPositions(count: number, radius: number): THREE.Vector3[] {
  if (count <= 2) return miniRingPositions(count, radius)

  const innerCount = Math.ceil(count / 2)
  const outerCount = count - innerCount
  const points: THREE.Vector3[] = []

  for (let i = 0; i < innerCount; i++) {
    const theta = (i / innerCount) * Math.PI * 2
    points.push(
      new THREE.Vector3(
        Math.cos(theta) * radius * 0.42,
        0,
        Math.sin(theta) * radius * 0.42,
      ),
    )
  }

  for (let i = 0; i < outerCount; i++) {
    const theta = (i / outerCount) * Math.PI * 2 + Math.PI / outerCount
    points.push(
      new THREE.Vector3(
        Math.cos(theta) * radius * 0.96,
        0,
        Math.sin(theta) * radius * 0.96,
      ),
    )
  }

  return points
}

export function clusterElementPositions(
  layout: ClusterElementLayout,
  count: number,
  radius: number,
): THREE.Vector3[] {
  switch (layout) {
    case 'ring':
      return miniRingPositions(count, radius)
    case 'disc':
      return miniDiscPositions(count, radius)
    case 'helix':
      return miniHelixPositions(count, radius)
    case 'burst':
      return miniBurstPositions(count, radius)
    case 'orbit':
      return miniOrbitPositions(count, radius)
    case 'sphere':
      return perfectSpherePositions(count, radius)
    case 'globe':
    default:
      return miniGlobePositions(count, radius)
  }
}

function shellClusterCenters(count: number, spread: number): THREE.Vector3[] {
  const radius = BASE_CLUSTER_SPREAD * spread * 0.92
  return fibonacciDirections(count).map((dir) =>
    dir.clone().multiplyScalar(radius),
  )
}

function beltClusterCenters(count: number, spread: number): THREE.Vector3[] {
  if (count === 0) return []
  const radius = BASE_CLUSTER_SPREAD * spread * 0.88
  const points: THREE.Vector3[] = []
  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2 - Math.PI / 2
    points.push(
      new THREE.Vector3(
        Math.cos(theta) * radius,
        (seededRandom(i * 13) - 0.5) * 90 * spread,
        Math.sin(theta) * radius,
      ),
    )
  }
  return points
}

function helixFieldCenters(count: number, spread: number): THREE.Vector3[] {
  if (count === 0) return []
  const radius = BASE_CLUSTER_SPREAD * spread * 0.52
  const height = BASE_CLUSTER_SPREAD * spread * 1.35
  const turns = 2.1
  const points: THREE.Vector3[] = []
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1)
    const theta = t * Math.PI * 2 * turns
    points.push(
      new THREE.Vector3(
        Math.cos(theta) * radius,
        (t - 0.5) * height,
        Math.sin(theta) * radius,
      ),
    )
  }
  return points
}

function sphereToCubePoint(dir: THREE.Vector3, half: number): THREE.Vector3 {
  const ax = Math.abs(dir.x)
  const ay = Math.abs(dir.y)
  const az = Math.abs(dir.z)
  const m = Math.max(ax, ay, az, 1e-6)
  return new THREE.Vector3(
    (dir.x / m) * half,
    (dir.y / m) * half,
    (dir.z / m) * half,
  )
}

function cubeClusterCenters(count: number, spread: number): THREE.Vector3[] {
  const half = BASE_CLUSTER_SPREAD * spread * 0.72
  return fibonacciDirections(count).map((dir) => sphereToCubePoint(dir, half))
}

function columnClusterCenters(count: number, spread: number): THREE.Vector3[] {
  if (count === 0) return []
  const height = BASE_CLUSTER_SPREAD * spread * 1.6
  const points: THREE.Vector3[] = []
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1)
    points.push(
      new THREE.Vector3(
        (seededRandom(i * 7) - 0.5) * 80 * spread,
        (t - 0.5) * height,
        (seededRandom(i * 11) - 0.5) * 80 * spread,
      ),
    )
  }
  return points
}

function crossClusterCenters(count: number, spread: number): THREE.Vector3[] {
  if (count === 0) return []
  const arm = BASE_CLUSTER_SPREAD * spread * 0.82
  const arms = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
  ]
  const points: THREE.Vector3[] = []
  for (let i = 0; i < count; i++) {
    const armDir = arms[i % arms.length]
    const slot = Math.floor(i / arms.length) + 1
    points.push(armDir.clone().multiplyScalar(arm * (0.45 + slot * 0.28)))
  }
  return points
}

function arcClusterCenters(count: number, spread: number): THREE.Vector3[] {
  if (count === 0) return []
  const radius = BASE_CLUSTER_SPREAD * spread * 0.9
  const points: THREE.Vector3[] = []
  for (let i = 0; i < count; i++) {
    const theta = (i / Math.max(1, count - 1)) * Math.PI - Math.PI / 2
    points.push(
      new THREE.Vector3(
        Math.cos(theta) * radius,
        (seededRandom(i * 3) - 0.5) * 60 * spread,
        Math.sin(theta) * radius * 0.5,
      ),
    )
  }
  return points
}

function diamondClusterCenters(count: number, spread: number): THREE.Vector3[] {
  if (count === 0) return []
  const radius = BASE_CLUSTER_SPREAD * spread * 0.85
  const verts = [
    new THREE.Vector3(0, radius, 0),
    new THREE.Vector3(0, -radius, 0),
    new THREE.Vector3(radius, 0, 0),
    new THREE.Vector3(-radius, 0, 0),
    new THREE.Vector3(0, 0, radius),
    new THREE.Vector3(0, 0, -radius),
  ]
  const points: THREE.Vector3[] = []
  for (let i = 0; i < count; i++) {
    const a = verts[i % verts.length]
    const b = verts[(i + 2) % verts.length]
    points.push(a.clone().lerp(b, seededRandom(i * 19)))
  }
  return points
}

function gridClusterCenters(count: number, spread: number): THREE.Vector3[] {
  return cubeClusterCenters(count, spread)
}

function wallClusterCenters(count: number, spread: number): THREE.Vector3[] {
  if (count === 0) return []
  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)
  const spacing = BASE_MIN_CLUSTER_SEP * spread * 0.88
  const points: THREE.Vector3[] = []

  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    points.push(
      new THREE.Vector3(
        (col - (cols - 1) / 2) * spacing,
        (row - (rows - 1) / 2) * spacing,
        0,
      ),
    )
  }

  return points
}

function clusterFieldCenters(
  layout: ClusterFieldLayout,
  count: number,
  spread: number,
): THREE.Vector3[] {
  switch (layout) {
    case 'globe':
    case 'shell':
      return shellClusterCenters(count, spread)
    case 'grid':
      return gridClusterCenters(count, spread)
    case 'column':
      return columnClusterCenters(count, spread)
    case 'cross':
      return crossClusterCenters(count, spread)
    case 'arc':
      return arcClusterCenters(count, spread)
    case 'diamond':
      return diamondClusterCenters(count, spread)
    case 'wall':
      return wallClusterCenters(count, spread)
    case 'belt':
      return beltClusterCenters(count, spread)
    case 'helix':
      return helixFieldCenters(count, spread)
    case 'scattered':
    default:
      return spreadClusterCenters(count, spread)
  }
}

function spreadClusterCenters(count: number, spread: number): THREE.Vector3[] {
  const clusterSpread = BASE_CLUSTER_SPREAD * spread
  const minSep = BASE_MIN_CLUSTER_SEP * spread
  const centers: THREE.Vector3[] = []

  for (let i = 0; i < count; i++) {
    let candidate: THREE.Vector3 | null = null

    for (let attempt = 0; attempt < 160; attempt++) {
      const dir = fibonacciDirections(count)[i]
      const radial =
        clusterSpread * (0.72 + seededRandom(i * 17 + attempt) * 0.55)
      const jitter = new THREE.Vector3(
        (seededRandom(i + attempt * 3) - 0.5) * 180 * spread,
        (seededRandom(i + attempt * 5) - 0.5) * 140 * spread,
        (seededRandom(i + attempt * 7) - 0.5) * 180 * spread,
      )
      const next = dir.clone().multiplyScalar(radial).add(jitter)

      const separated = centers.every(
        (center) => center.distanceTo(next) >= minSep,
      )
      if (separated) {
        candidate = next
        break
      }
    }

    if (!candidate) {
      const dir = fibonacciDirections(count)[i]
      candidate = dir.multiplyScalar(
        clusterSpread * (1.05 + seededRandom(i + 99) * 0.4),
      )
    }

    centers.push(candidate)
  }

  return centers
}

function groupItems(items: GalleryItem[]): GalleryItem[][] {
  const buckets = new Map<string, GalleryItem[]>()

  for (const item of items) {
    const key = item.subcategory ?? item.category
    const bucket = buckets.get(key) ?? []
    bucket.push(item)
    buckets.set(key, bucket)
  }

  const groups: GalleryItem[][] = []
  for (const bucket of buckets.values()) {
    if (bucket.length <= MAX_CLUSTER_SIZE) {
      groups.push(bucket)
      continue
    }

    for (let i = 0; i < bucket.length; i += MAX_CLUSTER_SIZE) {
      groups.push(bucket.slice(i, i + MAX_CLUSTER_SIZE))
    }
  }

  return groups.sort((a, b) => a[0].id.localeCompare(b[0].id))
}

export type ClusterBridge = {
  fromId: string
  toId: string
}

export type ClusterGlobe = {
  id: string
  center: THREE.Vector3
  radius: number
  focusRadius: number
  cluster: ImageCluster
  label: string
  itemIds: Set<string>
  fieldPositions: Map<string, THREE.Vector3>
  focusPositions: Map<string, THREE.Vector3>
}

export type ClusterLayout = {
  positions: THREE.Vector3[]
  clusters: ImageCluster[]
  bridges: ClusterBridge[]
  fieldRadius: number
  clusterGlobes: ClusterGlobe[]
  itemClusterId: Map<string, string>
}

function computeBridges(
  clusters: ImageCluster[],
  centers: THREE.Vector3[],
): ClusterBridge[] {
  const bridges: ClusterBridge[] = []
  const linked = new Set<string>()

  clusters.forEach((cluster, i) => {
    let nearest = -1
    let nearestDist = Infinity

    for (let j = 0; j < clusters.length; j++) {
      if (i === j) continue
      const dist = centers[i].distanceTo(centers[j])
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = j
      }
    }

    if (nearest < 0) return
    const fromId = cluster.anchorId
    const toId = clusters[nearest].anchorId
    const key = [fromId, toId].sort().join('::')
    if (linked.has(key)) return
    linked.add(key)
    bridges.push({ fromId, toId })
  })

  return bridges
}

export function computeClusterLayout(
  items: GalleryItem[],
  settings: ConstellationSettings = DEFAULT_CONSTELLATION,
  categoryView?: Pick<
    CategoryViewSettings,
    'fraudAxisEnabled' | 'fraudAxisSpread'
  >,
): ClusterLayout {
  const spread = settings.clusterSpread
  const separation = settings.elementSeparation
  const fieldMiniRadius = MINI_GLOBE_RADIUS * 0.72 * separation
  const focusMiniRadius = MINI_GLOBE_RADIUS * 1.32 * separation

  if (items.length === 0) {
    return {
      positions: [],
      clusters: [],
      bridges: [],
      fieldRadius: CLUSTER_FIELD_RADIUS * spread,
      clusterGlobes: [],
      itemClusterId: new Map(),
    }
  }

  const groups = groupItems(items)
  const centers = clusterFieldCenters(settings.fieldLayout, groups.length, spread)
  if (categoryView?.fraudAxisEnabled) {
    applyFraudAxisToClusterCenters(groups, centers, categoryView.fraudAxisSpread)
  }
  const positions = new Array<THREE.Vector3>(items.length)
  const itemIndex = new Map(items.map((item, index) => [item.id, index]))
  const clusters: ImageCluster[] = []
  const clusterGlobes: ClusterGlobe[] = []
  const itemClusterId = new Map<string, string>()

  groups.forEach((members, clusterIdx) => {
    const center = centers[clusterIdx]
    const anchor = members[0]
    const memberIds: string[] = []
    const fieldPositions = new Map<string, THREE.Vector3>()
    const focusPositions = new Map<string, THREE.Vector3>()
    const fieldMini = clusterElementPositions(
      settings.elementLayout,
      members.length,
      fieldMiniRadius,
    )
    const focusMini = clusterElementPositions(
      settings.elementLayout,
      members.length,
      focusMiniRadius,
    )

    const clusterId = `layout-${anchor.id}`
    const label =
      anchor.subcategory?.replace(/_/g, ' ') ??
      anchor.category.replace(/_/g, ' ')

    members.forEach((item, memberIdx) => {
      const index = itemIndex.get(item.id)
      if (index === undefined) return

      const fieldLocal = fieldMini[memberIdx]
      const focusLocal = focusMini[memberIdx]
      fieldPositions.set(item.id, fieldLocal)
      focusPositions.set(item.id, focusLocal)
      positions[index] = center.clone().add(fieldLocal)
      itemClusterId.set(item.id, clusterId)
      if (item.id !== anchor.id) memberIds.push(item.id)
    })

    const cluster: ImageCluster = {
      id: clusterId,
      anchorId: anchor.id,
      memberIds,
    }
    clusters.push(cluster)

    clusterGlobes.push({
      id: clusterId,
      center,
      radius: fieldMiniRadius,
      focusRadius: focusMiniRadius,
      cluster,
      label,
      itemIds: new Set(members.map((item) => item.id)),
      fieldPositions,
      focusPositions,
    })
  })

  return {
    positions,
    clusters,
    bridges: computeBridges(clusters, centers),
    fieldRadius: CLUSTER_FIELD_RADIUS * spread,
    clusterGlobes,
    itemClusterId,
  }
}

export function findClusterGlobe(
  layout: ClusterLayout,
  clusterId: string | null,
): ClusterGlobe | null {
  if (!clusterId) return null
  return layout.clusterGlobes.find((globe) => globe.id === clusterId) ?? null
}

export function constellationSettingsForCategoryView(
  categoryView: CategoryViewSettings,
  base: ConstellationSettings = DEFAULT_CONSTELLATION,
): ConstellationSettings {
  return {
    ...base,
    elementLayout: categoryView.clusterShape,
    fieldLayout: categoryView.clusterFieldLayout,
    elementSeparation: categoryView.clusterSpacing,
    clusterSpread: categoryView.groupSpread,
    elementAnimation: categoryView.clusterAnimation,
  }
}
