import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import {
  DECONSTRUCT_EDGE_DRAW_S,
  DECONSTRUCT_NODE_EASE,
} from '../../utils/deconstructIntro'

interface DeconstructAnimatedEdgeProps {
  path: string
  edgeIndex: number
  revealDelay?: number
  active: boolean
  skipIntro?: boolean
  resultFocusActive?: boolean
  junctions: { x: number; y: number }[]
}

export default function DeconstructAnimatedEdge({
  path,
  edgeIndex,
  revealDelay = 0,
  active,
  skipIntro = false,
  resultFocusActive = false,
  junctions,
}: DeconstructAnimatedEdgeProps) {
  const reduceMotion = useReducedMotion()
  const pathRef = useRef<SVGPathElement>(null)
  const [pathLength, setPathLength] = useState(0)
  const [flowing, setFlowing] = useState(skipIntro && active)

  useLayoutEffect(() => {
    if (skipIntro && active) {
      setFlowing(true)
      return
    }
    setFlowing(false)
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength())
    }
  }, [active, path, skipIntro])

  useEffect(() => {
    if (!active || reduceMotion || skipIntro) {
      if (!(skipIntro && active)) setFlowing(false)
      return
    }

    const delayMs = revealDelay * 1000 + DECONSTRUCT_EDGE_DRAW_S * 1000
    const timer = window.setTimeout(() => setFlowing(true), delayMs)
    return () => window.clearTimeout(timer)
  }, [active, reduceMotion, revealDelay, skipIntro])

  const delay = active && !skipIntro ? revealDelay : 0
  const hiddenOffset = pathLength || 1
  const pathTransition =
    reduceMotion || skipIntro
      ? { duration: 0 }
      : { delay, duration: DECONSTRUCT_EDGE_DRAW_S, ease: DECONSTRUCT_NODE_EASE }

  const edgeOpacity = resultFocusActive ? 1 : 0.35

  return (
    <g>
      <motion.path
        ref={pathRef}
        className={`deconstruct-graph__edge-flow${
          flowing ? ' deconstruct-graph__edge-flow--flowing' : ''
        }${resultFocusActive ? ' deconstruct-graph__edge-flow--result-focus' : ''}`}
        d={path}
        fill="none"
        initial={reduceMotion || skipIntro ? false : { strokeDashoffset: hiddenOffset, opacity: 0 }}
        animate={{
          strokeDashoffset: active ? 0 : hiddenOffset,
          opacity: active ? edgeOpacity : 0,
        }}
        transition={pathTransition}
        style={{
          animationDelay: flowing ? `${edgeIndex * 0.65}s` : '0s',
          strokeDasharray: flowing || pathLength <= 0 ? undefined : pathLength,
        }}
      />
      {junctions.map((junction, junctionIndex) => (
        <motion.circle
          key={junctionIndex}
          className="deconstruct-graph__junction"
          cx={junction.x}
          cy={junction.y}
          r={6.4}
          initial={reduceMotion || skipIntro ? false : { opacity: 0 }}
          animate={{ opacity: active ? 1 : 0 }}
          transition={
            reduceMotion || skipIntro
              ? { duration: 0 }
              : {
                  delay:
                    delay +
                    (junctionIndex === 0 ? 0 : DECONSTRUCT_EDGE_DRAW_S * 0.55),
                  duration: 0.4,
                  ease: DECONSTRUCT_NODE_EASE,
                }
          }
        />
      ))}
    </g>
  )
}
