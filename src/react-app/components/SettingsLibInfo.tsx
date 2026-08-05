import { useSiteMetadata } from '../hooks/useSiteMetadata'
import { NetworkDotOrb } from './corner-chrome/NetworkDotOrb'
import './SettingsLibInfo.css'

export function SettingsLibInfo() {
  const { siteTitle, version, accessStamp, hfChanges, imagesLoaded, networkLoad } =
    useSiteMetadata()

  return (
    <div className="settings-lib-info">
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
      </div>
      <NetworkDotOrb load={networkLoad} size={25} />
      <p className="settings-lib-info__metrics">
        <span className="settings-lib-info__changes-row">
          {hfChanges}+ Changes (last 30 mins)
        </span>
        {'\n'}
        {imagesLoaded.toLocaleString()} Images loaded
      </p>
    </div>
  )
}
