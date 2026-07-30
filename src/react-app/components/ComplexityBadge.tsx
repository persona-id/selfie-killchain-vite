import { motion } from 'framer-motion'
import type { Complexity } from '../types/gallery'

export const ICON_SIZE = 34
const CENTER = ICON_SIZE / 2
const GRID_STEP = 9
const DOT_RADIUS = 2.1465
const GRID_OFFSETS = [-1.5, -0.5, 0.5, 1.5]

const POSITIONS = GRID_OFFSETS.flatMap((rowOffset) =>
  GRID_OFFSETS.map((colOffset) => ({
    cx: CENTER + colOffset * GRID_STEP,
    cy: CENTER + rowOffset * GRID_STEP,
  })),
)

type DotSpec = {
  fill: string
  opacity: number
}

type Theme = {
  pill: string
  dots: DotSpec[]
}

function seeded(index: number): number {
  const x = Math.sin(index * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

const MODERATE_DOT_COLORS = [
  'rgb(255, 160, 94)',
  'rgb(255, 160, 95)',
  'rgb(255, 176, 112)',
  'rgb(255, 160, 95)',
  'rgb(255, 162, 96)',
  'rgb(255, 184, 126)',
  'rgb(255, 162, 96)',
  'rgb(255, 160, 95)',
  'rgb(255, 160, 95)',
  'rgb(255, 176, 112)',
  'rgb(255, 162, 96)',
  'rgb(255, 160, 95)',
  'rgb(255, 180, 120)',
  'rgb(255, 160, 94)',
  'rgb(255, 162, 96)',
  'rgb(255, 160, 94)',
] as const

/** 4×4 grid, row-major. Hidden + full/reduced opacities match moderate reference. */
const MODERATE_OPACITY = [
  0, 0.32, 0, 0.32,
  1, 0.32, 1, 1,
  1, 1, 0.32, 1,
  0.32, 0, 0.32, 0,
] as const

function moderateDots(): DotSpec[] {
  return MODERATE_DOT_COLORS.map((fill, index) => ({
    fill,
    opacity: MODERATE_OPACITY[index],
  }))
}

/** 4×4 grid, row-major. Corner dots reduced; center block full. */
const HIGH_OPACITY = [
  0.32, 1, 1, 0.32,
  1, 1, 1, 1,
  1, 1, 1, 1,
  0.32, 1, 1, 0.32,
] as const

function highDots(): DotSpec[] {
  const base = [255, 96, 96]
  return POSITIONS.map((_, i) => {
    const mix = 0.94 + seeded(i + 11) * 0.06
    return {
      fill: `rgb(${Math.round(base[0] * mix)}, ${Math.round(base[1] * mix)}, ${Math.round(base[2] * mix)})`,
      opacity: HIGH_OPACITY[i],
    }
  })
}

const LOW_OPACITY = [
  0.14, 0.3, 0.36, 0.16, 0.32, 0.58, 0.72, 0.4, 0.38, 0.8, 1, 0.52, 0.16, 0.34,
  0.44, 0.2,
]

function lowDots(): DotSpec[] {
  const base = [102, 220, 158]
  return POSITIONS.map((_, i) => {
    const row = Math.floor(i / 4)
    const col = i % 4
    const dist = Math.hypot(row - 1.5, col - 1.5)
    const mix = 0.72 + (1 - dist / 2.2) * 0.28 + seeded(i) * 0.08
    return {
      fill: `rgb(${Math.round(base[0] * mix)}, ${Math.round(base[1] * mix)}, ${Math.round(base[2] * mix)})`,
      opacity: LOW_OPACITY[i],
    }
  })
}

const THEMES: Record<Complexity, Theme> = {
  Low: { pill: '#2b2f2e', dots: lowDots() },
  Moderate: { pill: '#2c2926', dots: moderateDots() },
  High: { pill: '#2c2424', dots: highDots() },
}

function ComplexityDotIcon({
  theme,
  animateKey,
}: {
  theme: Theme
  animateKey?: string
}) {
  return (
    <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center">
      <svg
        width={ICON_SIZE}
        height={ICON_SIZE}
        viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`}
        aria-hidden
      >
        {theme.dots.map((dot, index) => {
          const { cx, cy } = POSITIONS[index]
          const dist = Math.hypot(cx - CENTER, cy - CENTER)
          return (
            <motion.circle
              key={`${animateKey ?? 'dots'}-${index}`}
              cx={cx}
              cy={cy}
              r={DOT_RADIUS}
              fill={dot.fill}
              initial={{ opacity: 0 }}
              animate={{ opacity: dot.opacity }}
              transition={{
                delay: dist * 0.024,
                duration: 0.46,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          )
        })}
      </svg>
    </span>
  )
}

type ComplexityBadgeProps = {
  complexity: Complexity
  animateKey?: string
}

export function ComplexityIcon({ complexity, animateKey }: ComplexityBadgeProps) {
  return <ComplexityDotIcon theme={THEMES[complexity]} animateKey={animateKey} />
}

export function ComplexityBadge({ complexity, animateKey }: ComplexityBadgeProps) {
  const theme = THEMES[complexity]

  return (
    <span
      className="font-monument flex h-[95px] w-[280px] items-center justify-center gap-[14px] rounded-[36px]"
      style={{ backgroundColor: theme.pill }}
    >
      <ComplexityDotIcon theme={theme} animateKey={animateKey} />
      <span className="text-[14px] leading-none tracking-[0.01em] text-[#d8d8d8]">
        {complexity} Complexity
      </span>
    </span>
  )
}

export function TagDotIcon() {
  const dots = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 0],
    [2, 1],
  ]
  const dot = 1.3
  const gap = 2.1
  const w = 2 * gap + dot
  const h = 1 * gap + dot

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0">
      {dots.map(([col, row], index) => (
        <motion.circle
          key={index}
          cx={col * gap + dot / 2}
          cy={row * gap + dot / 2}
          r={dot / 2}
          fill="#5a5a5a"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          transition={{ delay: 0.28 + index * 0.04, duration: 0.32 }}
        />
      ))}
    </svg>
  )
}
