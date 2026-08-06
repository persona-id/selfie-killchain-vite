import { useSiteMetadata } from '../../hooks/useSiteMetadata'
import './KillchainTopMenuHeader.css'

interface KillchainTopMenuHeaderProps {
  hidden?: boolean
  entranceReady?: boolean
}

export function KillchainTopMenuHeader({
  hidden = false,
  entranceReady = true,
}: KillchainTopMenuHeaderProps) {
  const { siteTitle, version } = useSiteMetadata()
  const active = entranceReady && !hidden

  return (
    <header
      className={`killchain-top-menu-header${
        entranceReady ? ' killchain-top-menu-header--visible' : ''
      }${hidden ? ' killchain-top-menu-header--hidden' : ''}${
        active ? ' killchain-top-menu-header--active' : ''
      }`}
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

      <div className="killchain-top-menu-header__meta">
        <p>{siteTitle}</p>
        <p>Ver.{version}</p>
        <p>A digital taxonomy of verification fraud by Persona</p>
      </div>
    </header>
  )
}
