import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useGallery } from '../context/GalleryContext'
import { CATEGORIES, type Category } from '../types/gallery'
import { categoryLabel } from '../lib/taxonomy'
import { MAX_GLOBE_ITEM_COUNT, MIN_GLOBE_ITEM_COUNT } from '../lib/globe'
import { SETTINGS_MENU_ENTRANCE } from '../constants/shellMotion'
import {
  UTILITY_MENU_CLOSE_MS,
  UTILITY_MENU_TRANSITION_MS,
} from '../constants/utilityMenuMotion'
import { useChromeEntranceReady } from '../hooks/useChromeEntranceReady'
import './HamburgerMenu.css'
import { CornerMenuIcon } from './corner-chrome/CornerMenuIcons'

type SettingsMenuState = 'idle' | 'opening' | 'open' | 'closing'

function useSettingsMenuState() {
  const [state, setState] = useState<SettingsMenuState>('idle')

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
      if (current === 'open') return 'closing'
      return current
    })
  }, [])

  return {
    state,
    toggle,
    close,
    showPanel: state === 'open',
    triggerLocked: state !== 'idle',
  }
}

export function HamburgerMenu({
  embedded = false,
  entranceKey = 'default',
  hidden = false,
}: {
  embedded?: boolean
  entranceKey?: string
  hidden?: boolean
}) {
  const {
    activeCategories,
    toggleCategory,
    selectAllCategories,
    categoryCounts,
    globeItemCount,
    setGlobeItemCount,
    globeDisplay,
    setGlobeDisplay,
    cameraControls,
    setCameraControls,
    filteredItems,
  } = useGallery()
  const { state, toggle, close, showPanel, triggerLocked } = useSettingsMenuState()
  const panelRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const entranceReady = useChromeEntranceReady(entranceKey)
  const visible = entranceReady && !hidden

  useEffect(() => {
    if (state !== 'open') return
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        close()
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [close, state])

  const allSelected = activeCategories.size === CATEGORIES.length
  const maxGlobeItems = Math.max(
    MIN_GLOBE_ITEM_COUNT,
    Math.min(MAX_GLOBE_ITEM_COUNT, filteredItems.length),
  )

  const menuContent = (
    <>
      <div className="hamburger-menu__trigger-anchor">
        <button
          type="button"
          onClick={toggle}
          className={`hamburger-menu__trigger glass-surface${
            triggerLocked ? ' hamburger-menu__trigger--open' : ''
          }`}
          aria-label="Settings"
          aria-expanded={state === 'open' || state === 'opening'}
        >
          <span className="hamburger-menu__icon-slot" aria-hidden>
            <CornerMenuIcon icon="settings" className="corner-menu__trigger-icon" />
          </span>
          <span className="hamburger-menu__trigger-label">
            <span className="hamburger-menu__trigger-label-text">Settings</span>
          </span>
        </button>
      </div>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="hamburger-menu__panel glass-surface"
          >
            <p className="hamburger-menu__section-label">Images</p>
            <SliderControl
              label="Included"
              min={MIN_GLOBE_ITEM_COUNT}
              max={maxGlobeItems}
              step={1}
              value={Math.min(globeItemCount, maxGlobeItems)}
              format={(v) => `${Math.round(v)}`}
              onChange={(count) => setGlobeItemCount(count)}
            />
            <SliderControl
              label="Size"
              min={0.4}
              max={2.5}
              step={0.05}
              value={globeDisplay.imageSize}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(imageSize) => setGlobeDisplay({ imageSize })}
            />

            <p className="hamburger-menu__section-label hamburger-menu__section-label--spaced">
              Camera gestures
            </p>
            <button
              type="button"
              onClick={() => setCameraControls({ enabled: !cameraControls.enabled })}
              className={`hamburger-menu__list-btn hamburger-menu__list-btn--all ${
                cameraControls.enabled
                  ? 'hamburger-menu__list-btn--active'
                  : 'hamburger-menu__list-btn--inactive'
              }`}
            >
              {cameraControls.enabled
                ? 'On — pinch twice to close modal'
                : 'Off — touch/mouse controls'}
            </button>
            {cameraControls.enabled && (
              <>
                <SliderControl
                  label="Traverse sensitivity"
                  min={0.25}
                  max={2.5}
                  step={0.05}
                  value={cameraControls.traverseSensitivity}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={(traverseSensitivity) =>
                    setCameraControls({ traverseSensitivity })
                  }
                />
                <SliderControl
                  label="Zoom sensitivity"
                  min={0.25}
                  max={2.5}
                  step={0.05}
                  value={cameraControls.zoomSensitivity}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={(zoomSensitivity) => setCameraControls({ zoomSensitivity })}
                />
                <SliderControl
                  label="Smoothness"
                  min={0}
                  max={1}
                  step={0.05}
                  value={cameraControls.smoothness}
                  format={(v) => (v === 0 ? 'Off' : `${Math.round(v * 100)}%`)}
                  onChange={(smoothness) => setCameraControls({ smoothness })}
                />
                <button
                  type="button"
                  onClick={() =>
                    setCameraControls({ showPreview: !cameraControls.showPreview })
                  }
                  className={`hamburger-menu__list-btn hamburger-menu__list-btn--all ${
                    cameraControls.showPreview
                      ? 'hamburger-menu__list-btn--active'
                      : 'hamburger-menu__list-btn--inactive'
                  }`}
                >
                  {cameraControls.showPreview ? 'Preview on' : 'Preview off'}
                </button>
              </>
            )}

            <p className="hamburger-menu__section-label hamburger-menu__section-label--spaced">
              Categories
            </p>
            <button
              type="button"
              onClick={selectAllCategories}
              className={`hamburger-menu__list-btn hamburger-menu__list-btn--all ${
                allSelected
                  ? 'hamburger-menu__list-btn--active'
                  : 'hamburger-menu__list-btn--inactive'
              }`}
            >
              All ({CATEGORIES.reduce((n, c) => n + categoryCounts[c], 0)})
            </button>
            {CATEGORIES.map((category) => (
              <CategoryChip
                key={category}
                category={category}
                active={activeCategories.has(category)}
                count={categoryCounts[category]}
                onToggle={() => toggleCategory(category)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )

  const menuClassName = `hamburger-menu${embedded ? ' hamburger-menu--embedded' : ''}`

  if (reduceMotion) {
    return (
      <div
        ref={panelRef}
        className={menuClassName}
        style={{
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
        }}
      >
        {menuContent}
      </div>
    )
  }

  return (
    <motion.div
      ref={panelRef}
      className={menuClassName}
      initial={{ ...SETTINGS_MENU_ENTRANCE.initial, pointerEvents: 'none' }}
      animate={
        visible
          ? { ...SETTINGS_MENU_ENTRANCE.animate, pointerEvents: 'auto' }
          : { opacity: 0, pointerEvents: 'none' }
      }
      transition={SETTINGS_MENU_ENTRANCE.transition}
    >
      {menuContent}
    </motion.div>
  )
}

function SliderControl({
  label,
  min,
  max,
  step,
  value,
  format,
  onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  format: (value: number) => string
  onChange: (value: number) => void
}) {
  return (
    <label className="hamburger-menu__slider">
      <div className="hamburger-menu__slider-header">
        <span>{label}</span>
        <span>{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

function CategoryChip({
  category,
  active,
  count,
  onToggle,
}: {
  category: Category
  active: boolean
  count: number
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`hamburger-menu__list-btn capitalize ${
        active ? 'hamburger-menu__list-btn--active' : 'hamburger-menu__list-btn--inactive'
      }`}
    >
      <span>{categoryLabel(category)}</span>
      <span className="hamburger-menu__list-btn-count">{count}</span>
    </button>
  )
}
