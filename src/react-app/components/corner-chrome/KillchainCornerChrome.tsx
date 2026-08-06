import { useGlobeIntro } from '../../context/GlobeIntroContext'
import type {
  LeftChromeState,
  TopBarChromeState,
} from '../../context/KillchainChromeContext'
import { HamburgerMenu } from '../HamburgerMenu'
import UtilityMenu from '../utility-menu/UtilityMenu'
import { ComplexityCornerMenu } from './ComplexityCornerMenu'
import { KillchainTopMenuHeader } from './KillchainTopMenuHeader'
import { StageNavCorner } from './StageNavCorner'
import './KillchainCornerChrome.css'
import './StageNavCorner.css'

export type KillchainCornerVariant = 'globe' | 'matrix' | 'deconstruct'

interface KillchainCornerChromeProps {
  variant: KillchainCornerVariant
  left: LeftChromeState
  topBar: TopBarChromeState
  entranceReady: boolean
  hidden: boolean
  chromeEntranceKey: string
}

export function KillchainCornerChrome({
  variant,
  left,
  topBar,
  entranceReady,
  hidden,
  chromeEntranceKey,
}: KillchainCornerChromeProps) {
  const { introActive, chromeRevealReady } = useGlobeIntro()
  const isGlobe = variant === 'globe'
  const showStageNavShell = !isGlobe && left.visible && Boolean(left.stageNav)
  const showComplexity = Boolean(left.complexityNav) && isGlobe
  const showSettings = isGlobe
  const settingsHidden = hidden || (isGlobe && introActive && !chromeRevealReady)
  const utilityMenuLayout =
    variant === 'deconstruct' || (variant === 'matrix' && topBar.onReset) ? 'full' : 'menu-only'

  return (
    <div
      className={`killchain-corner-chrome${hidden ? ' killchain-corner-chrome--hidden' : ''}`}
      aria-hidden={hidden}
    >
      {isGlobe ? (
        <KillchainTopMenuHeader hidden={hidden} entranceReady={entranceReady} />
      ) : null}

      <div className="killchain-corner-chrome__corner killchain-corner-chrome__corner--tl">
        {showStageNavShell && left.stageNav ? (
          <StageNavCorner
            stageNav={left.stageNav}
            expanded={left.expanded}
            body={left.body}
          />
        ) : null}
      </div>

      <div className="killchain-corner-chrome__corner killchain-corner-chrome__corner--tr">
        <UtilityMenu
          layout={utilityMenuLayout}
          entranceReady={entranceReady && !hidden}
          onFitToScreen={topBar.onFitToScreen}
          onViewResult={topBar.onViewResult}
          onReset={topBar.onReset}
          fitToScreenActive={topBar.fitToScreenActive}
          viewResultActive={topBar.viewResultActive}
        />
      </div>

      {showSettings ? (
        <div className="killchain-corner-chrome__corner killchain-corner-chrome__corner--bl">
          <HamburgerMenu
            embedded
            entranceKey={chromeEntranceKey}
            hidden={settingsHidden}
          />
        </div>
      ) : null}

      <div className="killchain-corner-chrome__corner killchain-corner-chrome__corner--br">
        {showComplexity ? (
          <ComplexityCornerMenu
            entranceReady={entranceReady && !hidden}
            hidden={hidden}
          />
        ) : null}
      </div>
    </div>
  )
}
