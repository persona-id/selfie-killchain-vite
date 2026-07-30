import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

import type { DeconstructEdge, DeconstructNode, ObservedPath } from '../../types/killchain'
import {
  buildDeconstructLayout,
  buildDeconstructEdgePath,
  DECONSTRUCT_AUTO_FIT_SHRINK,
  FIT_TO_SCREEN_ZOOM_FACTOR,
  getFitToScreenView,
} from '../../utils/deconstructLayout'
import { getDeconstructNodeDescriptor } from '../../utils/deconstructDescriptors'
import {
  buildRevealSchedule,
  DECONSTRUCT_DOTS_START_DELAY_MS,
  DECONSTRUCT_NODE_REVEAL_DELAY_MS,
  getIntroCompleteDelayAfterNodesReadyMs,
} from '../../utils/deconstructIntro'
import {
  markDeconstructIntroPlayed,
} from '../../utils/deconstructIntroState'
import DeconstructAnimatedEdge from './DeconstructAnimatedEdge'
import DeconstructNodeCard from './DeconstructNode'

import './DeconstructGraph.css'

export interface DeconstructGraphHandle {
  fitToScreen: () => void
}

interface DeconstructGraphProps {
  path: ObservedPath | null
  resultImageUrl?: string | null
  introSessionKey?: string
  skipIntro?: boolean
  selectedNodeId: string | null
  onSelectNode: (node: DeconstructNode) => void
  onCanvasClick?: () => void
  onHintChange?: (hint: { primary: string; secondary: string | null }) => void
  onIntroComplete?: () => void
  resultFocusActive?: boolean
}

const DRAG_THRESHOLD_PX = 6
const MIN_ZOOM = 0.35
const MAX_ZOOM = 2.5
const ZOOM_STEP = 1.1
const DOT_SIZE_PX = 1.5
const DOT_GRID_PX = 128

function clampZoom(scale: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale))
}

function buildEdgePath(
  nodes: DeconstructNode[],
  edge: DeconstructEdge,
): { path: string; junctions: { x: number; y: number }[] } | null {
  return buildDeconstructEdgePath(nodes, edge)
}

const DeconstructGraph = forwardRef<DeconstructGraphHandle, DeconstructGraphProps>(function DeconstructGraph(
  {
  path,
  resultImageUrl,
  introSessionKey = '',
  skipIntro = false,
  selectedNodeId,
  onSelectNode,
  onCanvasClick,
  onHintChange,
  onIntroComplete,
  resultFocusActive = false,
  },
  ref,
) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [hoveredNode, setHoveredNode] = useState<DeconstructNode | null>(null)
  const [canvasHovered, setCanvasHovered] = useState(false)
  const [dotsRevealed, setDotsRevealed] = useState(skipIntro)
  const [nodesReady, setNodesReady] = useState(skipIntro)
  const reduceMotion = useReducedMotion()
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(
    null,
  )
  const pointerRef = useRef<{ startX: number; startY: number; onNode: boolean } | null>(null)
  const viewRef = useRef({ pan: { x: 0, y: 0 }, scale: 1 })
  viewRef.current = { pan, scale }

  const { nodes, edges, canvas } = useMemo(() => {
    if (!path) return { nodes: [], edges: [], canvas: { width: 1900, height: 420 } }
    return buildDeconstructLayout(path, resultImageUrl)
  }, [path, resultImageUrl])

  const revealSchedule = useMemo(
    () => buildRevealSchedule(nodes, edges),
    [edges, nodes],
  )

  const introCompleteFiredRef = useRef(false)

  const fitToViewport = useCallback(
    (options?: { shrinkFactor?: number; padding?: number }) => {
      const viewport = viewportRef.current
      if (!viewport || nodes.length === 0) return
      const { pan: nextPan, scale: nextScale } = getFitToScreenView(
        nodes,
        viewport.clientWidth,
        viewport.clientHeight,
        {
          maxScale: 1,
          padding: options?.padding ?? 40,
          shrinkFactor: options?.shrinkFactor ?? DECONSTRUCT_AUTO_FIT_SHRINK,
        },
      )
      setScale(clampZoom(nextScale))
      setPan(nextPan)
    },
    [nodes],
  )

  const fitToScreen = useCallback(() => {
    fitToViewport({ shrinkFactor: FIT_TO_SCREEN_ZOOM_FACTOR, padding: 48 })
  }, [fitToViewport])

  useImperativeHandle(ref, () => ({ fitToScreen }), [fitToScreen])

  useLayoutEffect(() => {
    fitToViewport()
  }, [fitToViewport, path?.id, resultImageUrl])

  useEffect(() => {
    if (!path) return

    introCompleteFiredRef.current = false

    if (reduceMotion || skipIntro) {
      setDotsRevealed(true)
      setNodesReady(true)
      return
    }

    setDotsRevealed(false)
    setNodesReady(false)
    const dotsStartTimer = window.setTimeout(() => {
      requestAnimationFrame(() => setDotsRevealed(true))
    }, DECONSTRUCT_DOTS_START_DELAY_MS)
    const nodesTimer = window.setTimeout(() => {
      requestAnimationFrame(() => setNodesReady(true))
    }, DECONSTRUCT_NODE_REVEAL_DELAY_MS)

    return () => {
      window.clearTimeout(dotsStartTimer)
      window.clearTimeout(nodesTimer)
    }
  }, [path?.id, reduceMotion, resultImageUrl, skipIntro])

  useEffect(() => {
    if (!path || !nodesReady || !onIntroComplete || introCompleteFiredRef.current) return

    const completeIntro = () => {
      if (introCompleteFiredRef.current) return
      introCompleteFiredRef.current = true
      if (!skipIntro) markDeconstructIntroPlayed(introSessionKey)
      onIntroComplete()
    }

    if (reduceMotion || skipIntro) {
      completeIntro()
      return
    }

    const timer = window.setTimeout(
      completeIntro,
      getIntroCompleteDelayAfterNodesReadyMs(revealSchedule, nodes, edges),
    )
    return () => window.clearTimeout(timer)
  }, [edges, introSessionKey, nodes, nodesReady, onIntroComplete, path, reduceMotion, revealSchedule, skipIntro])

  const handleCanvasDismiss = useCallback(() => {
    onCanvasClick?.()
  }, [onCanvasClick])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const observer = new ResizeObserver(() => {
      fitToViewport()
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [fitToViewport, nodes])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = viewport.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top
      const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP
      const { pan: currentPan, scale: currentScale } = viewRef.current
      const nextScale = clampZoom(currentScale * factor)
      const worldX = (mouseX - currentPan.x) / currentScale
      const worldY = (mouseY - currentPan.y) / currentScale

      setScale(nextScale)
      setPan({
        x: mouseX - worldX * nextScale,
        y: mouseY - worldY * nextScale,
      })
    }

    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
  }, [path])

  const edgeData = useMemo(
    () =>
      edges
        .map((edge) => ({ edge, ...buildEdgePath(nodes, edge) }))
        .filter((e): e is { edge: DeconstructEdge; path: string; junctions: { x: number; y: number }[] } =>
          e.path !== null,
        ),
    [edges, nodes],
  )

  const orderedNodes = useMemo(
    () => [...nodes].sort((a, b) => a.x - b.x || a.y - b.y),
    [nodes],
  )

  const orderedEdges = useMemo(() => {
    const nodeX = new Map(nodes.map((node) => [node.id, node.x]))
    return [...edgeData].sort((a, b) => {
      const leftAX = Math.min(
        nodeX.get(a.edge.from) ?? 0,
        nodeX.get(a.edge.to) ?? 0,
      )
      const leftBX = Math.min(
        nodeX.get(b.edge.from) ?? 0,
        nodeX.get(b.edge.to) ?? 0,
      )
      return leftAX - leftBX
    })
  }, [edgeData, nodes])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      const target = e.target as HTMLElement

      const onNode = Boolean(target.closest('.deconstruct-node'))
      pointerRef.current = { startX: e.clientX, startY: e.clientY, onNode }

      if (onNode) return

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        panX: pan.x,
        panY: pan.y,
      }
      viewportRef.current?.setPointerCapture(e.pointerId)
    },
    [pan],
  )

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy })
  }, [])

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const pointer = pointerRef.current
      if (pointer && !pointer.onNode) {
        const dx = e.clientX - pointer.startX
        const dy = e.clientY - pointer.startY
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
          handleCanvasDismiss()
        }
      }

      pointerRef.current = null
      dragRef.current = null
      viewportRef.current?.releasePointerCapture(e.pointerId)
    },
    [handleCanvasDismiss],
  )

  useEffect(() => {
    if (!onHintChange || !path) return
    const primary =
      canvasHovered && !hoveredNode
        ? 'Scroll to zoom · drag to move'
        : 'Click any part of the flow to view details'
    const secondary = hoveredNode ? getDeconstructNodeDescriptor(hoveredNode) : null
    onHintChange({ primary, secondary })
  }, [canvasHovered, hoveredNode, onHintChange, path])

  if (!path) {
    return (
      <div className="deconstruct-graph deconstruct-graph--empty">
        <p>Select a path from the Globe view or use the menu to navigate with a path parameter.</p>
      </div>
    )
  }

  const dotSize = DOT_SIZE_PX * scale
  const dotGrid = DOT_GRID_PX * scale

  return (
    <div
      ref={viewportRef}
      className={`deconstruct-graph__viewport${
        resultFocusActive ? ' deconstruct-graph--result-focus' : ''
      }`}
      onPointerEnter={() => setCanvasHovered(true)}
      onPointerLeave={() => {
        setCanvasHovered(false)
        setHoveredNode(null)
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className={`deconstruct-graph__dots${
          dotsRevealed ? ' deconstruct-graph__dots--revealed' : ''
        }${skipIntro ? ' deconstruct-graph__dots--instant' : ''}`}
        style={{
          backgroundImage: `radial-gradient(circle, #000 ${dotSize}px, transparent ${dotSize}px)`,
          backgroundSize: `${dotGrid}px ${dotGrid}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
        aria-hidden
      />
      <div
        className="deconstruct-graph__canvas"
        style={{
          width: canvas.width,
          height: canvas.height,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          pointerEvents: nodesReady ? 'auto' : 'none',
        }}
      >
        <svg
          className="deconstruct-graph__edges"
          width={canvas.width}
          height={canvas.height}
          aria-hidden
        >
          {orderedEdges.map(({ edge, path: d, junctions }, index) => (
            <DeconstructAnimatedEdge
              key={`${edge.from}-${edge.to}`}
              path={d}
              edgeIndex={index}
              revealDelay={revealSchedule.edgeDelays.get(`${edge.from}->${edge.to}`) ?? 0}
              active={nodesReady}
              skipIntro={skipIntro}
              resultFocusActive={resultFocusActive}
              junctions={junctions}
            />
          ))}
        </svg>
        <div className="deconstruct-graph__nodes" key={path?.id ?? 'none'}>
          {orderedNodes.map((node) => (
            <DeconstructNodeCard
              key={node.id}
              node={node}
              entranceDelay={revealSchedule.nodeDelays.get(node.id) ?? 0}
              entranceActive={nodesReady}
              skipEntrance={skipIntro}
              selected={selectedNodeId === node.id || selectedNodeId === node.techniqueId || (selectedNodeId === 'result' && node.isResult)}
              onSelect={onSelectNode}
              onHoverStart={() => {
                setCanvasHovered(false)
                setHoveredNode(node)
              }}
              onHoverEnd={() => {
                setHoveredNode(null)
                setCanvasHovered(true)
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
})

export default DeconstructGraph
