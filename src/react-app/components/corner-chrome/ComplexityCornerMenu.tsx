import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'

import type { Complexity } from '../../types/gallery'
import { SETTINGS_MENU_ENTRANCE } from '../../constants/shellMotion'
import {
  UTILITY_MENU_CASCADE_STAGGER_MS,
  UTILITY_MENU_CLOSE_MS,
  UTILITY_MENU_TRANSITION_MS,
} from '../../constants/utilityMenuMotion'
import './ComplexityCornerMenu.css'
import { CornerMenuIcon } from './CornerMenuIcons'

const COMPLEXITY_ORDER: Complexity[] = ['High', 'Moderate', 'Low']

const ITEM_TRANSITION = {
  duration: 0.32,
  ease: [0.33, 1, 0.68, 1] as const,
}

type ComplexityMenuState = 'idle' | 'opening' | 'open' | 'closing'

function useComplexityMenuState() {
  const [state, setState] = useState<ComplexityMenuState>('idle')

  useEffect(() => {
    if (state === 'opening') {
      const timer = window.setTimeout(() => setState('open'), UTILITY_MENU_TRANSITION_MS)
      return () => window.clearTimeout(timer)
    }

    if (state === 'closing') {
      const timer = window.setTimeout(() => setState('idle'), UTILITY_MENU_CLOSE_MS)
      return () => window.clearTimeout(timer)
    }
  }, [state])

  const toggle = useCallback(() => {
    setState((current) => {
      if (current === 'idle') return 'opening'
      if (current === 'opening' || current === 'open') return 'closing'
      return current
    })
  }, [])

  const close = useCallback(() => {
    setState((current) => {
      if (current === 'opening' || current === 'open') return 'closing'
      return current
    })
  }, [])

  return {
    state,
    toggle,
    close,
    showList: state === 'open',
    triggerLocked: state !== 'idle',
  }
}

interface ComplexityCornerMenuProps {
  activeComplexity: Complexity | null
  onSelect: (complexity: Complexity) => void
  entranceReady?: boolean
  hidden?: boolean
}

export function ComplexityCornerMenu({
  activeComplexity,
  onSelect,
  entranceReady = true,
  hidden = false,
}: ComplexityCornerMenuProps) {
  const { state, toggle, close, showList, triggerLocked } = useComplexityMenuState()
  const iconOpen = state === 'opening' || state === 'open'
  const visible = entranceReady && !hidden

  return (
    <motion.div
      className="complexity-corner"
      initial={SETTINGS_MENU_ENTRANCE.initial}
      animate={visible ? SETTINGS_MENU_ENTRANCE.animate : { opacity: 0 }}
      transition={SETTINGS_MENU_ENTRANCE.transition}
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
    >
      <div className="complexity-corner__cluster">
        <AnimatePresence initial={false}>
          {showList ? (
            <motion.div
              key="complexity-list"
              className="complexity-corner__list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {COMPLEXITY_ORDER.map((complexity, index) => {
                const isActive = complexity === activeComplexity
                const staggerIndex = COMPLEXITY_ORDER.length - 1 - index
                return (
                  <motion.button
                    key={complexity}
                    type="button"
                    className={`complexity-corner__item glass-surface${
                      isActive ? ' complexity-corner__item--active' : ''
                    }`}
                    onClick={() => {
                      if (isActive) close()
                      onSelect(complexity)
                    }}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{
                      ...ITEM_TRANSITION,
                      delay: staggerIndex * (UTILITY_MENU_CASCADE_STAGGER_MS / 1000),
                    }}
                  >
                    <span className="complexity-corner__label">{complexity}</span>
                    <span
                      className={`complexity-corner__dot${
                        isActive ? ' complexity-corner__dot--active' : ''
                      }`}
                      aria-hidden
                    />
                  </motion.button>
                )
              })}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="complexity-corner__trigger-anchor">
          <button
            type="button"
            className={`complexity-corner__trigger glass-surface${
              triggerLocked ? ' complexity-corner__trigger--open' : ''
            }`}
            aria-label={iconOpen ? 'Close Fraud Complexity menu' : 'Fraud Complexity'}
            aria-expanded={state === 'open' || state === 'opening'}
            onClick={toggle}
          >
            <span className="complexity-corner__trigger-label">
              <span className="complexity-corner__trigger-label-text">Fraud Complexity</span>
            </span>
            <span
              className={`complexity-corner__icon-slot${
                triggerLocked ? ' complexity-corner__icon-slot--open' : ''
              }`}
              aria-hidden
            >
              <CornerMenuIcon icon="complexity" className="corner-menu__trigger-icon" />
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  )
}
