import { useMemo } from 'react'

import { useSequentialTypewriter } from '../../hooks/useSequentialTypewriter'
import { useSiteMetadata } from '../../hooks/useSiteMetadata'
import './KillchainTopMenuHeader.css'

const LOGO_WIDTH = 31
const LOGO_HEIGHT = 41

interface KillchainTopMenuHeaderProps {
  hidden?: boolean
  entranceReady?: boolean
}

export function KillchainTopMenuHeader({
  hidden = false,
  entranceReady = true,
}: KillchainTopMenuHeaderProps) {
  const { siteTitle, version } = useSiteMetadata()
  const lines = useMemo(
    () => [
      siteTitle,
      `V${version}`,
      'A DIGITAL TAXONOMY OF GENERATED FACIAL SELFIES',
      'BY PERSONA',
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
        <img
          src="/icons/persona-mark-white.png"
          alt=""
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
        />
      </a>

      <div className="killchain-top-menu-header__meta" aria-hidden={!complete}>
        <div className="killchain-top-menu-header__meta-col">
          <p>
            {values[0]}
            {lineIndex === 0 && !complete ? (
              <span className="killchain-top-menu-header__cursor" aria-hidden />
            ) : null}
          </p>
          <p>
            {values[1]}
            {lineIndex === 1 && !complete ? (
              <span className="killchain-top-menu-header__cursor" aria-hidden />
            ) : null}
          </p>
        </div>
        <div className="killchain-top-menu-header__meta-col">
          <p>
            {values[2]}
            {lineIndex === 2 && !complete ? (
              <span className="killchain-top-menu-header__cursor" aria-hidden />
            ) : null}
          </p>
          <p>
            {values[3]}
            {lineIndex === 3 && !complete ? (
              <span className="killchain-top-menu-header__cursor" aria-hidden />
            ) : null}
          </p>
        </div>
      </div>
    </header>
  )
}
