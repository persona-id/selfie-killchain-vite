import { useGlobeIntro } from '../../context/GlobeIntroContext'
import type {
  LeftChromeState,
  TopBarChromeState,
} from '../../context/KillchainChromeContext'
import { HamburgerMenu } from '../HamburgerMenu'
import UtilityMenu from '../utility-menu/UtilityMenu'
import { ComplexityCornerMenu } from './ComplexityCornerMenu'
import { LibTitleCorner } from './LibTitleCorner'
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
  fadeInGlobeEntrance?: boolean
}

export function KillchainCornerChrome({
  variant,
  left,
  topBar,
  entranceReady,
  hidden,
  chromeEntranceKey,
  fadeInGlobeEntrance = false,
}: KillchainCornerChromeProps) {
  const { introActive, chromeRevealReady } = useGlobeIntro()
  const isGlobe = variant === 'globe'
  const showLibTitle = isGlobe && left.visible
  const showStageNavShell = !isGlobe && left.visible && Boolean(left.stageNav)
  const showComplexity = Boolean(left.complexityNav) && isGlobe
  const showSettings = isGlobe
  const settingsHidden = hidden || (isGlobe && introActive && !chromeRevealReady)

  return (
    <div
      className={`killchain-corner-chrome${hidden ? ' killchain-corner-chrome--hidden' : ''}`}
      aria-hidden={hidden}
    >
      <div className="killchain-corner-chrome__corner killchain-corner-chrome__corner--tl">
        {showLibTitle ? (
          <LibTitleCorner
            stageNav={null}
            expanded={false}
            body={null}
            entranceReady={entranceReady}
            fadeIn={fadeInGlobeEntrance}
          />
        ) : null}
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
          layout={variant === 'deconstruct' ? 'full' : 'menu-only'}
          entranceReady={entranceReady && !hidden}
          onFitToScreen={topBar.onFitToScreen}
          onViewResult={topBar.onViewResult}
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
        {showComplexity && left.complexityNav ? (
          <ComplexityCornerMenu
            activeComplexity={left.complexityNav.activeComplexity}
            onSelect={left.complexityNav.onSelect}
            entranceReady={entranceReady && !hidden}
            hidden={hidden}
          />
        ) : null}
      </div>
    </div>
  )
}
