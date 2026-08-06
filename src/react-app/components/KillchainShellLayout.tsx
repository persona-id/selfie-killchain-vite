import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useOutlet } from 'react-router'

import { useGallery } from '../context/GalleryContext'
import { useGlobeIntro } from '../context/GlobeIntroContext'
import { useKillchainChrome } from '../context/KillchainChromeContext'
import { useChromeEntranceReady } from '../hooks/useChromeEntranceReady'
import { KillchainCornerChrome } from './corner-chrome/KillchainCornerChrome'

import './KillchainShellLayout.css'

const GLOBE_CONTENT_VARIANTS = {
  initial: { opacity: 0, pointerEvents: 'none' as const },
  animate: {
    opacity: 1,
    pointerEvents: 'auto' as const,
    transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    pointerEvents: 'none' as const,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const },
  },
}

const OVERLAY_CONTENT_VARIANTS = {
  initial: { opacity: 1, pointerEvents: 'auto' as const },
  animate: { opacity: 1, pointerEvents: 'auto' as const },
  exit: {
    opacity: 0,
    pointerEvents: 'none' as const,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const },
  },
}

export default function KillchainShellLayout() {
  const location = useLocation()
  const outlet = useOutlet()
  const { selectedItem, loading } = useGallery()
  const { introActive, chromeRevealReady, chromeEntranceKey } = useGlobeIntro()
  const { left, topBar, dismissUtilityMenu } = useKillchainChrome()

  const isGlobe = location.pathname === '/'
  const isMatrix = location.pathname === '/matrix'
  const isDeconstruct = location.pathname === '/deconstruct'
  const skipContentEnter = Boolean(
    (location.state as { fromGlobeModal?: boolean } | null)?.fromGlobeModal,
  )
  const variant = isMatrix ? 'matrix' : isGlobe ? 'globe' : 'deconstruct'

  const hasGlobeModalParams = useMemo(() => {
    if (!isGlobe) return false
    const params = new URLSearchParams(location.search)
    return Boolean(params.get('image') || params.get('tags'))
  }, [isGlobe, location.search])

  const hideChromeForGlobeModal =
    isGlobe && (Boolean(selectedItem) || (loading && hasGlobeModalParams))
  const hideChromeForGlobeIntro = isGlobe && introActive && !chromeRevealReady
  const hideChrome = hideChromeForGlobeModal || hideChromeForGlobeIntro

  useLayoutEffect(() => {
    if (!hideChrome) return
    dismissUtilityMenu()
  }, [dismissUtilityMenu, hideChrome])

  const showTopLeft = Boolean(left.visible)
  const hasPlayedGlobeEntranceRef = useRef(false)

  const shouldAnimateGlobeEntrance =
    isGlobe &&
    !hasPlayedGlobeEntranceRef.current &&
    (!introActive || chromeRevealReady)
  const globeEntranceKey =
    introActive && !chromeRevealReady
      ? 'intro-blocking'
      : `${chromeEntranceKey}-${showTopLeft ? 'ready' : 'pending'}`
  const globeEntranceReadyFromHook = useChromeEntranceReady(
    shouldAnimateGlobeEntrance ? globeEntranceKey : 'static',
  )

  useEffect(() => {
    if (!shouldAnimateGlobeEntrance || !showTopLeft || !globeEntranceReadyFromHook) return
    hasPlayedGlobeEntranceRef.current = true
  }, [globeEntranceReadyFromHook, shouldAnimateGlobeEntrance, showTopLeft])

  const chromeEntranceReady = shouldAnimateGlobeEntrance ? globeEntranceReadyFromHook : true

  const contentClass = isGlobe
    ? 'killchain-app__content killchain-app__content--globe killchain-shell-layout__content'
    : isMatrix
      ? 'killchain-app__content killchain-app__content--matrix killchain-shell-layout__content killchain-shell-layout__route-content'
      : 'killchain-app__content killchain-app__content--with-menu killchain-shell-layout__content killchain-shell-layout__route-content'

  const contentVariants = isGlobe ? GLOBE_CONTENT_VARIANTS : OVERLAY_CONTENT_VARIANTS

  const menuPortalClass = [
    'killchain-app',
    'killchain-shell-layout__menu-portal',
    'killchain-shell-layout__menu-portal--views',
    isGlobe ? 'killchain-shell-layout__menu-portal--globe-route' : '',
    isDeconstruct ? 'killchain-shell-layout__menu-portal--deconstruct-route' : '',
    hideChromeForGlobeModal ? 'killchain-shell-layout__menu-portal--globe-modal-open' : '',
    hideChromeForGlobeIntro ? 'killchain-shell-layout__menu-portal--globe-intro' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const menuPortal = createPortal(
    <div className={menuPortalClass}>
      <KillchainCornerChrome
        variant={variant}
        left={left}
        topBar={topBar}
        entranceReady={chromeEntranceReady}
        hidden={hideChrome}
        chromeEntranceKey={chromeEntranceKey}
      />
    </div>,
    document.body,
  )

  return (
    <div className="killchain-shell-layout">
      {menuPortal}

      <div className="killchain-shell-layout__content-stack">
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={location.pathname}
            className={contentClass}
            variants={contentVariants}
            initial={skipContentEnter || !isGlobe ? false : 'initial'}
            animate="animate"
            exit="exit"
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
