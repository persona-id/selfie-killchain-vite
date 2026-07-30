import type { Selections } from '../types/killchain'
import UtilityMenu from './utility-menu/UtilityMenu'

interface KillchainTopBarProps {
  variant: 'globe' | 'matrix' | 'deconstruct'
  selections?: Selections
  entranceReady?: boolean
  onFitToScreen?: () => void
  onViewResult?: () => void
  fitToScreenActive?: boolean
  viewResultActive?: boolean
}

export default function KillchainTopBar({
  variant,
  entranceReady,
  onFitToScreen,
  onViewResult,
  fitToScreenActive = false,
  viewResultActive = false,
}: KillchainTopBarProps) {
  const layout = variant === 'deconstruct' ? 'full' : 'menu-only'

  return (
    <UtilityMenu
      layout={layout}
      entranceReady={entranceReady}
      onFitToScreen={onFitToScreen}
      onViewResult={onViewResult}
      fitToScreenActive={fitToScreenActive}
      viewResultActive={viewResultActive}
    />
  )
}
