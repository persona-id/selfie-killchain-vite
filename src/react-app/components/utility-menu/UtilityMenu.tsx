import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useKillchainChrome } from '../../context/KillchainChromeContext'
import {
  UTILITY_MENU_CASCADE_MS,
  UTILITY_MENU_CLOSE_MS,
  UTILITY_MENU_TRANSITION_MS,
} from '../../constants/utilityMenuMotion'
import { navigateWithViewTransition } from '../../utils/viewTransition'
import MenuToggleDots from '../MenuToggleDots'
import { ViewMenuPanel } from '../ViewMenuPanel'
import { FitToScreenNavIcon, ViewEndNodeNavIcon } from '../UtilityNavIcons'
import './UtilityMenu.css'

export type UtilityMenuLayout = 'menu-only' | 'full'
export type UtilityMenuState = 'idle' | 'opening' | 'open' | 'closing'

const FIT_TO_SCREEN_LABEL = 'FIT'
const VIEW_RESULT_LABEL = 'RESULT'

function useUtilityMenuState(open: boolean) {
  const [state, setState] = useState<UtilityMenuState>('idle')
  const resetToIdle = useCallback(() => setState('idle'), [])

  useEffect(() => {
    if (open) {
      setState('opening')
      const timer = window.setTimeout(() => setState('open'), UTILITY_MENU_TRANSITION_MS)
      return () => window.clearTimeout(timer)
    }

    setState((current) => (current === 'idle' ? 'idle' : 'closing'))
    const timer = window.setTimeout(() => setState('idle'), UTILITY_MENU_CLOSE_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  return { state, resetToIdle }
}

function useMenuOpenBodyClass(active: boolean) {
  useEffect(() => {
    document.body.classList.toggle('killchain-menu-open', active)
    return () => {
      document.body.classList.remove('killchain-menu-open')
    }
  }, [active])
}

interface UtilityMenuProps {
  layout: UtilityMenuLayout
  entranceReady?: boolean
  onFitToScreen?: () => void
  onViewResult?: () => void
  fitToScreenActive?: boolean
  viewResultActive?: boolean
}

function UtilityMenuBackdrop({
  state,
  onClose,
}: {
  state: UtilityMenuState
  onClose: () => void
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (state === 'idle') {
      setVisible(false)
      return
    }

    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [state])

  if (state === 'idle') return null

  return (
    <button
      type="button"
      className={`utility-menu__backdrop${visible ? ' utility-menu__backdrop--visible' : ''}`}
      onClick={onClose}
      aria-label="Close menu"
    />
  )
}

function UtilityMenuActions({
  onFitToScreen,
  onViewResult,
  fitToScreenActive = false,
  viewResultActive = false,
}: {
  onFitToScreen?: () => void
  onViewResult?: () => void
  fitToScreenActive?: boolean
  viewResultActive?: boolean
}) {
  return (
    <div className="utility-menu__actions">
      {onFitToScreen ? (
        <button
          type="button"
          className="utility-menu__action"
          aria-label="Fit to screen"
          aria-pressed={fitToScreenActive}
          onClick={onFitToScreen}
        >
          <span className="utility-menu__action-label">
            <span className="utility-menu__action-label-text">{FIT_TO_SCREEN_LABEL}</span>
          </span>
          <FitToScreenNavIcon active={fitToScreenActive} />
        </button>
      ) : null}
      {onViewResult ? (
        <button
          type="button"
          className="utility-menu__action"
          aria-label="View result"
          aria-pressed={viewResultActive}
          onClick={onViewResult}
        >
          <span className="utility-menu__action-label">
            <span className="utility-menu__action-label-text">{VIEW_RESULT_LABEL}</span>
          </span>
          <ViewEndNodeNavIcon active={viewResultActive} />
        </button>
      ) : null}
    </div>
  )
}

export default function UtilityMenu({
  layout,
  entranceReady = true,
  onFitToScreen,
  onViewResult,
  fitToScreenActive = false,
  viewResultActive = false,
}: UtilityMenuProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [closingLayout, setClosingLayout] = useState<UtilityMenuLayout | null>(null)
  const { state, resetToIdle } = useUtilityMenuState(open)
  const panelCachedRef = useRef(false)
  if (state !== 'idle') panelCachedRef.current = true
  const panelMounted = panelCachedRef.current
  const [cascadeIn, setCascadeIn] = useState(false)
  const menuActive = state !== 'idle'
  const prevLayoutRef = useRef(layout)
  const pendingNavigationRef = useRef<string | null>(null)
  const closeMenu = useCallback(() => {
    setClosingLayout(layout)
    setOpen(false)
  }, [layout])
  const { registerUtilityMenuDismiss, setTopBarChrome } = useKillchainChrome()

  const requestNavigateAndClose = useCallback(
    (target: string) => {
      pendingNavigationRef.current = target
      setClosingLayout(layout)
      setOpen(false)
    },
    [layout],
  )

  useEffect(() => {
    if (open || !pendingNavigationRef.current) return

    const target = pendingNavigationRef.current
    const timer = window.setTimeout(() => {
      navigateWithViewTransition(navigate, target)
    }, UTILITY_MENU_CASCADE_MS)

    return () => window.clearTimeout(timer)
  }, [navigate, open])

  useEffect(() => {
    if (state !== 'idle') return
    pendingNavigationRef.current = null
    setClosingLayout(null)
  }, [state])

  useEffect(() => {
    if (state !== 'opening') {
      if (state === 'idle' || state === 'closing') setCascadeIn(false)
      return
    }

    setCascadeIn(false)
    const frame = requestAnimationFrame(() => setCascadeIn(true))
    return () => cancelAnimationFrame(frame)
  }, [state])

  useLayoutEffect(() => {
    if (prevLayoutRef.current === layout) return
    prevLayoutRef.current = layout
    if (state === 'closing') return
    resetToIdle()
    setOpen(false)
  }, [layout, resetToIdle, state])

  useLayoutEffect(() => {
    setTopBarChrome({ utilityActionHint: null })
  }, [layout, setTopBarChrome])

  useMenuOpenBodyClass(menuActive)

  useEffect(() => {
    return registerUtilityMenuDismiss(closeMenu)
  }, [registerUtilityMenuDismiss, closeMenu])

  const effectiveLayout = state === 'closing' && closingLayout ? closingLayout : layout

  return (
    <>
      <UtilityMenuBackdrop state={state} onClose={closeMenu} />
      <div
        className={`utility-menu${entranceReady ? ' utility-menu--visible' : ''}${
          cascadeIn ? ' utility-menu--cascade-in' : ''
        }`}
        data-state={state}
        data-layout={effectiveLayout}
      >
        <button
          type="button"
          className="utility-menu__toggle"
          aria-label={menuActive ? 'Close menu' : 'Open menu'}
          aria-expanded={menuActive}
          onClick={() => {
            if (open) {
              closeMenu()
              return
            }
            setOpen(true)
          }}
        >
          <MenuToggleDots open={menuActive} />
        </button>
        <div className="utility-menu__shell">
          <div className="utility-menu__surface" aria-hidden />
          <header className="utility-menu__rail">
            {effectiveLayout === 'full' ? (
              <UtilityMenuActions
                onFitToScreen={onFitToScreen}
                onViewResult={onViewResult}
                fitToScreenActive={fitToScreenActive}
                viewResultActive={viewResultActive}
              />
            ) : null}
          </header>
          {panelMounted ? (
            <div className="utility-menu__body">
              <ViewMenuPanel
                onClose={closeMenu}
                onNavigate={requestNavigateAndClose}
                menuVisible={menuActive}
              />
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
