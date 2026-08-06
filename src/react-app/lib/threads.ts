import * as THREE from 'three'
import type { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
import type { GalleryItem } from '../types/gallery'
import type { LinkClusterSettings } from '../types/gallery'

export type ImageCluster = {
  id: string
  anchorId: string
  memberIds: string[]
}

export const CLUSTER_OUTSIDE_OPACITY = 0.2
export const INACTIVE_NODE_OPACITY = 0.4
export const COMPLEXITY_DIM_OPACITY = 0.15

export function clusterMemberIds(cluster: ImageCluster): Set<string> {
  return new Set([cluster.anchorId, ...cluster.memberIds])
}

export function clusterItems(
  cluster: ImageCluster,
  pool: GalleryItem[],
): GalleryItem[] {
  const byId = new Map(pool.map((item) => [item.id, item]))
  const anchor = byId.get(cluster.anchorId)
  if (!anchor) return []

  const members = cluster.memberIds
    .map((id) => byId.get(id))
    .filter((item): item is GalleryItem => item !== undefined)

  return [anchor, ...members]
}

const _worldPos = new THREE.Vector3()
const _edgeWorld = new THREE.Vector3()

export type ClusterHoverTarget = {
  id: string
  label: string
  count: number
  radius: number
}

export function clusterScreenHitRadius(
  worldCenter: THREE.Vector3,
  worldRadius: number,
  camera: THREE.Camera,
  width: number,
  height: number,
): number {
  _edgeWorld.copy(worldCenter).add(new THREE.Vector3(worldRadius, 0, 0))
  const center = projectWorldToScreen(worldCenter, camera, width, height)
  const edge = projectWorldToScreen(_edgeWorld, camera, width, height)
  if (!center.visible) return 0
  return Math.max(52, Math.hypot(edge.x - center.x, edge.y - center.y) * 1.4)
}

export function findClusterAtScreenPoint(
  clusters: ClusterHoverTarget[],
  getWorldCenter: (cluster: ClusterHoverTarget) => THREE.Vector3,
  clientX: number,
  clientY: number,
  camera: THREE.Camera,
  width: number,
  height: number,
): ClusterHoverTarget | null {
  let best: ClusterHoverTarget | null = null
  let bestDistance = Infinity

  for (const cluster of clusters) {
    const worldCenter = getWorldCenter(cluster)
    const screen = projectWorldToScreen(worldCenter, camera, width, height)
    if (!screen.visible) continue

    const hitRadius = clusterScreenHitRadius(
      worldCenter,
      cluster.radius,
      camera,
      width,
      height,
    )
    const distance = Math.hypot(screen.x - clientX, screen.y - clientY)
    if (distance <= hitRadius && distance < bestDistance) {
      bestDistance = distance
      best = cluster
    }
  }

  return best
}

export function projectWorldToScreen(
  world: THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  height: number,
): { x: number; y: number; visible: boolean } {
  const projected = world.clone().project(camera)
  return {
    x: (projected.x * 0.5 + 0.5) * width,
    y: (-projected.y * 0.5 + 0.5) * height,
    visible: projected.z < 1,
  }
}

export function projectObjectToScreen(
  object: CSS3DObject,
  camera: THREE.Camera,
  width: number,
  height: number,
): { x: number; y: number; visible: boolean } {
  _worldPos.setFromMatrixPosition(object.matrixWorld)
  return projectWorldToScreen(_worldPos, camera, width, height)
}

export function drawClusterThreads(
  ctx: CanvasRenderingContext2D,
  cluster: ImageCluster | null,
  objectById: Map<string, CSS3DObject>,
  camera: THREE.Camera,
  width: number,
  height: number,
  settings: LinkClusterSettings,
): void {
  ctx.clearRect(0, 0, width, height)
  if (!settings.enabled || !cluster) return

  ctx.strokeStyle = settings.threadColor
  ctx.lineWidth = settings.threadThickness
  ctx.lineCap = 'round'

  const anchor = objectById.get(cluster.anchorId)
  if (!anchor) return

  const anchorPoint = projectObjectToScreen(anchor, camera, width, height)
  if (!anchorPoint.visible) return

  const memberPoints: { x: number; y: number }[] = []

  for (const memberId of cluster.memberIds) {
    const obj = objectById.get(memberId)
    if (!obj) continue
    const point = projectObjectToScreen(obj, camera, width, height)
    if (!point.visible) continue
    memberPoints.push(point)

    ctx.beginPath()
    ctx.moveTo(anchorPoint.x, anchorPoint.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
  }

  for (let i = 0; i < memberPoints.length; i++) {
    for (let j = i + 1; j < memberPoints.length; j++) {
      ctx.globalAlpha = 0.35
      ctx.beginPath()
      ctx.moveTo(memberPoints[i].x, memberPoints[i].y)
      ctx.lineTo(memberPoints[j].x, memberPoints[j].y)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }
}

export function setClusterHighlight(
  objectById: Map<string, CSS3DObject>,
  cluster: ImageCluster | null,
  enabled: boolean,
): void {
  const linked =
    enabled && cluster ? clusterMemberIds(cluster) : new Set<string>()

  objectById.forEach((obj, id) => {
    const img = obj.userData.img as HTMLImageElement | undefined
    if (!img) return
    if (linked.has(id)) {
      img.style.outline = '1.5px solid rgba(0,0,0,0.25)'
      img.style.outlineOffset = '1px'
    } else {
      img.style.outline = 'none'
    }
  })
}
