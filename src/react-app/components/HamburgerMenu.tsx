import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useGallery } from '../context/GalleryContext'
import { useGlobeIntro } from '../context/GlobeIntroContext'
import {
  CATEGORIES,
  SEVERITY_ORB_ANIMATION_OPTIONS,
  FRAUD_AXIS_LABEL_OPTIONS,
  type Category,
  type GlobeAnimation,
  type SeverityOrbAnimation,
  type FraudAxisLabelStyle,
  type ClusterFieldLayout,
} from '../types/gallery'
import { categoryLabel } from '../lib/taxonomy'
import { ANIMATION_OPTIONS, ARRANGEMENT_OPTIONS, MAX_GLOBE_ITEM_COUNT, MIN_GLOBE_ITEM_COUNT } from '../lib/globe'
import { CLUSTER_ELEMENT_LAYOUT_OPTIONS, CLUSTER_FIELD_LAYOUT_OPTIONS } from '../lib/clusterLayout'
import {
  MAX_GLOBE_IMAGE_SIZE,
  MIN_GLOBE_IMAGE_SIZE,
  MAX_DEPTH_FADE,
  MAX_DEPTH_FADE_RANGE,
  MAX_DEPTH_VISIBILITY,
  MIN_DEPTH_FADE,
  MIN_DEPTH_FADE_RANGE,
  MIN_DEPTH_VISIBILITY,
} from '../types/gallery'
import { SETTINGS_MENU_ENTRANCE } from '../constants/shellMotion'
import {
  UTILITY_MENU_CLOSE_MS,
  UTILITY_MENU_TRANSITION_MS,
} from '../constants/utilityMenuMotion'
import { useChromeEntranceReady } from '../hooks/useChromeEntranceReady'
import { SettingsLibInfo } from './SettingsLibInfo'
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
    globeArrangement,
    setGlobeArrangement,
    linkCluster,
    setLinkCluster,
    cameraControls,
    setCameraControls,
    categoryView,
    setCategoryView,
    globeAnimation,
    setGlobeAnimation,
    filteredItems,
  } = useGallery()
  const { restartIntro } = useGlobeIntro()
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
  const isCategoryGroup = globeArrangement === 'clusters'
  const isClusterGroup = linkCluster.enabled
  const standardArrangements = ARRANGEMENT_OPTIONS.filter((option) => option.id !== 'clusters')

  const selectClusterGroup = () => {
    if (globeArrangement === 'clusters') {
      setGlobeArrangement('even')
    }
    setLinkCluster({ enabled: true })
  }

  const clearGroupModes = () => {
    setLinkCluster({ enabled: false })
    if (globeArrangement === 'clusters') {
      setGlobeArrangement('even')
    }
  }

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
            <SettingsLibInfo />

            {isCategoryGroup ? (
              <>
                <SliderControl
                  label="Background cluster opacity"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={categoryView.unfocusedClusterOpacity}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={(unfocusedClusterOpacity) =>
                    setCategoryView({ unfocusedClusterOpacity })
                  }
                />

                <SliderControl
                  label="Group spread"
                  min={0.5}
                  max={2.5}
                  step={0.05}
                  value={categoryView.groupSpread}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={(groupSpread) => setCategoryView({ groupSpread })}
                />

                <p className="hamburger-menu__subsection-label">Field shape</p>
                <div className="hamburger-menu__pill-row">
                  {CLUSTER_FIELD_LAYOUT_OPTIONS.map((option) => (
                    <PillButton
                      key={option.id}
                      label={option.label}
                      active={categoryView.clusterFieldLayout === option.id}
                      onClick={() =>
                        setCategoryView({
                          clusterFieldLayout: option.id as ClusterFieldLayout,
                        })
                      }
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = !categoryView.clusterIntroTest
                    setCategoryView({ clusterIntroTest: next })
                    if (next) restartIntro()
                  }}
                  className={`hamburger-menu__list-btn hamburger-menu__list-btn--all ${
                    categoryView.clusterIntroTest
                      ? 'hamburger-menu__list-btn--active'
                      : 'hamburger-menu__list-btn--inactive'
                  }`}
                >
                  {categoryView.clusterIntroTest
                    ? 'On — cluster intro test'
                    : 'Off — cluster intro test'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCategoryView({
                      clusterFocusPresentation: !categoryView.clusterFocusPresentation,
                    })
                  }
                  className={`hamburger-menu__list-btn hamburger-menu__list-btn--all ${
                    categoryView.clusterFocusPresentation
                      ? 'hamburger-menu__list-btn--active'
                      : 'hamburger-menu__list-btn--inactive'
                  }`}
                >
                  {categoryView.clusterFocusPresentation
                    ? 'On — focus glass plaque'
                    : 'Off — focus glass plaque'}
                </button>

                {categoryView.clusterFocusPresentation ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setCategoryView({
                          clusterFocusOrbitSphere: !categoryView.clusterFocusOrbitSphere,
                        })
                      }
                      className={`hamburger-menu__list-btn hamburger-menu__list-btn--all ${
                        categoryView.clusterFocusOrbitSphere
                          ? 'hamburger-menu__list-btn--active'
                          : 'hamburger-menu__list-btn--inactive'
                      }`}
                    >
                      {categoryView.clusterFocusOrbitSphere
                        ? 'On — orbit sphere layout'
                        : 'Off — original cluster layout'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setCategoryView({
                          clusterFocusPlaqueAnimate:
                            !categoryView.clusterFocusPlaqueAnimate,
                        })
                      }
                      className={`hamburger-menu__list-btn hamburger-menu__list-btn--all ${
                        categoryView.clusterFocusPlaqueAnimate
                          ? 'hamburger-menu__list-btn--active'
                          : 'hamburger-menu__list-btn--inactive'
                      }`}
                    >
                      {categoryView.clusterFocusPlaqueAnimate
                        ? 'On — plaque blur entrance'
                        : 'Off — plaque blur entrance'}
                    </button>
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={() =>
                    setCategoryView({
                      showSeverityOrb: !categoryView.showSeverityOrb,
                    })
                  }
                  className={`hamburger-menu__list-btn hamburger-menu__list-btn--all ${
                    categoryView.showSeverityOrb
                      ? 'hamburger-menu__list-btn--active'
                      : 'hamburger-menu__list-btn--inactive'
                  }`}
                >
                  {categoryView.showSeverityOrb
                    ? 'On — severity orbs'
                    : 'Off — severity orbs'}
                </button>

                {categoryView.showSeverityOrb ? (
                  <>
                    <p className="hamburger-menu__subsection-label">Orb animation</p>
                    <div className="hamburger-menu__pill-row">
                      {SEVERITY_ORB_ANIMATION_OPTIONS.map((option) => (
                        <PillButton
                          key={option.id}
                          label={option.label}
                          active={categoryView.severityOrbAnimation === option.id}
                          onClick={() =>
                            setCategoryView({
                              severityOrbAnimation: option.id as SeverityOrbAnimation,
                            })
                          }
                        />
                      ))}
                    </div>
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={() =>
                    setCategoryView({
                      fraudAxisEnabled: !categoryView.fraudAxisEnabled,
                    })
                  }
                  className={`hamburger-menu__list-btn hamburger-menu__list-btn--all ${
                    categoryView.fraudAxisEnabled
                      ? 'hamburger-menu__list-btn--active'
                      : 'hamburger-menu__list-btn--inactive'
                  }`}
                >
                  {categoryView.fraudAxisEnabled
                    ? 'On — digital clusters top / physical bottom'
                    : 'Off — fraud axis layout'}
                </button>

                {categoryView.fraudAxisEnabled ? (
                  <>
                    <SliderControl
                      label="Cluster axis spread"
                      min={0.5}
                      max={2}
                      step={0.05}
                      value={categoryView.fraudAxisSpread}
                      format={(v) => `${Math.round(v * 100)}%`}
                      onChange={(fraudAxisSpread) =>
                        setCategoryView({ fraudAxisSpread })
                      }
                    />

                    <p className="hamburger-menu__subsection-label">Axis labels</p>
                    <div className="hamburger-menu__pill-row">
                      {FRAUD_AXIS_LABEL_OPTIONS.map((option) => (
                        <PillButton
                          key={option.id}
                          label={option.label}
                          active={categoryView.fraudAxisLabelStyle === option.id}
                          onClick={() =>
                            setCategoryView({
                              fraudAxisLabelStyle: option.id as FraudAxisLabelStyle,
                            })
                          }
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </>
            ) : null}

            <p className="hamburger-menu__section-label hamburger-menu__section-label--spaced">
              Motion
            </p>
            {!isCategoryGroup ? (
              <>
                <p className="hamburger-menu__subsection-label">Globe animation</p>
                <div className="hamburger-menu__pill-row">
                  {ANIMATION_OPTIONS.map((option) => (
                    <PillButton
                      key={option.id}
                      label={option.label}
                      active={globeAnimation === option.id}
                      onClick={() => setGlobeAnimation(option.id)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="hamburger-menu__subsection-label">
                Image motion animates sphere clusters · drag to rotate view
              </p>
            )}

            <p className="hamburger-menu__subsection-label">Cluster shape</p>
            <div className="hamburger-menu__pill-row">
              {CLUSTER_ELEMENT_LAYOUT_OPTIONS.map((option) => (
                <PillButton
                  key={option.id}
                  label={option.label}
                  active={categoryView.clusterShape === option.id}
                  onClick={() => setCategoryView({ clusterShape: option.id })}
                />
              ))}
            </div>

            <SliderControl
              label="Cluster spacing"
              min={0.5}
              max={2.5}
              step={0.05}
              value={categoryView.clusterSpacing}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(clusterSpacing) => setCategoryView({ clusterSpacing })}
            />

            <p className="hamburger-menu__subsection-label">Image motion</p>
            <div className="hamburger-menu__pill-row">
              {ANIMATION_OPTIONS.map((option) => (
                <PillButton
                  key={option.id}
                  label={option.label}
                  active={categoryView.clusterAnimation === option.id}
                  onClick={() =>
                    setCategoryView({ clusterAnimation: option.id as GlobeAnimation })
                  }
                />
              ))}
            </div>

            <SliderControl
              label="Image flutter"
              min={0}
              max={1}
              step={0.05}
              value={categoryView.imageFlutter}
              format={(v) => (v === 0 ? 'Off' : `${Math.round(v * 100)}%`)}
              onChange={(imageFlutter) => setCategoryView({ imageFlutter })}
            />

            <SliderControl
              label="Motion speed"
              min={0}
              max={2}
              step={0.05}
              value={categoryView.motionSpeed}
              format={(v) => (v === 0 ? 'Off' : `${Math.round(v * 100)}%`)}
              onChange={(motionSpeed) => setCategoryView({ motionSpeed })}
            />

            <p className="hamburger-menu__section-label hamburger-menu__section-label--spaced">
              Link clusters
            </p>
            <div className="hamburger-menu__pill-row">
              <PillButton
                label="Cluster"
                active={isClusterGroup}
                onClick={() => (isClusterGroup ? clearGroupModes() : selectClusterGroup())}
              />
            </div>

            {!isCategoryGroup ? (
              <>
                <p className="hamburger-menu__subsection-label">Arrangement</p>
                <div className="hamburger-menu__pill-row">
                  {standardArrangements.map((option) => (
                    <PillButton
                      key={option.id}
                      label={option.label}
                      active={globeArrangement === option.id}
                      onClick={() => setGlobeArrangement(option.id)}
                    />
                  ))}
                </div>
              </>
            ) : null}

            <p className="hamburger-menu__section-label hamburger-menu__section-label--spaced">
              Images
            </p>
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
              min={MIN_GLOBE_IMAGE_SIZE}
              max={MAX_GLOBE_IMAGE_SIZE}
              step={0.05}
              value={globeDisplay.imageSize}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(imageSize) => setGlobeDisplay({ imageSize })}
            />
            <SliderControl
              label="Image fading"
              min={MIN_DEPTH_FADE}
              max={MAX_DEPTH_FADE}
              step={0.05}
              value={globeDisplay.depthFade}
              format={(v) => (v === 0 ? 'Off' : `${Math.round(v * 100)}%`)}
              onChange={(depthFade) => setGlobeDisplay({ depthFade })}
            />
            <SliderControl
              label="Depth filter"
              min={MIN_DEPTH_VISIBILITY}
              max={MAX_DEPTH_VISIBILITY}
              step={5}
              value={globeDisplay.depthVisibility}
              format={(v) => `${Math.round(v)}`}
              onChange={(depthVisibility) => setGlobeDisplay({ depthVisibility })}
            />
            <SliderControl
              label="Fade range"
              min={MIN_DEPTH_FADE_RANGE}
              max={MAX_DEPTH_FADE_RANGE}
              step={0.05}
              value={globeDisplay.depthFadeRange}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(depthFadeRange) => setGlobeDisplay({ depthFadeRange })}
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

function PillButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`hamburger-menu__pill${active ? ' hamburger-menu__pill--active' : ''}`}
    >
      {label}
    </button>
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
