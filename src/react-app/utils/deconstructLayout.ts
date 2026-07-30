import { taxonomy } from '../data/taxonomyData'
import type { DeconstructEdge, DeconstructNode, ObservedPath, StageId } from '../types/killchain'
import { DECONSTRUCT_STAGE_ORDER } from './techniqueStage'

export const DECONSTRUCT_CANVAS_HEIGHT = 420
export const DECONSTRUCT_RESULT_NODE_ID = 'result'

const NODE_W = 422
const NODE_H = 113
const AR_SPACING = 141
const COLUMN_GAP = 97
const COLUMN_STRIDE = NODE_W + COLUMN_GAP
const RESULT_W = 262
const RESULT_IMAGE_W = 242
const RESULT_IMAGE_H = 238
const RESULT_GAP = 18
const RESULT_LABEL_H = 47
const RESULT_H = RESULT_IMAGE_H + RESULT_GAP + RESULT_LABEL_H
const CANVAS_PADDING_X = 48

/** @deprecated Use canvas size returned from buildDeconstructLayout */
export const DECONSTRUCT_CANVAS = { width: 1900, height: DECONSTRUCT_CANVAS_HEIGHT }

function getTechniqueName(techniqueId: string): string {
  for (const stage of taxonomy) {
    const tech = stage.techniques.find((t) => t.id === techniqueId)
    if (tech) return tech.name
  }
  return techniqueId
}

function getStandardColumnX(columnIndex: number): number {
  return columnIndex * COLUMN_STRIDE
}

/** Place the result node so its image anchor sits one column gap after the prior node. */
function getResultNodeX(previousColumnIndex: number): number {
  const previousRightEdge = getStandardColumnX(previousColumnIndex) + NODE_W
  const resultImageLeft = previousRightEdge + COLUMN_GAP
  return resultImageLeft - (RESULT_W - RESULT_IMAGE_W) / 2
}

function buildKillChainEdges(
  hasResultNode: boolean,
  dl: string | undefined,
  ar: string[],
  ac: string | undefined,
  ta: string | undefined,
): DeconstructEdge[] {
  const edges: DeconstructEdge[] = []

  if (hasResultNode && dl) {
    edges.push({ from: dl, to: DECONSTRUCT_RESULT_NODE_ID })
  }

  if (dl) {
    if (ar.length > 0) {
      for (const arId of ar) edges.push({ from: dl, to: arId })
    } else if (ac) {
      edges.push({ from: dl, to: ac })
    }
  }

  if (ac) {
    for (const arId of ar) edges.push({ from: arId, to: ac })
    if (ta) edges.push({ from: ac, to: ta })
  }

  return edges
}

export function getNodeAnchor(
  node: DeconstructNode,
  side: 'left' | 'right',
): { x: number; y: number } {
  if (node.isResult) {
    const imageX = node.x + (node.width - RESULT_IMAGE_W) / 2
    const y = node.y + RESULT_IMAGE_H / 2
    if (side === 'left') return { x: imageX, y }
    return { x: imageX + RESULT_IMAGE_W, y }
  }

  const y = node.y + node.height / 2
  if (side === 'left') return { x: node.x, y }
  return { x: node.x + node.width, y }
}

function getNodeVisualLeft(node: DeconstructNode): number {
  if (node.isResult) {
    return node.x + (node.width - RESULT_IMAGE_W) / 2
  }
  return node.x
}

export function buildDeconstructEdgePath(
  nodes: DeconstructNode[],
  edge: DeconstructEdge,
): { path: string; junctions: { x: number; y: number }[] } | null {
  const a = nodes.find((n) => n.id === edge.from)
  const b = nodes.find((n) => n.id === edge.to)
  if (!a || !b) return null

  const leftNode = getNodeVisualLeft(a) <= getNodeVisualLeft(b) ? a : b
  const rightNode = leftNode === a ? b : a
  const from = getNodeAnchor(leftNode, 'right')
  const to = getNodeAnchor(rightNode, 'left')
  const midX = (from.x + to.x) / 2

  return {
    path: `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`,
    junctions: [from, to],
  }
}

export function getNodesBounds(nodes: DeconstructNode[]): {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
} {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const node of nodes) {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x + node.width)
    maxY = Math.max(maxY, node.y + node.height)
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function getCenteredPan(
  nodes: DeconstructNode[],
  viewportWidth: number,
  viewportHeight: number,
  scale = 1,
): { x: number; y: number } {
  const bounds = getNodesBounds(nodes)
  if (bounds.width === 0 && bounds.height === 0) {
    return { x: 0, y: 0 }
  }

  return {
    x: (viewportWidth - bounds.width * scale) / 2 - bounds.minX * scale,
    y: (viewportHeight - bounds.height * scale) / 2 - bounds.minY * scale,
  }
}

export const FIT_TO_SCREEN_ZOOM_FACTOR = 0.84
/** Default auto-fit scale — slightly zoomed out from the tight viewport fit. */
export const DECONSTRUCT_AUTO_FIT_SHRINK = 0.935

export function getFitToScreenView(
  nodes: DeconstructNode[],
  viewportWidth: number,
  viewportHeight: number,
  options?: { padding?: number; maxScale?: number; shrinkFactor?: number },
): { pan: { x: number; y: number }; scale: number } {
  const padding = options?.padding ?? 48
  const maxScale = options?.maxScale ?? 2.5
  const shrinkFactor = options?.shrinkFactor ?? FIT_TO_SCREEN_ZOOM_FACTOR
  const bounds = getNodesBounds(nodes)

  if (bounds.width === 0 && bounds.height === 0) {
    return { pan: { x: 0, y: 0 }, scale: 1 }
  }

  const availableWidth = Math.max(viewportWidth - padding * 2, 1)
  const availableHeight = Math.max(viewportHeight - padding * 2, 1)
  const scale =
    Math.min(
      availableWidth / bounds.width,
      availableHeight / bounds.height,
      maxScale,
    ) * shrinkFactor
  const pan = getCenteredPan(nodes, viewportWidth, viewportHeight, scale)

  return { pan, scale }
}

function getCanvasSize(nodes: DeconstructNode[]): { width: number; height: number } {
  const bounds = getNodesBounds(nodes)
  return {
    width: Math.max(bounds.maxX + CANVAS_PADDING_X, 640),
    height: DECONSTRUCT_CANVAS_HEIGHT,
  }
}

export function buildDeconstructLayout(
  path: ObservedPath,
  resultImageUrl?: string | null,
): {
  nodes: DeconstructNode[]
  edges: DeconstructEdge[]
  canvas: { width: number; height: number }
} {
  const ta = path.techniques.find((t) => t.startsWith('TA-'))
  const ac = path.techniques.find((t) => t.startsWith('AC-'))
  const ar = path.techniques.filter((t) => t.startsWith('AR-'))
  const dl = path.techniques.find((t) => t.startsWith('DL-'))

  const stageTechnique: Partial<Record<StageId, string | string[]>> = {
    TA: ta,
    AC: ac,
    AR: ar,
    DL: dl,
  }

  const activeStages = DECONSTRUCT_STAGE_ORDER.filter((stage) => {
    const value = stageTechnique[stage]
    if (Array.isArray(value)) return value.length > 0
    return Boolean(value)
  })

  const nodes: DeconstructNode[] = []
  const flowCenterY = DECONSTRUCT_CANVAS_HEIGHT / 2
  const centerNodeY = flowCenterY - NODE_H / 2
  const resultY = flowCenterY - RESULT_IMAGE_H / 2
  const hasResultNode = Boolean(resultImageUrl)

  activeStages.forEach((stage, columnIndex) => {
    if (stage === 'TA' && ta) {
      nodes.push({
        id: ta,
        techniqueId: ta,
        name: getTechniqueName(ta),
        x: getStandardColumnX(columnIndex),
        y: centerNodeY,
        width: NODE_W,
        height: NODE_H,
      })
      return
    }

    if (stage === 'AC' && ac) {
      nodes.push({
        id: ac,
        techniqueId: ac,
        name: getTechniqueName(ac),
        x: getStandardColumnX(columnIndex),
        y: centerNodeY,
        width: NODE_W,
        height: NODE_H,
      })
      return
    }

    if (stage === 'AR' && ar.length > 0) {
      const arStackHeight = ar.length > 1 ? (ar.length - 1) * AR_SPACING + NODE_H : NODE_H
      const arStartY = flowCenterY - arStackHeight / 2
      const columnX = getStandardColumnX(columnIndex)
      for (const [index, arId] of ar.entries()) {
        nodes.push({
          id: arId,
          techniqueId: arId,
          name: getTechniqueName(arId),
          x: columnX,
          y: arStartY + index * AR_SPACING,
          width: NODE_W,
          height: NODE_H,
        })
      }
      return
    }

    if (stage === 'DL' && dl) {
      nodes.push({
        id: dl,
        techniqueId: dl,
        name: getTechniqueName(dl),
        x: getStandardColumnX(columnIndex),
        y: centerNodeY,
        width: NODE_W,
        height: NODE_H,
      })
    }
  })

  if (hasResultNode && resultImageUrl) {
    const resultColumnIndex = Math.max(0, activeStages.length - 1)
    nodes.push({
      id: DECONSTRUCT_RESULT_NODE_ID,
      techniqueId: 'result',
      name: 'Result',
      x: getResultNodeX(resultColumnIndex),
      y: resultY,
      width: RESULT_W,
      height: RESULT_H,
      isResult: true,
      imageUrl: resultImageUrl,
    })
  }

  const edges = buildKillChainEdges(hasResultNode, dl, ar, ac, ta)

  return {
    nodes,
    edges,
    canvas: getCanvasSize(nodes),
  }
}
