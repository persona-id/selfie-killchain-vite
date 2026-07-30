import type { CSSProperties } from 'react'

import './MenuToggleDots.css'

interface MenuToggleDotsProps {
  open: boolean
}

const MENU_TOGGLE_VIEWBOX = 31
const MENU_TOGGLE_SIZE = 28
const MENU_DOT_RADIUS = (1.5 * MENU_TOGGLE_VIEWBOX) / MENU_TOGGLE_SIZE

const DOTS = [
  { x: 4, y: 4, closeOpacity: 1 },
  { x: 13.5, y: 4, closeOpacity: 0.2 },
  { x: 23, y: 4, closeOpacity: 1 },
  { x: 4, y: 13.5, closeOpacity: 0.2 },
  { x: 13.5, y: 13.5, closeOpacity: 1 },
  { x: 23, y: 13.5, closeOpacity: 0.2 },
  { x: 4, y: 23, closeOpacity: 1 },
  { x: 13.5, y: 23, closeOpacity: 0.2 },
  { x: 23, y: 23, closeOpacity: 1 },
] as const

export default function MenuToggleDots({ open }: MenuToggleDotsProps) {
  return (
    <span
      className={`menu-toggle-dots${open ? ' menu-toggle-dots--open' : ''}`}
      aria-hidden
    >
      <svg
        className="menu-toggle-dots__svg"
        width={MENU_TOGGLE_SIZE}
        height={MENU_TOGGLE_SIZE}
        viewBox={`0 0 ${MENU_TOGGLE_VIEWBOX} ${MENU_TOGGLE_VIEWBOX}`}
        fill="none"
      >
        {DOTS.map((dot, index) => (
          <circle
            key={index}
            className="menu-toggle-dots__dot"
            cx={dot.x}
            cy={dot.y}
            r={MENU_DOT_RADIUS}
            fill="currentColor"
            style={{ '--close-opacity': dot.closeOpacity } as CSSProperties}
          />
        ))}
      </svg>
    </span>
  )
}
