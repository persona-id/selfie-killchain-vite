import * as THREE from 'three'
import type { CategoryViewSettings, GalleryItem, GlobeCategoryMode } from '../types/gallery'
import { clusterElementPositions } from './clusterLayout'
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

const CHAIN_SPHERE_SPACING = 720
const CHAIN_SPHERE_RADIUS = 92

function hubColor(index: number): string {
  return HUB_COLORS[index % HUB_COLORS.length]
}

function clusterOffsets(
  settings: CategoryViewSettings,
  count: number,
): THREE.Vector3[] {
  const radius = CHAIN_SPHERE_RADIUS * Math.sqrt(settings.chainSpacing)
  return clusterElementPositions(
    settings.clusterShape,
    count,
    radius * settings.clusterSpacing,
  )
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

function chainHubCenters(
  keys: string[],
  spacing: number,
): Map<string, THREE.Vector3> {
  const centers = new Map<string, THREE.Vector3>()
  const count = keys.length
  const totalSpan = Math.max(0, count - 1) * spacing

  keys.forEach((key, index) => {
    const z = -totalSpan / 2 + index * spacing
    centers.set(key, new THREE.Vector3(0, 0, z))
  })

  return centers
}

function buildLayoutFromHubs(
  items: GalleryItem[],
  hubCenters: Map<string, THREE.Vector3>,
  settings: CategoryViewSettings,
  bridges: ClusterBridge[],
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
    const offsets = clusterOffsets(settings, members.length)
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

  const clusterRadius =
    CHAIN_SPHERE_RADIUS * Math.sqrt(settings.chainSpacing) * settings.clusterSpacing
  const fieldRadius = Math.max(
    520,
    ...hubs.map((hub) => Math.abs(hub.center.z) + clusterRadius * 3.2),
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
  if (mode !== 'chain' || items.length === 0) return null

  const groups = groupItemsByFilter(items)
  const keys = orderedFilterGroups(groups.keys())
  const spacing = CHAIN_SPHERE_SPACING * settings.chainSpacing
  const hubCenters = chainHubCenters(keys, spacing)

  const hubs: { id: string; anchorId: string }[] = []
  keys.forEach((key) => {
    const members = groups.get(key) ?? []
    if (members.length > 0) {
      hubs.push({ id: key, anchorId: members[0].id })
    }
  })

  const bridges: ClusterBridge[] = []
  for (let i = 0; i < hubs.length - 1; i++) {
    bridges.push({
      fromId: hubs[i].anchorId,
      toId: hubs[i + 1].anchorId,
    })
  }

  return buildLayoutFromHubs(items, hubCenters, settings, bridges)
}

export function isCategoryModeActive(mode: GlobeCategoryMode): boolean {
  return mode === 'chain'
}
