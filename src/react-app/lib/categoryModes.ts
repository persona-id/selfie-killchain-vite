import * as THREE from 'three'
import type { CategoryViewSettings, GalleryItem, GlobeCategoryMode } from '../types/gallery'
import { filterGroupLabel, itemFilterKey, orderedFilterGroups } from './taxonomy'
import type { ClusterBridge } from './clusterLayout'
import type { ImageCluster } from './threads'

export type CategoryHub = {
  id: string
  label: string
  center: THREE.Vector3
  color: string
  memberIds: string[]
}

export type CategoryModeLayout = {
  positions: THREE.Vector3[]
  hubs: CategoryHub[]
  bridges: ClusterBridge[]
  clusters: ImageCluster[]
  fieldRadius: number
  hubCentersById: Map<string, THREE.Vector3>
  itemHubId: Map<string, string>
  hubFieldPositions: Map<string, Map<string, THREE.Vector3>>
}

const HUB_COLORS = [
  '#c4b5fd',
  '#fcd34d',
  '#fda4af',
  '#93c5fd',
  '#86efac',
  '#f9a8d4',
  '#fdba74',
  '#a5b4fc',
  '#5eead4',
  '#e879f9',
]

const CATEGORY_RELATIONSHIPS: [string, string][] = [
  ['dolls_and_mannequins', 'masks'],
  ['masks', 'replicas'],
  ['replicas', 'physical_photo'],
  ['physical_photo', 'screen_replays'],
  ['ai_generated', 'face_swap'],
  ['ai_generated', 'full_face_synthesis'],
  ['ai_generated', 'partial_modification'],
  ['face_swap', 'partial_modification'],
  ['id_portraits', 'kyc_video'],
  ['id_portraits', 'physical_photo'],
  ['kyc_video', 'screen_replays'],
  ['full_face_synthesis', 'partial_modification'],
]

function hubColor(index: number): string {
  return HUB_COLORS[index % HUB_COLORS.length]
}

function miniClusterOffsets(count: number, radius: number): THREE.Vector3[] {
  if (count === 0) return []
  if (count === 1) return [new THREE.Vector3()]

  const phi = Math.PI * (3 - Math.sqrt(5))
  const offsets: THREE.Vector3[] = []
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const ring = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = phi * i
    offsets.push(
      new THREE.Vector3(
        Math.cos(theta) * ring * radius,
        y * radius * 0.85,
        Math.sin(theta) * ring * radius * 0.65,
      ),
    )
  }
  return offsets
}

function groupItemsByFilter(items: GalleryItem[]): Map<string, GalleryItem[]> {
  const groups = new Map<string, GalleryItem[]>()
  for (const item of items) {
    const key = itemFilterKey(item)
    const bucket = groups.get(key) ?? []
    bucket.push(item)
    groups.set(key, bucket)
  }
  return groups
}

function mindmapHubCenters(
  keys: string[],
  spread: number,
): Map<string, THREE.Vector3> {
  const centers = new Map<string, THREE.Vector3>()
  const radius = 520 * spread
  const count = keys.length

  keys.forEach((key, index) => {
    const tier = index % 3
    const ringIndex = Math.floor(index / 3)
    const ringCount = Math.max(1, Math.ceil(count / 3))
    const angle = (ringIndex / ringCount) * Math.PI * 2 + tier * 0.55
    const r = radius * (0.55 + tier * 0.22)
    centers.set(
      key,
      new THREE.Vector3(
        Math.cos(angle) * r,
        Math.sin(angle) * r * 0.42 + tier * 90 - 60,
        (tier - 1) * 120,
      ),
    )
  })

  return centers
}

function networkHubCenters(
  keys: string[],
  spread: number,
): Map<string, THREE.Vector3> {
  const centers = new Map<string, THREE.Vector3>()
  const radius = 480 * spread
  const count = keys.length

  keys.forEach((key, index) => {
    const phi = Math.acos(1 - (2 * (index + 0.5)) / count)
    const theta = Math.PI * (1 + Math.sqrt(5)) * index
    centers.set(
      key,
      new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi) * 0.55,
        radius * Math.sin(phi) * Math.sin(theta),
      ),
    )
  })

  return centers
}

function bubbleHubCenters(
  keys: string[],
  spread: number,
): Map<string, THREE.Vector3> {
  const centers = new Map<string, THREE.Vector3>()
  const radius = 560 * spread
  const count = keys.length

  keys.forEach((key, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2
    const wobble = 0.78 + (index % 4) * 0.08
    centers.set(
      key,
      new THREE.Vector3(
        Math.cos(angle) * radius * wobble,
        Math.sin(angle) * radius * 0.35 + (index % 2 === 0 ? 80 : -80),
        Math.sin(angle * 1.7) * radius * 0.25,
      ),
    )
  })

  return centers
}

function selfiePosition(index: number, total: number, scale: number): THREE.Vector3 {
  const t = (index + 0.5) / total
  const phi = Math.acos(1 - 2 * t)
  const theta = Math.PI * (3 - Math.sqrt(5)) * index
  const sx = 0.4 * scale
  const sy = 0.54 * scale
  const sz = 0.3 * scale
  const baseR = 420

  const x = baseR * sx * Math.sin(phi) * Math.cos(theta)
  const y = baseR * sy * Math.cos(phi) - baseR * 0.06
  const z = baseR * sz * Math.sin(phi) * Math.sin(theta)
  const jitter = baseR * 0.018

  return new THREE.Vector3(
    x + Math.sin(index * 12.9898) * jitter,
    y + Math.cos(index * 78.233) * jitter,
    z + Math.sin(index * 37.719) * jitter,
  )
}

function buildBridges(keys: Set<string>, hubs: CategoryHub[]): ClusterBridge[] {
  const bridges: ClusterBridge[] = []
  const seen = new Set<string>()

  for (const [fromKey, toKey] of CATEGORY_RELATIONSHIPS) {
    if (!keys.has(fromKey) || !keys.has(toKey)) continue
    const pairKey = [fromKey, toKey].sort().join('|')
    if (seen.has(pairKey)) continue
    seen.add(pairKey)

    const fromHub = hubs.find((hub) => hub.id === fromKey)
    const toHub = hubs.find((hub) => hub.id === toKey)
    if (!fromHub || !toHub) continue

    bridges.push({
      fromId: fromHub.memberIds[0] ?? fromKey,
      toId: toHub.memberIds[0] ?? toKey,
    })
  }

  if (bridges.length === 0 && hubs.length > 1) {
    for (let i = 0; i < hubs.length - 1; i++) {
      bridges.push({
        fromId: hubs[i].memberIds[0] ?? hubs[i].id,
        toId: hubs[i + 1].memberIds[0] ?? hubs[i + 1].id,
      })
    }
  }

  return bridges
}

function buildLayoutFromHubs(
  items: GalleryItem[],
  hubCenters: Map<string, THREE.Vector3>,
  clusterRadius: number,
): CategoryModeLayout {
  const groups = groupItemsByFilter(items)
  const keys = orderedFilterGroups(groups.keys())
  const positions: THREE.Vector3[] = new Array(items.length)
  const hubs: CategoryHub[] = []
  const itemHubId = new Map<string, string>()
  const hubFieldPositions = new Map<string, Map<string, THREE.Vector3>>()
  const hubCentersById = new Map<string, THREE.Vector3>()
  const itemIndexById = new Map(items.map((item, index) => [item.id, index]))

  keys.forEach((key, hubIndex) => {
    const members = groups.get(key) ?? []
    if (members.length === 0) return

    const center = hubCenters.get(key) ?? new THREE.Vector3()
    const offsets = miniClusterOffsets(members.length, clusterRadius)
    const fieldMap = new Map<string, THREE.Vector3>()
    const memberIds = members.map((item) => item.id)

    members.forEach((item, memberIndex) => {
      const offset = offsets[memberIndex] ?? new THREE.Vector3()
      fieldMap.set(item.id, offset.clone())
      const world = center.clone().add(offset)
      const itemIndex = itemIndexById.get(item.id)
      if (itemIndex !== undefined) positions[itemIndex] = world
      itemHubId.set(item.id, key)
    })

    hubs.push({
      id: key,
      label: filterGroupLabel(key),
      center: center.clone(),
      color: hubColor(hubIndex),
      memberIds,
    })
    hubFieldPositions.set(key, fieldMap)
    hubCentersById.set(key, center.clone())
  })

  for (let i = 0; i < positions.length; i++) {
    if (!positions[i]) positions[i] = new THREE.Vector3()
  }

  const clusters: ImageCluster[] = hubs.map((hub) => ({
    id: hub.id,
    anchorId: hub.memberIds[0],
    memberIds: hub.memberIds.slice(1),
  }))

  const bridges = buildBridges(new Set(keys), hubs)
  const fieldRadius = Math.max(
    420,
    ...hubs.map((hub) => hub.center.length() + clusterRadius * 2.5),
  )

  return {
    positions,
    hubs,
    bridges,
    clusters,
    fieldRadius,
    hubCentersById,
    itemHubId,
    hubFieldPositions,
  }
}

export function computeCategoryModeLayout(
  mode: GlobeCategoryMode,
  items: GalleryItem[],
  settings: CategoryViewSettings,
): CategoryModeLayout | null {
  if (mode === 'globe' || items.length === 0) return null

  const spread = settings.clusterSpread
  const groups = groupItemsByFilter(items)
  const keys = orderedFilterGroups(groups.keys())

  if (mode === 'selfie') {
    const positions = items.map((_, index) => selfiePosition(index, items.length, spread))
    const center = new THREE.Vector3()
    positions.forEach((pos) => center.add(pos))
    center.multiplyScalar(1 / positions.length)

    return {
      positions,
      hubs: [
        {
          id: 'selfie',
          label: 'Selfie splat',
          center,
          color: '#e2e8f0',
          memberIds: items.map((item) => item.id),
        },
      ],
      bridges: [],
      clusters: [
        {
          id: 'selfie',
          anchorId: items[0]?.id ?? 'selfie',
          memberIds: items.slice(1).map((item) => item.id),
        },
      ],
      fieldRadius: 520 * spread,
      hubCentersById: new Map([['selfie', center]]),
      itemHubId: new Map(items.map((item) => [item.id, 'selfie'])),
      hubFieldPositions: new Map([
        [
          'selfie',
          new Map(items.map((item, index) => [item.id, positions[index].clone().sub(center)])),
        ],
      ]),
    }
  }

  const clusterRadius = mode === 'bubbles' ? 110 * spread : 72 * spread
  let hubCenters: Map<string, THREE.Vector3>

  switch (mode) {
    case 'mindmap':
      hubCenters = mindmapHubCenters(keys, spread)
      break
    case 'network':
      hubCenters = networkHubCenters(keys, spread)
      break
    case 'bubbles':
      hubCenters = bubbleHubCenters(keys, spread)
      break
    default:
      hubCenters = mindmapHubCenters(keys, spread)
  }

  return buildLayoutFromHubs(items, hubCenters, clusterRadius)
}

export function isCategoryModeActive(mode: GlobeCategoryMode): boolean {
  return mode !== 'globe'
}
