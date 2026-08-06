import { useSiteMetadata } from '../../hooks/useSiteMetadata'
import './KillchainTopMenuHeader.css'

interface KillchainTopMenuHeaderProps {
  hidden?: boolean
  entranceReady?: boolean
}

function MetaLine({
  children,
  lineIndex,
  active,
}: {
  children: string
  lineIndex: number
  active: boolean
}) {
  return (
    <p
      className={`killchain-top-menu-header__line${
        active ? ' killchain-top-menu-header__line--active' : ''
      }`}
      style={{ '--line-index': lineIndex } as React.CSSProperties}
    >
      {children}
    </p>
  )
}

export function KillchainTopMenuHeader({
  hidden = false,
  entranceReady = true,
}: KillchainTopMenuHeaderProps) {
  const { version } = useSiteMetadata()
  const active = entranceReady && !hidden

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

      <div className="killchain-top-menu-header__meta" aria-hidden={!active}>
        <div className="killchain-top-menu-header__meta-col">
          <MetaLine lineIndex={0} active={active}>
            SELFIE.LIB
          </MetaLine>
          <MetaLine lineIndex={1} active={active}>
            {`VER. ${version}`}
          </MetaLine>
        </div>
        <div className="killchain-top-menu-header__meta-col">
          <MetaLine lineIndex={2} active={active}>
            A DIGITAL TAXONOMY OF
          </MetaLine>
          <MetaLine lineIndex={3} active={active}>
            VERIFICATION FRAUD BY PERSONA
          </MetaLine>
        </div>
      </div>
    </header>
  )
}
