import { useGallery } from '../../context/GalleryContext'
import { useChromeEntranceReady } from '../../hooks/useChromeEntranceReady'
import './GroupsModeToggle.css'

interface GroupsModeToggleProps {
  entranceKey?: string
  hidden?: boolean
}

export function GroupsModeToggle({
  entranceKey,
  hidden = false,
}: GroupsModeToggleProps) {
  const { globeArrangement, setGlobeArrangement, setLinkCluster } = useGallery()
  const entranceReady = useChromeEntranceReady(entranceKey)
  const active = globeArrangement === 'clusters'
  const visible = entranceReady && !hidden

  const toggle = () => {
    if (active) {
      setGlobeArrangement('even')
      return
    }
    setLinkCluster({ enabled: false })
    setGlobeArrangement('clusters')
  }

  return (
    <button
      type="button"
      className={`groups-mode-toggle glass-surface${active ? ' groups-mode-toggle--on' : ''}${
        visible ? '' : ' groups-mode-toggle--hidden'
      }`}
      onClick={toggle}
      aria-pressed={active}
      aria-label={active ? 'Turn groups mode off' : 'Turn groups mode on'}
      title="Groups"
    >
      <span className="groups-mode-toggle__switch" aria-hidden>
        <span className="groups-mode-toggle__knob" />
      </span>
    </button>
  )
}
