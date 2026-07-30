import { taxonomy } from '../../data/taxonomyData'
import { getStageNavStatus } from '../../utils/stageNav'
import type { Selections } from '../../types/killchain'

function ResetIcon() {
  return (
    <svg width="29" height="31" viewBox="0 0 29 31" fill="none" aria-hidden>
      <path
        d="M14.5 4v6M14.5 4a10 10 0 1 0 10 10"
        stroke="#929292"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="31" height="31" viewBox="0 0 31 31" fill="none" aria-hidden>
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <circle
            key={`${row}-${col}`}
            cx={4.3 + col * 13.3}
            cy={4.3 + row * 13.3}
            r="2.2"
            fill="#929292"
          />
        ))
      )}
    </svg>
  )
}

interface StageNavProps {
  selections: Selections
  matchingCount: number
  onReset: () => void
  hasAnySelection: boolean
}

export default function StageNav({
  selections,
  matchingCount,
  onReset,
  hasAnySelection,
}: StageNavProps) {
  return (
    <header className="killchain-header">
      <nav className="stage-nav" aria-label="Kill chain progress">
        <div className="stage-nav__track">
          {taxonomy.map((stage, i) => {
            const status = getStageNavStatus(stage.id, selections)
            return (
              <div key={stage.id} className="stage-nav__segment">
                <div
                  className={`stage-nav__pill stage-nav__pill--${status}`}
                  aria-current={status === 'current' ? 'step' : undefined}
                >
                  <span>{stage.id}</span>
                </div>
                {i < taxonomy.length - 1 && (
                  <span className="stage-nav__connector" aria-hidden />
                )}
              </div>
            )
          })}
        </div>
      </nav>

      <div className="killchain-header__actions">
        <span className="killchain-header__count" data-empty={matchingCount === 0 || undefined}>
          {matchingCount} path{matchingCount === 1 ? '' : 's'}
        </span>
        <div className="killchain-header__utility">
          <button type="button" className="killchain-header__icon-btn" aria-label="Menu" disabled>
            <GridIcon />
          </button>
          <button
            type="button"
            className="killchain-header__icon-btn"
            aria-label="Reset selections"
            onClick={onReset}
            disabled={!hasAnySelection}
          >
            <ResetIcon />
          </button>
        </div>
      </div>
    </header>
  )
}
