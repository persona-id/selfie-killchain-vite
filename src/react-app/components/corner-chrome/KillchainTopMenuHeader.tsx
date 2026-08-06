import { useMemo } from 'react'

import { useSequentialTypewriter } from '../../hooks/useSequentialTypewriter'
import { useSiteMetadata } from '../../hooks/useSiteMetadata'
import './KillchainTopMenuHeader.css'

interface KillchainTopMenuHeaderProps {
  hidden?: boolean
  entranceReady?: boolean
}

function TypewriterLine({
  fullText,
  value,
  showCursor,
}: {
  fullText: string
  value: string
  showCursor: boolean
}) {
  return (
    <p>
      <span className="killchain-top-menu-header__line">
        <span className="killchain-top-menu-header__line-measure" aria-hidden>
          {fullText}
        </span>
        <span className="killchain-top-menu-header__line-typed">
          {value}
          {showCursor ? (
            <span className="killchain-top-menu-header__cursor" aria-hidden />
          ) : null}
        </span>
      </span>
    </p>
  )
}

export function KillchainTopMenuHeader({
  hidden = false,
  entranceReady = true,
}: KillchainTopMenuHeaderProps) {
  const { siteTitle, version } = useSiteMetadata()
  const lines = useMemo(
    () => [
      siteTitle,
      `Ver. ${version}`,
      'A digital taxonomy of',
      'Verification fraud by Persona',
    ],
    [siteTitle, version],
  )
  const active = entranceReady && !hidden
  const { values, lineIndex, complete } = useSequentialTypewriter(lines, active)

  return (
    <header
      className={`killchain-top-menu-header${
        entranceReady ? ' killchain-top-menu-header--visible' : ''
      }${hidden ? ' killchain-top-menu-header--hidden' : ''}`}
      aria-label="Site"
    >
      <a
        className="killchain-top-menu-header__logo"
        href="https://withpersona.com"
        target="_blank"
        rel="noreferrer"
        aria-label="Persona"
      >
        <img src="/icons/persona-mark-white.png" alt="" />
      </a>

      <div className="killchain-top-menu-header__meta" aria-hidden={!complete}>
        <div className="killchain-top-menu-header__meta-col">
          <TypewriterLine
            fullText={lines[0]}
            value={values[0] ?? ''}
            showCursor={lineIndex === 0 && !complete}
          />
          <TypewriterLine
            fullText={lines[1]}
            value={values[1] ?? ''}
            showCursor={lineIndex === 1 && !complete}
          />
        </div>
        <div className="killchain-top-menu-header__meta-col">
          <TypewriterLine
            fullText={lines[2]}
            value={values[2] ?? ''}
            showCursor={lineIndex === 2 && !complete}
          />
          <TypewriterLine
            fullText={lines[3]}
            value={values[3] ?? ''}
            showCursor={lineIndex === 3 && !complete}
          />
        </div>
      </div>
    </header>
  )
}
