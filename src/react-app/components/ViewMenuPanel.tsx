import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useGallery } from '../context/GalleryContext'
import { useKillchainChrome } from '../context/KillchainChromeContext'
import type { ViewMode } from '../types/killchain'
import {
  buildDeconstructSearch,
  buildGlobePresetSearch,
  canAccessDeconstruct,
  getDeconstructDisabledReason,
} from '../utils/viewMenuNavigation'
import {
  ensureHuggingFacePreconnect,
  preloadTechniqueImages,
} from '../utils/preloadTechniqueImages'
import './ViewMenuPanel.css'
import { CornerArrowIcon } from './corner-chrome/CornerMenuIcons'

const MODES: {
  id: ViewMode
  label: string
  path: string
  previewSrc: string
  intro: string
}[] = [
  {
    id: 'globe',
    label: 'Globe',
    path: '/',
    previewSrc: '/mode-previews/globe.mov',
    intro:
      'Explore the dataset as a spatial field of faces, clustered by category and complexity across the full gallery.',
  },
  {
    id: 'deconstruct',
    label: 'Deconstruct',
    path: '/deconstruct',
    previewSrc: '/mode-previews/deconstruct.mov',
    intro:
      'Follow a single attack path through the kill chain, node by node, to see how techniques connect in a real observed flow.',
  },
  {
    id: 'matrix',
    label: 'Matrix',
    path: '/matrix',
    previewSrc: '/mode-previews/matrix.mov',
    intro:
      'Browse the full taxonomy by stage, mix techniques across columns, and compare your selections against observed paths.',
  },
]

function WarningIcon() {
  return (
    <svg
      className="view-menu-panel__intro-warning-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M8 1.5L14.5 13.5H1.5L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path d="M8 6v3.25" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="8" cy="11.25" r="0.75" fill="currentColor" />
    </svg>
  )
}

function ModeArrowIcon() {
  return <CornerArrowIcon />
}

type PanelTab = 'changelog' | 'research' | 'disclaimer'

const TAB_CONTENT: Record<PanelTab, string> = {
  changelog: `V1.0 [September 2026]

Initial public release
- 25 techniques across 4 stages
- 22 observed attack paths
- 2 signal-only attack paths

[Future entries added as techniques are added or revised]

Note:
Technique IDs (e.g. TA-01, AR-04) are stable identifiers. They will not be reassigned across versions. New techniques receive new IDs.`,
  research: `Work with our research team

We publish our taxonomy, observed attack paths, and academic research on identity fraud techniques. Contact us to collaborate on new techniques in asset creation and refinement.`,
  disclaimer: `Disclaimer

All techniques and observed paths are derived from Persona's observation of attacks against production identity verification systems. No specific customer data or individual incident details are disclosed.`,
}

interface ViewMenuPanelProps {
  onClose: () => void
  onNavigate: (target: string) => void
  menuVisible?: boolean
}

function ModePreviewVideos({
  activeMode,
  menuVisible,
}: {
  activeMode: ViewMode
  menuVisible: boolean
}) {
  const videoRefs = useRef<Partial<Record<ViewMode, HTMLVideoElement>>>({})

  const resumePlayback = useCallback(() => {
    for (const mode of MODES) {
      const video = videoRefs.current[mode.id]
      if (!video) continue
      void video.play().catch(() => undefined)
    }
  }, [])

  useLayoutEffect(() => {
    resumePlayback()
  }, [resumePlayback])

  useLayoutEffect(() => {
    if (!menuVisible) return
    resumePlayback()
  }, [menuVisible, resumePlayback])

  return (
    <>
      {MODES.map((mode) => (
        <video
          key={mode.id}
          ref={(element) => {
            if (element) videoRefs.current[mode.id] = element
            else delete videoRefs.current[mode.id]
          }}
          className={`view-menu-panel__preview-video${
            mode.id === activeMode ? ' view-menu-panel__preview-video--active' : ''
          }`}
          src={mode.previewSrc}
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden={mode.id !== activeMode}
          onLoadedData={resumePlayback}
        />
      ))}
    </>
  )
}

export function ViewMenuPanel({ onClose, onNavigate, menuVisible = true }: ViewMenuPanelProps) {
  const location = useLocation()
  const { selectedItem } = useGallery()
  const { matrixSelections } = useKillchainChrome()
  const [activeTab, setActiveTab] = useState<PanelTab | null>(null)
  const [previewMode, setPreviewMode] = useState<ViewMode>('globe')

  const currentMode: ViewMode =
    location.pathname === '/matrix'
      ? 'matrix'
      : location.pathname === '/deconstruct'
        ? 'deconstruct'
        : 'globe'

  const navigationContext = useMemo(
    () => ({
      pathname: location.pathname,
      search: location.search,
      selectedItem,
      matrixSelections,
    }),
    [location.pathname, location.search, matrixSelections, selectedItem],
  )

  const canAccessDeconstructMode = useMemo(
    () => canAccessDeconstruct(navigationContext),
    [navigationContext],
  )

  const isModeDisabled = (mode: ViewMode) =>
    mode === 'deconstruct' && !canAccessDeconstructMode

  const getModeDisabledReason = (mode: ViewMode) => {
    if (mode !== 'deconstruct' || canAccessDeconstructMode) return null
    return getDeconstructDisabledReason(navigationContext)
  }

  const preview = MODES.find((mode) => mode.id === previewMode) ?? MODES[0]
  const previewDisabledReason =
    preview.id === 'deconstruct' ? getModeDisabledReason('deconstruct') : null

  useEffect(() => {
    setPreviewMode(currentMode)
  }, [currentMode])

  const handleModePreview = (mode: ViewMode) => {
    setPreviewMode(mode)
    if (mode === 'matrix') {
      ensureHuggingFacePreconnect()
      preloadTechniqueImages()
    }
  }

  const handleTabClick = (tab: PanelTab) => {
    setActiveTab((current) => (current === tab ? null : tab))
  }

  const buildModeTarget = (mode: ViewMode) => {
    const presetSearch = buildGlobePresetSearch(
      selectedItem,
      location.search,
      location.pathname === '/matrix' ? matrixSelections : null,
    )

    if (mode === 'globe') {
      return presetSearch ? `/${presetSearch}` : '/'
    }

    if (mode === 'deconstruct' && location.pathname === '/matrix' && matrixSelections) {
      return `/deconstruct${buildDeconstructSearch(matrixSelections, location.search)}`
    }

    const basePath = MODES.find((entry) => entry.id === mode)?.path ?? '/'
    return `${basePath}${presetSearch}`
  }

  return (
    <div className="view-menu-panel">
      <div className="view-menu-panel__upper">
        <nav className="view-menu-panel__modes" aria-label="View modes">
          {MODES.map((mode, index) => {
            const isActive = currentMode === mode.id
            const disabled = isModeDisabled(mode.id)
            return (
              <div
                key={mode.id}
                className="view-menu-panel__mode-wrap"
                onMouseEnter={() => handleModePreview(mode.id)}
                onFocus={() => handleModePreview(mode.id)}
                onMouseLeave={(event) => {
                  const next = event.relatedTarget
                  if (next instanceof Node && event.currentTarget.contains(next)) return
                  setPreviewMode(currentMode)
                }}
              >
                <button
                  type="button"
                  className={`view-menu-panel__mode${isActive ? ' view-menu-panel__mode--active' : ''}`}
                  disabled={disabled}
                  onFocus={() => handleModePreview(mode.id)}
                  onClick={() => {
                    if (disabled) return
                    if (isActive) {
                      onClose()
                      return
                    }
                    onNavigate(buildModeTarget(mode.id))
                  }}
                >
                  <span className="view-menu-panel__mode-label">{mode.label}</span>
                  <span className="view-menu-panel__mode-arrow">
                    <ModeArrowIcon />
                  </span>
                </button>
                {index < MODES.length - 1 && (
                  <div className="view-menu-panel__mode-divider" aria-hidden />
                )}
              </div>
            )
          })}
        </nav>
      </div>

      <div className="view-menu-panel__footer">
        <div className="view-menu-panel__content-shell">
          <div
            className={`view-menu-panel__content${activeTab ? ' view-menu-panel__content--tab' : ''}`}
          >
            {activeTab ? (
              <div className="view-menu-panel__content-body">
                <p className="view-menu-panel__text">{TAB_CONTENT[activeTab]}</p>
              </div>
            ) : (
              <div className="view-menu-panel__preview-header">
                <p className="view-menu-panel__intro-label">{preview.label}</p>
                {previewDisabledReason ? (
                  <p className="view-menu-panel__intro-warning" role="alert">
                    <WarningIcon />
                    <span>{previewDisabledReason}</span>
                  </p>
                ) : null}
                <p className="view-menu-panel__intro-text">{preview.intro}</p>
              </div>
            )}
          </div>
          <div
            className={`view-menu-panel__preview-shell${
              activeTab ? ' view-menu-panel__preview-shell--hidden' : ''
            }`}
            aria-hidden={!!activeTab}
          >
            <div
              className="view-menu-panel__preview-frame"
              aria-label={`${preview.label} preview`}
            >
              <ModePreviewVideos activeMode={previewMode} menuVisible={menuVisible} />
            </div>
          </div>
        </div>

        <div className="view-menu-panel__tabs">
          {(['changelog', 'research', 'disclaimer'] as PanelTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`view-menu-panel__tab${activeTab === tab ? ' view-menu-panel__tab--active' : ''}`}
              onClick={() => handleTabClick(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
