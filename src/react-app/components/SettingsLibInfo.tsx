import { useSiteMetadata } from '../hooks/useSiteMetadata'
import { NetworkDotOrb } from './corner-chrome/NetworkDotOrb'
import './SettingsLibInfo.css'

export function SettingsLibInfo() {
  const { siteTitle, version, accessStamp, hfChanges, imagesLoaded, networkLoad } =
    useSiteMetadata()

  return (
    <div className="settings-lib-info">
      <div className="settings-lib-info__grid">
        <div className="settings-lib-info__copy">
          <p className="settings-lib-info__primary">
            {siteTitle}
            <span className="settings-lib-info__muted">
              {'\n'}Ver. {version}
              {'\n\n'}
              <span className="settings-lib-info__brackets">
                [
                <span className="settings-lib-info__online-dot" aria-hidden />
                ]
              </span>
            </span>
            <span className="settings-lib-info__status">
              {'\n'}Initialized — ONline
            </span>
            <span className="settings-lib-info__muted">
              {'\n'}
              {accessStamp}
              {'\n\n'}
            </span>
          </p>
          <p className="settings-lib-info__status">
            <span className="settings-lib-info__changes-row">
              <span>{hfChanges}+ Changes</span>
              <span className="settings-lib-info__muted"> (last 30 mins)</span>
            </span>
            <span className="settings-lib-info__muted">{'\n'}</span>
            <span>{imagesLoaded.toLocaleString()}</span>
            <span className="settings-lib-info__muted"> Images loaded</span>
          </p>
        </div>
        <NetworkDotOrb load={networkLoad} size={25} />
      </div>
    </div>
  )
}
