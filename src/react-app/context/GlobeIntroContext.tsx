import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useReducedMotion } from 'framer-motion'

import { hasGlobeIntroPlayed, markGlobeIntroPlayed } from '../utils/globeIntroState'

type GlobeIntroContextValue = {
  introActive: boolean
  chromeRevealReady: boolean
  chromeEntranceKey: string
  completeIntro: () => void
  dismissIntro: () => void
  revealIntroChrome: () => void
  skipIntro: () => void
  restartIntro: () => void
}

const GlobeIntroContext = createContext<GlobeIntroContextValue | null>(null)

export function GlobeIntroProvider({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion()
  const [introActive, setIntroActive] = useState(() => !hasGlobeIntroPlayed())
  const [chromeRevealReady, setChromeRevealReady] = useState(() =>
    hasGlobeIntroPlayed(),
  )
  const [chromeEntranceKey, setChromeEntranceKey] = useState(() =>
    hasGlobeIntroPlayed() ? 'ready' : 'intro-pending',
  )

  const revealIntroChrome = useCallback(() => {
    setChromeRevealReady(true)
    setChromeEntranceKey(`reveal-${Date.now()}`)
  }, [])

  const finishIntro = useCallback(() => {
    markGlobeIntroPlayed()
    setChromeRevealReady(true)
    setIntroActive(false)
  }, [])

  const dismissIntro = useCallback(() => {
    setChromeRevealReady(true)
    setIntroActive(false)
  }, [])

  const restartIntro = useCallback(() => {
    setChromeRevealReady(false)
    setIntroActive(true)
    setChromeEntranceKey(`intro-restart-${Date.now()}`)
  }, [])

  useEffect(() => {
    if (reduceMotion && introActive) {
      finishIntro()
    }
  }, [finishIntro, introActive, reduceMotion])

  const value = useMemo(
    () => ({
      introActive,
      chromeRevealReady,
      chromeEntranceKey,
      completeIntro: finishIntro,
      dismissIntro,
      revealIntroChrome,
      skipIntro: finishIntro,
      restartIntro,
    }),
    [chromeEntranceKey, chromeRevealReady, dismissIntro, finishIntro, introActive, revealIntroChrome, restartIntro],
  )

  return (
    <GlobeIntroContext.Provider value={value}>{children}</GlobeIntroContext.Provider>
  )
}

export function useGlobeIntro() {
  const ctx = useContext(GlobeIntroContext)
  if (!ctx) {
    throw new Error('useGlobeIntro must be used within GlobeIntroProvider')
  }
  return ctx
}
