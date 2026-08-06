import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useGallery } from '../../context/GalleryContext'
import { categoryLabel } from '../../lib/taxonomy'
import { CATEGORIES, type Category, type Complexity } from '../../types/gallery'
import { SETTINGS_MENU_ENTRANCE } from '../../constants/shellMotion'
import {
  UTILITY_MENU_CASCADE_STAGGER_MS,
  UTILITY_MENU_CLOSE_MS,
  UTILITY_MENU_TRANSITION_MS,
} from '../../constants/utilityMenuMotion'
import './ComplexityCornerMenu.css'
import { CornerMenuIcon } from './CornerMenuIcons'

const COMPLEXITY_ORDER: Complexity[] = ['Low', 'Moderate', 'High']

const ITEM_TRANSITION = {
  duration: 0.32,
  ease: [0.33, 1, 0.68, 1] as const,
}

type FilterMenuState = 'idle' | 'opening' | 'open' | 'closing'

type FilterRow =
  | { kind: 'complexity'; value: Complexity }
  | { kind: 'category'; value: Category }

function useFilterMenuState() {
  const [state, setState] = useState<FilterMenuState>('idle')

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

  return {
    state,
    toggle,
    showPanel: state === 'open',
    triggerLocked: state !== 'idle',
  }
}

interface ComplexityCornerMenuProps {
  entranceReady?: boolean
  hidden?: boolean
}

export function ComplexityCornerMenu({
  entranceReady = true,
  hidden = false,
}: ComplexityCornerMenuProps) {
  const {
    activeComplexity,
    setActiveComplexity,
    highlightedCategory,
    selectHighlightCategory,
  } = useGallery()
  const { state, toggle, showPanel, triggerLocked } = useFilterMenuState()
  const visible = entranceReady && !hidden

  const filterRows = useMemo<FilterRow[]>(
    () => [
      ...COMPLEXITY_ORDER.map((value) => ({ kind: 'complexity' as const, value })),
      ...CATEGORIES.map((value) => ({ kind: 'category' as const, value })),
    ],
    [],
  )

  const handleComplexitySelect = (complexity: Complexity) => {
    setActiveComplexity(activeComplexity === complexity ? null : complexity)
  }

  const renderFilterButton = (row: FilterRow, index: number) => {
    const staggerIndex = filterRows.length - 1 - index
    const isActive =
      row.kind === 'complexity'
        ? row.value === activeComplexity
        : highlightedCategory === row.value
    const label =
      row.kind === 'complexity' ? row.value : categoryLabel(row.value)
    const onClick =
      row.kind === 'complexity'
        ? () => handleComplexitySelect(row.value)
        : () => selectHighlightCategory(row.value)

    return (
      <motion.button
        key={`${row.kind}-${row.value}`}
        type="button"
        className={`complexity-corner__item${
          isActive ? ' complexity-corner__item--active' : ''
        }`}
        onClick={onClick}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{
          ...ITEM_TRANSITION,
          delay: staggerIndex * (UTILITY_MENU_CASCADE_STAGGER_MS / 1000),
        }}
      >
        <span className="complexity-corner__label">{label}</span>
        <span
          className={`complexity-corner__dot${
            isActive ? ' complexity-corner__dot--active' : ''
          }`}
          aria-hidden
        />
      </motion.button>
    )
  }

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
          {showPanel ? (
            <motion.div
              key="filter-panel"
              className="complexity-corner__panel glass-surface"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={ITEM_TRANSITION}
            >
              <div className="complexity-corner__section">
                <p className="complexity-corner__section-label">Complexity</p>
                <div className="complexity-corner__items">
                  {COMPLEXITY_ORDER.map((complexity, index) =>
                    renderFilterButton({ kind: 'complexity', value: complexity }, index),
                  )}
                </div>
              </div>

              <div className="complexity-corner__section">
                <p className="complexity-corner__section-label">Categories</p>
                <div className="complexity-corner__items">
                  {CATEGORIES.map((category, index) =>
                    renderFilterButton(
                      { kind: 'category', value: category },
                      COMPLEXITY_ORDER.length + index,
                    ),
                  )}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="complexity-corner__trigger-anchor">
          <button
            type="button"
            className={`complexity-corner__trigger glass-surface${
              triggerLocked ? ' complexity-corner__trigger--open' : ''
            }`}
            aria-label={showPanel ? 'Close filter menu' : 'Filter'}
            aria-expanded={state === 'open' || state === 'opening'}
            onClick={toggle}
          >
            <span className="complexity-corner__trigger-label">
              <span className="complexity-corner__trigger-label-text">Filter</span>
            </span>
            <span className="complexity-corner__icon-slot" aria-hidden>
              <CornerMenuIcon icon="search" className="corner-menu__trigger-icon" />
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  )
}
