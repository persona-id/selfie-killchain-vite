import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'
import {
  LEFT_SHELL_DURATION_MS,
  SHELL_ENTRANCE_LEFT,
} from '../constants/shellMotion'
import { useChromeEntranceReady } from '../hooks/useChromeEntranceReady'
import './KillchainEdgeShell.css'

interface KillchainEdgeShellProps {
  side: 'left'
  expanded: boolean
  header: ReactNode
  children?: ReactNode
  className?: string
  fadeIn?: boolean
  entranceReady?: boolean
}

function useLeftBodyMount(expanded: boolean, hasChildren: boolean) {
  const [mounted, setMounted] = useState(expanded && hasChildren)

  useEffect(() => {
    if (!hasChildren) {
      setMounted(false)
      return
    }

    if (expanded) {
      setMounted(true)
      return
    }

    const timer = window.setTimeout(() => setMounted(false), LEFT_SHELL_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [expanded, hasChildren])

  return mounted
}

export default function KillchainEdgeShell({
  expanded,
  header,
  children,
  className,
  fadeIn = true,
  entranceReady: entranceReadyProp,
}: KillchainEdgeShellProps) {
  const reduceMotion = useReducedMotion()
  const entranceReadyFromHook = useChromeEntranceReady('local')
  const entranceReady = entranceReadyProp ?? entranceReadyFromHook
  const isShellVisible = !fadeIn || entranceReady
  const hasChildren = Boolean(children)
  const bodyMounted = useLeftBodyMount(expanded, hasChildren)

  const shellClassName = [
    'killchain-edge-shell',
    'killchain-edge-shell--left',
    expanded ? 'killchain-edge-shell--expanded' : 'killchain-edge-shell--condensed',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const shellProps = {
    className: `${shellClassName}${isShellVisible ? ' killchain-edge-shell--visible' : ''}`,
  }

  const shellInner = (
    <>
      <div className="killchain-edge-shell__header">{header}</div>
      {bodyMounted && children ? (
        <div className="killchain-edge-shell__body">{children}</div>
      ) : null}
    </>
  )

  if (fadeIn && !reduceMotion) {
    const entrance = SHELL_ENTRANCE_LEFT
    return (
      <div {...shellProps}>
        <motion.div
          className="killchain-edge-shell__entrance"
          initial={{ ...entrance.initial, pointerEvents: 'none' }}
          animate={
            isShellVisible
              ? { ...entrance.animate, pointerEvents: 'auto' }
              : { opacity: 0, pointerEvents: 'none' }
          }
          transition={entrance.transition}
        >
          {shellInner}
        </motion.div>
      </div>
    )
  }

  if (fadeIn && reduceMotion) {
    return (
      <div {...shellProps}>
        <div
          className="killchain-edge-shell__entrance"
          style={{
            opacity: isShellVisible ? 1 : 0,
            pointerEvents: isShellVisible ? 'auto' : 'none',
          }}
        >
          {shellInner}
        </div>
      </div>
    )
  }

  return (
    <div {...shellProps}>
      {shellInner}
    </div>
  )
}
