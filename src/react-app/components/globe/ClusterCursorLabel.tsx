import { useMemo } from 'react'
import { useSequentialTypewriter } from '../../hooks/useSequentialTypewriter'
import './ClusterCursorLabel.css'

interface ClusterCursorLabelProps {
  title: string
  count: number
  x: number
  y: number
  visible: boolean
}

export function ClusterCursorLabel({
  title,
  count,
  x,
  y,
  visible,
}: ClusterCursorLabelProps) {
  const lines = useMemo(
    () => [title.toUpperCase(), `${count} IMAGES`],
    [title, count],
  )
  const values = useSequentialTypewriter(lines, visible)

  if (!visible) return null

  return (
    <div
      className="cluster-cursor-label"
      style={{ transform: `translate(calc(${x}px + 10px), calc(${y}px - 50%))` }}
      aria-hidden
    >
      <div className="cluster-cursor-label__text">
        <p>{values[0]}</p>
        <p>{values[1]}</p>
      </div>
    </div>
  )
}
