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
  revealIntroChrome: () => void
  skipIntro: () => void
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
      revealIntroChrome,
      skipIntro: finishIntro,
    }),
    [chromeEntranceKey, chromeRevealReady, finishIntro, introActive, revealIntroChrome],
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
