import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import type { Complexity } from '../types/gallery'
import type { Selections, StageId } from '../types/killchain'

export type ComplexityNavChromeConfig = {
  activeComplexity: Complexity | null
  onSelect: (complexity: Complexity) => void
  indicatorVisible?: boolean
}

export type StageNavChromeConfig = {
  selections?: Selections
  activeStage?: StageId | null
  activeStages?: StageId[]
  skippedStages?: StageId[]
  stageOrder?: StageId[]
  slidingIndicator?: boolean
  indicatorVisible?: boolean
}

export type LeftChromeState = {
  visible: boolean
  expanded: boolean
  stageNav: StageNavChromeConfig | null
  complexityNav: ComplexityNavChromeConfig | null
  body: ReactNode | null
}

export type TopBarChromeState = {
  onFitToScreen?: () => void
  onViewResult?: () => void
  onReset?: () => void
  fitToScreenActive: boolean
  viewResultActive: boolean
  utilityActionHint: string | null
}

type KillchainChromeContextValue = {
  left: LeftChromeState
  topBar: TopBarChromeState
  matrixSelections: Selections | null
  setLeftChrome: (patch: Partial<LeftChromeState>) => void
  setTopBarChrome: (patch: Partial<TopBarChromeState>) => void
  setMatrixSelections: (selections: Selections | null) => void
  resetChrome: () => void
  registerUtilityMenuDismiss: (dismiss: () => void) => () => void
  dismissUtilityMenu: () => void
}

const DEFAULT_LEFT: LeftChromeState = {
  visible: false,
  expanded: false,
  stageNav: null,
  complexityNav: null,
  body: null,
}

const DEFAULT_TOP: TopBarChromeState = {
  fitToScreenActive: false,
  viewResultActive: false,
  utilityActionHint: null,
}

const KillchainChromeContext = createContext<KillchainChromeContextValue | null>(null)

export function KillchainChromeProvider({ children }: { children: ReactNode }) {
  const [left, setLeft] = useState<LeftChromeState>(DEFAULT_LEFT)
  const [topBar, setTopBar] = useState<TopBarChromeState>(DEFAULT_TOP)
  const [matrixSelections, setMatrixSelections] = useState<Selections | null>(null)
  const utilityMenuDismissRef = useRef<(() => void) | null>(null)

  const registerUtilityMenuDismiss = useCallback((dismiss: () => void) => {
    utilityMenuDismissRef.current = dismiss
    return () => {
      if (utilityMenuDismissRef.current === dismiss) {
        utilityMenuDismissRef.current = null
      }
    }
  }, [])

  const dismissUtilityMenu = useCallback(() => {
    utilityMenuDismissRef.current?.()
  }, [])

  const setLeftChrome = useCallback((patch: Partial<LeftChromeState>) => {
    setLeft((prev) => ({ ...prev, ...patch }))
  }, [])

  const setTopBarChrome = useCallback((patch: Partial<TopBarChromeState>) => {
    setTopBar((prev) => ({ ...prev, ...patch }))
  }, [])

  const resetChrome = useCallback(() => {
    setLeft(DEFAULT_LEFT)
    setTopBar(DEFAULT_TOP)
    setMatrixSelections(null)
  }, [])

  const value = useMemo(
    () => ({
      left,
      topBar,
      matrixSelections,
      setLeftChrome,
      setTopBarChrome,
      setMatrixSelections,
      resetChrome,
      registerUtilityMenuDismiss,
      dismissUtilityMenu,
    }),
    [
      left,
      topBar,
      matrixSelections,
      setLeftChrome,
      setTopBarChrome,
      resetChrome,
      registerUtilityMenuDismiss,
      dismissUtilityMenu,
    ],
  )

  return (
    <KillchainChromeContext.Provider value={value}>{children}</KillchainChromeContext.Provider>
  )
}

export function useKillchainChrome() {
  const ctx = useContext(KillchainChromeContext)
  if (!ctx) {
    throw new Error('useKillchainChrome must be used within KillchainChromeProvider')
  }
  return ctx
}
