import './TopToolbar.css'

type ToolbarLabel = 'RESULT' | 'FULL CHAIN' | 'MATRIX'

interface TopToolbarProps {
  label?: ToolbarLabel
  onReset?: () => void
  showReset?: boolean
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

function EyeIcon() {
  return (
    <svg width="41" height="29" viewBox="0 0 41 29" fill="none" aria-hidden>
      <ellipse cx="20.5" cy="14.5" rx="18" ry="10" stroke="#929292" strokeWidth="1.5" />
      <circle cx="20.5" cy="14.5" r="4" fill="#929292" />
    </svg>
  )
}

function TopToolbar({ label, onReset, showReset = false }: TopToolbarProps) {
  return (
    <div className="top-toolbar">
      <div className="top-toolbar__actions">
        <button type="button" className="top-toolbar__icon-btn" aria-label="Menu">
          <GridIcon />
        </button>
        {showReset && onReset && (
          <button
            type="button"
            className="top-toolbar__icon-btn"
            aria-label="Reset"
            onClick={onReset}
          >
            <ResetIcon />
          </button>
        )}
        <button type="button" className="top-toolbar__icon-btn" aria-label="View">
          <EyeIcon />
        </button>
        {label && <span className="top-toolbar__label">{label}</span>}
      </div>
    </div>
  )
}

export default TopToolbar
