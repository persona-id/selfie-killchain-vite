import type { DeconstructEdge, DeconstructNode } from '../types/killchain'

export const DECONSTRUCT_MENU_FADE_MS = 900
export const DECONSTRUCT_DOTS_FADE_MS = 1500
export const DECONSTRUCT_DOTS_START_DELAY_MS = DECONSTRUCT_MENU_FADE_MS
/** Start node reveal while dots are still fading — avoid a long dead gap. */
export const DECONSTRUCT_NODE_REVEAL_AFTER_DOTS_MS = 380
export const DECONSTRUCT_NODE_REVEAL_DELAY_MS =
  DECONSTRUCT_DOTS_START_DELAY_MS + DECONSTRUCT_NODE_REVEAL_AFTER_DOTS_MS

export const DECONSTRUCT_PATH_STEP_S = 0.22
export const DECONSTRUCT_NODE_FADE_S = 0.85
export const DECONSTRUCT_EDGE_DRAW_S = 0.75
export const DECONSTRUCT_NODE_EASE = [0.16, 1, 0.3, 1] as const

export type RevealSchedule = {
  nodeDelays: Map<string, number>
  edgeDelays: Map<string, number>
}

function edgeKey(edge: DeconstructEdge) {
  return `${edge.from}->${edge.to}`
}

function getColumnsLeftToRight(nodes: DeconstructNode[]) {
  const columnXs = [...new Set(nodes.map((node) => node.x))].sort((a, b) => a - b)
  return columnXs.map((x) => nodes.filter((node) => node.x === x))
}

/** Reveal nodes left-to-right across visual columns, then connectors, ending on the image. */
export function buildRevealSchedule(
  nodes: DeconstructNode[],
  edges: DeconstructEdge[],
): RevealSchedule {
  const nodeDelays = new Map<string, number>()
  const edgeDelays = new Map<string, number>()
  if (nodes.length === 0) return { nodeDelays, edgeDelays }

  const columns = getColumnsLeftToRight(nodes)
  let columnDelay = 0

  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    for (const node of columns[columnIndex]) {
      nodeDelays.set(node.id, columnDelay)
    }

    const nextColumn = columns[columnIndex + 1]
    if (!nextColumn) break

    const currentIds = new Set(columns[columnIndex].map((node) => node.id))
    const nextIds = new Set(nextColumn.map((node) => node.id))
    const bridgingEdges = edges.filter(
      (edge) =>
        (currentIds.has(edge.from) && nextIds.has(edge.to)) ||
        (currentIds.has(edge.to) && nextIds.has(edge.from)),
    )

    const edgeDelay = columnDelay + DECONSTRUCT_NODE_FADE_S
    for (const edge of bridgingEdges) {
      edgeDelays.set(edgeKey(edge), edgeDelay)
    }

    columnDelay = edgeDelay + DECONSTRUCT_EDGE_DRAW_S
  }

  for (const edge of edges) {
    const key = edgeKey(edge)
    if (edgeDelays.has(key)) continue
    const fromDelay = nodeDelays.get(edge.from)
    if (fromDelay !== undefined) {
      edgeDelays.set(key, fromDelay + DECONSTRUCT_NODE_FADE_S)
    }
  }

  return { nodeDelays, edgeDelays }
}

export function getNodeRevealDelay(index: number): number {
  if (index <= 0) return 0
  return getEdgeRevealDelay(index - 1) + DECONSTRUCT_EDGE_DRAW_S
}

export function getEdgeRevealDelay(index: number): number {
  return getNodeRevealDelay(index) + DECONSTRUCT_NODE_FADE_S
}

/** Ms from `nodesReady` until the last entrance animation (node or edge) finishes. */
export function getIntroCompleteDelayAfterNodesReadyMs(
  schedule: RevealSchedule,
  nodes: DeconstructNode[],
  edges: DeconstructEdge[] = [],
) {
  let maxEnd = 0
  for (const node of nodes) {
    const delay = schedule.nodeDelays.get(node.id) ?? 0
    maxEnd = Math.max(maxEnd, delay + DECONSTRUCT_NODE_FADE_S)
  }
  for (const edge of edges) {
    const delay = schedule.edgeDelays.get(edgeKey(edge)) ?? 0
    maxEnd = Math.max(maxEnd, delay + DECONSTRUCT_EDGE_DRAW_S)
  }
  return maxEnd * 1000
}
