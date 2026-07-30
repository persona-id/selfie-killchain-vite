import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

import type { Complexity } from '../types/gallery'
import { useGallery } from '../context/GalleryContext'
import { useGlobeIntro } from '../context/GlobeIntroContext'
import { useKillchainChrome } from '../context/KillchainChromeContext'
import { findGalleryItem } from '../lib/galleryLookup'
import { GlobeView } from '../components/views/GlobeView'
import { GlobeIntroOverlay } from '../components/globe/GlobeIntroOverlay'

import './GlobePage.css'

export default function GlobePage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const {
    loading,
    selectedItem,
    openModal,
    activeComplexity,
    setActiveComplexity,
    setGlobeArrangement,
  } = useGallery()
  const { introActive, chromeRevealReady, completeIntro, revealIntroChrome, skipIntro, chromeEntranceKey } = useGlobeIntro()
  const { setLeftChrome, setTopBarChrome } = useKillchainChrome()
  const openedFromSearchRef = useRef<string | null>(null)
  const introProgressRef = useRef(0)
  const introGlobeReadyRef = useRef(false)

  const handleSelectComplexity = useCallback(
    (complexity: Complexity) => {
      setActiveComplexity(activeComplexity === complexity ? null : complexity)
    },
    [activeComplexity, setActiveComplexity],
  )

  useLayoutEffect(() => {
    setActiveComplexity(null)
    setGlobeArrangement('even')
  }, [setActiveComplexity, setGlobeArrangement])

  useLayoutEffect(() => {
    if (introActive) return
    introProgressRef.current = 1
    introGlobeReadyRef.current = true
  }, [introActive])

  useLayoutEffect(() => {
    if (location.pathname !== '/') return

    const fromGlobeModal = Boolean(
      (location.state as { fromGlobeModal?: boolean } | null)?.fromGlobeModal,
    )
    const hasPreset =
      Boolean(searchParams.get('image')) || Boolean(searchParams.get('tags'))

    if ((fromGlobeModal || hasPreset) && introActive) {
      introProgressRef.current = 1
      skipIntro()
    }
  }, [introActive, location.pathname, location.state, searchParams, skipIntro])

  useLayoutEffect(() => {
    if (location.pathname !== '/') return

    setLeftChrome({
      visible: !introActive || chromeRevealReady,
      expanded: false,
      stageNav: null,
      complexityNav: {
        activeComplexity,
        onSelect: handleSelectComplexity,
        indicatorVisible: true,
      },
      body: null,
    })
    setTopBarChrome({
      onFitToScreen: undefined,
      onViewResult: undefined,
      fitToScreenActive: false,
      viewResultActive: false,
    })
  }, [
    activeComplexity,
    chromeRevealReady,
    handleSelectComplexity,
    introActive,
    location.pathname,
    setLeftChrome,
    setTopBarChrome,
  ])

  useEffect(() => {
    if (loading || selectedItem) return

    const image = searchParams.get('image')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) ?? []
    const searchKey = searchParams.toString()
    if (!image && tags.length === 0) {
      openedFromSearchRef.current = null
      return
    }

    if (openedFromSearchRef.current === searchKey) return
    openedFromSearchRef.current = searchKey

    let cancelled = false
    findGalleryItem(image, tags).then((item) => {
      if (!cancelled && item) openModal(item)
    })

    return () => {
      cancelled = true
    }
  }, [loading, openModal, searchParams, selectedItem])

  if (loading) {
    return (
      <div className="globe-page globe-page--loading flex h-full flex-col items-center justify-center gap-5">
        <div className="relative h-28 w-28">
          <div className="absolute inset-0 animate-pulse rounded-full bg-neutral-200/80 blur-2xl" />
          <div className="absolute inset-3 animate-pulse rounded-full bg-neutral-300/90 blur-xl [animation-delay:150ms]" />
          <div className="absolute inset-6 rounded-full bg-neutral-400/40 blur-lg [animation-delay:300ms]" />
        </div>
        <p className="text-sm text-neutral-400">Loading gallery…</p>
      </div>
    )
  }

  return (
    <div className="globe-page relative h-full w-full">
      <GlobeView
        introLocked={introActive}
        introProgressRef={introProgressRef}
        introGlobeReadyRef={introGlobeReadyRef}
        chromeEntranceKey={chromeEntranceKey}
      />

      {introActive ? (
        <GlobeIntroOverlay
          introGlobeReadyRef={introGlobeReadyRef}
          onProgress={(progress) => {
            introProgressRef.current = progress
          }}
          onGlobeReady={revealIntroChrome}
          onComplete={completeIntro}
          onSkip={skipIntro}
        />
      ) : null}
    </div>
  )
}
