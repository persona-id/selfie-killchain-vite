import { useMemo } from 'react'
import { LayoutGroup, motion } from 'framer-motion'

import type { Complexity } from '../types/gallery'
import './StageNav.css'
import './ComplexityNav.css'

const FILL_TRANSITION = {
  layout: { duration: 0.42, ease: [0.33, 1, 0.68, 1] as const },
  opacity: { duration: 0.42, ease: [0.33, 1, 0.68, 1] as const },
}

const COMPLEXITY_ORDER: Complexity[] = ['Low', 'Moderate', 'High']

const COMPLEXITY_LABELS: Record<Complexity, string> = {
  Low: 'Low',
  Moderate: 'Moderate',
  High: 'High',
}

interface ComplexityNavProps {
  activeComplexity: Complexity | null
  onSelect: (complexity: Complexity) => void
  className?: string
  indicatorVisible?: boolean
}

export default function ComplexityNav({
  activeComplexity,
  onSelect,
  className,
  indicatorVisible = true,
}: ComplexityNavProps) {
  const navClassName = useMemo(
    () =>
      [
        'stage-nav',
        'stage-nav--sliding',
        indicatorVisible ? 'stage-nav--indicator-visible' : '',
      ]
        .filter(Boolean)
        .join(' '),
    [indicatorVisible],
  )

  return (
    <div className={['complexity-nav-wrap', className].filter(Boolean).join(' ')}>
      <span className="complexity-nav__label">Fraud Complexity</span>
      <LayoutGroup id="complexity-nav-fill">
        <nav className={navClassName} aria-label="Complexity level">
          <div className="stage-nav__track">
          {COMPLEXITY_ORDER.map((complexity, index) => {
            const isActive = complexity === activeComplexity
            const nextComplexity = COMPLEXITY_ORDER[index + 1]
            const connectorActive =
              isActive && nextComplexity === activeComplexity

            return (
              <div key={complexity} className="stage-nav__segment">
                <button
                  type="button"
                  className={`stage-nav__pill stage-nav__pill--${isActive ? 'active' : 'inactive'}`}
                  aria-current={isActive ? 'step' : undefined}
                  onClick={() => onSelect(complexity)}
                >
                  {indicatorVisible && isActive && (
                    <motion.span
                      layoutId="complexity-nav-fill"
                      className="stage-nav__pill-fill"
                      aria-hidden
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={FILL_TRANSITION}
                    />
                  )}
                  <span className="stage-nav__pill-label">{COMPLEXITY_LABELS[complexity]}</span>
                </button>
                {index < COMPLEXITY_ORDER.length - 1 && (
                  <span
                    className={`stage-nav__connector${
                      connectorActive ? ' stage-nav__connector--active' : ''
                    }`}
                    aria-hidden
                  />
                )}
              </div>
            )
          })}
          </div>
        </nav>
      </LayoutGroup>
    </div>
  )
}
