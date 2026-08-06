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
        <img src="/icons/persona-mark-white.png" alt="" width={23} height={30} />
      </a>

      <div className="killchain-top-menu-header__meta" aria-hidden>
        <div className="killchain-top-menu-header__meta-col">
          <p>{siteTitle}</p>
          <p>V{version}</p>
        </div>
        <div className="killchain-top-menu-header__meta-col">
          <p>A DIGITAL TAXONOMY OF GENERATED FACIAL SELFIES</p>
          <p>BY PERSONA</p>
        </div>
      </div>
    </header>
  )
}
