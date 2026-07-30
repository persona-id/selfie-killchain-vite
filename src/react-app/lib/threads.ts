import * as THREE from 'three'
import type { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
import type { GalleryItem } from '../types/gallery'
import type { LinkClusterSettings } from '../types/gallery'
import type { ClusterBridge } from './clusterLayout'

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

export function drawLayoutClusterThreads(
  ctx: CanvasRenderingContext2D,
  clusters: ImageCluster[],
  objectById: Map<string, CSS3DObject>,
  camera: THREE.Camera,
  width: number,
  height: number,
  bridges: ClusterBridge[] = [],
  color = '#94a3b8',
  thickness = 0.65,
  bridgeColor = '#cbd5e1',
  lineOpacity = 0.55,
  bridgeCentersByAnchorId: Map<string, THREE.Vector3> = new Map(),
): void {
  ctx.clearRect(0, 0, width, height)
  if (clusters.length === 0) return

  ctx.lineCap = 'round'
  const bridgeAlpha = lineOpacity * 0.65
  const memberAlpha = lineOpacity
  const meshAlpha = lineOpacity * 0.32

  for (const bridge of bridges) {
    const fromCenter = bridgeCentersByAnchorId.get(bridge.fromId)
    const toCenter = bridgeCentersByAnchorId.get(bridge.toId)
    let a = fromCenter
      ? projectWorldToScreen(fromCenter, camera, width, height)
      : null
    let b = toCenter
      ? projectWorldToScreen(toCenter, camera, width, height)
      : null

    if (!a || !b) {
      const from = objectById.get(bridge.fromId)
      const to = objectById.get(bridge.toId)
      if (!from || !to) continue
      a = projectObjectToScreen(from, camera, width, height)
      b = projectObjectToScreen(to, camera, width, height)
    }

    if (!a.visible && !b.visible) continue
    ctx.strokeStyle = bridgeColor
    ctx.lineWidth = Math.max(0.35, thickness * 0.7)
    ctx.globalAlpha = bridgeAlpha
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }

  ctx.strokeStyle = color
  ctx.lineWidth = thickness

  for (const cluster of clusters) {
    const anchor = objectById.get(cluster.anchorId)
    if (!anchor) continue

    const anchorPoint = projectObjectToScreen(anchor, camera, width, height)
    if (!anchorPoint.visible) continue

    const memberPoints: { x: number; y: number }[] = []

    for (const memberId of cluster.memberIds) {
      const obj = objectById.get(memberId)
      if (!obj) continue
      const point = projectObjectToScreen(obj, camera, width, height)
      if (!point.visible) continue
      memberPoints.push(point)

      ctx.globalAlpha = memberAlpha
      ctx.beginPath()
      ctx.moveTo(anchorPoint.x, anchorPoint.y)
      ctx.lineTo(point.x, point.y)
      ctx.stroke()
    }

    for (let i = 0; i < memberPoints.length; i++) {
      for (let j = i + 1; j < memberPoints.length; j++) {
        ctx.globalAlpha = meshAlpha
        ctx.beginPath()
        ctx.moveTo(memberPoints[i].x, memberPoints[i].y)
        ctx.lineTo(memberPoints[j].x, memberPoints[j].y)
        ctx.stroke()
      }
    }
  }

  ctx.globalAlpha = 1
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
