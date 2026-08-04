import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'

import viewEndNodeIcon from '../../assets/icons/view-end-node.png'
import ta04TagIcon from '../../assets/icons/ta-04-tag.png'
import { ComplexityBadge } from '../ComplexityBadge'
import { BlurInImage } from '../BlurInImage'
import TechniqueCard from '../matrix/TechniqueCard'
import { taxonomy } from '../../data/taxonomyData'
import type { GalleryItem } from '../../types/gallery'
import type { TechniqueState } from '../../utils/taxonomyHelpers'
import { formatDisplayDescription } from '../../utils/formatDisplayText'
import { getStageIdFromTechnique } from '../../utils/techniqueStage'
import { GALLERY_DISPLAY_IMAGE, galleryDisplayImageUrl } from '../../lib/taxonomy'

import './DeconstructBreakdownPanel.css'
import { TECHNIQUE_CARD_EXPAND_MS } from '../../constants/techniqueCardMotion'

const PANEL_EASE = [0.33, 1, 0.68, 1] as const

function getRelativeTop(element: HTMLElement, container: HTMLElement) {
  const elementRect = element.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  return elementRect.top - containerRect.top + container.scrollTop
}

function scheduleTechniqueScroll(scroll: () => void) {
  scroll()
  const frame = requestAnimationFrame(scroll)
  const timer = window.setTimeout(scroll, TECHNIQUE_CARD_EXPAND_MS + 40)

  return () => {
    cancelAnimationFrame(frame)
    window.clearTimeout(timer)
  }
}

const panelMotion = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.32, ease: PANEL_EASE },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.22, ease: PANEL_EASE },
  },
}

const resultPanelMotion = {
  initial: { opacity: 0, x: -32 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: {
    opacity: 0,
    x: -18,
    transition: { duration: 0.28, ease: PANEL_EASE },
  },
}

function chunkTags<T>(tags: T[], size: number): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < tags.length; i += size) {
    rows.push(tags.slice(i, i + size))
  }
  return rows
}

function ResultTagIcon() {
  return (
    <img
      src={ta04TagIcon}
      alt=""
      className="deconstruct-panel__tag-icon"
      aria-hidden
    />
  )
}

interface ResultContentProps {
  item: GalleryItem
}

function ResultContent({ item }: ResultContentProps) {
  return (
    <div className="deconstruct-panel__result">
      <div className="deconstruct-panel__result-body">
        <div className="deconstruct-panel__result-heading">
          <span className="deconstruct-panel__result-label">
            <img
              src={viewEndNodeIcon}
              alt=""
              className="deconstruct-panel__result-label-icon"
              aria-hidden
            />
            Result
          </span>
          <p className="deconstruct-panel__description">
            {formatDisplayDescription(item.description)}
          </p>
          <div className="deconstruct-panel__image-wrap">
            <BlurInImage
              src={galleryDisplayImageUrl(
                item.imageUrl,
                GALLERY_DISPLAY_IMAGE.deconstructPanel,
              )}
              alt=""
              className="deconstruct-panel__image"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        </div>
        <div className="deconstruct-panel__tags">
          {chunkTags(item.tags, 3).map((row, rowIndex) => (
            <div key={rowIndex} className="deconstruct-panel__tag-row">
              {row.map((tag) => (
                <span key={tag} className="deconstruct-panel__tag">
                  <ResultTagIcon />
                  {tag}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <ComplexityBadge complexity={item.complexity} />
    </div>
  )
}

interface TechniqueContentProps {
  techniqueId: string
  pathTechniques: Set<string>
  techniqueInfoExpanded: boolean
  techniqueImageOverrides?: Partial<Record<string, string>>
  onSelectTechnique: (id: string) => void
  onToggleTechniqueInfo: (id: string) => void
}

function getCardState(isInPath: boolean): TechniqueState {
  if (!isInPath) return 'locked'
  return 'selected'
}

function TechniqueContent({
  techniqueId,
  pathTechniques,
  techniqueInfoExpanded,
  techniqueImageOverrides,
  onSelectTechnique,
  onToggleTechniqueInfo,
  listScrollRef,
  showBottomFade,
}: TechniqueContentProps & {
  listScrollRef: RefObject<HTMLDivElement | null>
  showBottomFade: boolean
}) {
  const stageId = getStageIdFromTechnique(techniqueId)
  const stage = useMemo(
    () => (stageId ? taxonomy.find((s) => s.id === stageId) : null),
    [stageId],
  )

  if (!stage) return null

  return (
    <div
      className={`deconstruct-panel__technique-viewport${
        showBottomFade ? ' deconstruct-panel__technique-viewport--fade-bottom' : ''
      }`}
    >
      <div className="deconstruct-panel__technique-scroll" ref={listScrollRef}>
        <div className="deconstruct-panel__stage-header">
          <h2 className="deconstruct-panel__stage-title">{stage.stage}</h2>
          <p className="deconstruct-panel__stage-desc">{stage.description}</p>
        </div>
        <div className="deconstruct-panel__technique-list">
          {stage.techniques.map((tech) => {
            const isActive = tech.id === techniqueId
            const isInPath = pathTechniques.has(tech.id)
            const state = getCardState(isInPath)

            return (
              <div
                key={tech.id}
                className="deconstruct-panel__technique-item"
                data-technique-id={tech.id}
                data-active={isActive ? 'true' : undefined}
              >
                <TechniqueCard
                  tech={tech}
                  state={state}
                  isExpanded={isActive && techniqueInfoExpanded}
                  orderIdx={null}
                  imageOverride={techniqueImageOverrides?.[tech.id]}
                  onSelect={() => onSelectTechnique(tech.id)}
                  onToggleInfo={() => onToggleTechniqueInfo(tech.id)}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export type BreakdownMode = 'result' | 'technique'

interface DeconstructBreakdownPanelProps {
  mode: BreakdownMode
  galleryItem: GalleryItem | null
  selectedTechniqueId: string | null
  techniqueInfoExpanded: boolean
  techniqueImageOverrides?: Partial<Record<string, string>>
  pathTechniques: Set<string>
  onSelectTechnique: (id: string) => void
  onToggleTechniqueInfo: (id: string) => void
  embedded?: boolean
}

export default function DeconstructBreakdownPanel({
  mode,
  galleryItem,
  selectedTechniqueId,
  techniqueInfoExpanded,
  techniqueImageOverrides,
  pathTechniques,
  onSelectTechnique,
  onToggleTechniqueInfo,
  embedded = false,
}: DeconstructBreakdownPanelProps) {
  const listScrollRef = useRef<HTMLDivElement>(null)
  const [showBottomFade, setShowBottomFade] = useState(false)

  const updateBottomFade = useCallback(() => {
    const el = listScrollRef.current
    if (!el) {
      setShowBottomFade(false)
      return
    }

    const hasOverflow = el.scrollHeight - el.clientHeight > 1
    const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1
    setShowBottomFade(hasOverflow && !isAtBottom)
  }, [])

  const scrollToActiveTechnique = useCallback(() => {
    const scrollEl = listScrollRef.current
    if (!scrollEl || !selectedTechniqueId) return

    const activeItem = scrollEl.querySelector<HTMLElement>(
      `[data-technique-id="${selectedTechniqueId}"]`,
    )
    if (!activeItem) return

    const headerEl = scrollEl.querySelector<HTMLElement>('.deconstruct-panel__stage-header')
    const headerHeight = headerEl?.offsetHeight ?? 0
    const targetTop = getRelativeTop(activeItem, scrollEl)
    const maxScrollTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight)
    const desiredScrollTop = Math.max(0, targetTop - headerHeight - 12)

    scrollEl.scrollTop = Math.min(maxScrollTop, desiredScrollTop)
  }, [selectedTechniqueId])

  useLayoutEffect(() => {
    if (mode !== 'technique' || !selectedTechniqueId) {
      setShowBottomFade(false)
      return
    }

    updateBottomFade()

    const el = listScrollRef.current
    if (!el) return

    const resizeObserver = new ResizeObserver(() => {
      updateBottomFade()
      scrollToActiveTechnique()
    })
    resizeObserver.observe(el)
    el.addEventListener('scroll', updateBottomFade, { passive: true })

    return () => {
      resizeObserver.disconnect()
      el.removeEventListener('scroll', updateBottomFade)
    }
  }, [mode, selectedTechniqueId, updateBottomFade, scrollToActiveTechnique])

  useLayoutEffect(() => {
    if (mode !== 'technique' || !selectedTechniqueId) return
    return scheduleTechniqueScroll(scrollToActiveTechnique)
  }, [mode, selectedTechniqueId, techniqueInfoExpanded, scrollToActiveTechnique])

  return (
    <aside className={`deconstruct-panel${embedded ? ' deconstruct-panel--embedded' : ''}`}>
      <div
        className={`deconstruct-panel__content${
          mode === 'technique'
            ? ' deconstruct-panel__content--technique'
            : mode === 'result'
              ? ' deconstruct-panel__content--result'
              : ''
        }`}
      >
        <AnimatePresence mode="wait">
          {mode === 'result' && galleryItem ? (
            <motion.div
              key="result"
              className="deconstruct-panel__motion-wrap deconstruct-panel__motion-wrap--result"
              {...resultPanelMotion}
            >
              <ResultContent item={galleryItem} />
            </motion.div>
          ) : selectedTechniqueId ? (
            <motion.div
              key={getStageIdFromTechnique(selectedTechniqueId) ?? selectedTechniqueId}
              className="deconstruct-panel__motion-wrap deconstruct-panel__motion-wrap--technique"
              {...panelMotion}
            >
              <TechniqueContent
                techniqueId={selectedTechniqueId}
                pathTechniques={pathTechniques}
                techniqueInfoExpanded={techniqueInfoExpanded}
                techniqueImageOverrides={techniqueImageOverrides}
                onSelectTechnique={onSelectTechnique}
                onToggleTechniqueInfo={onToggleTechniqueInfo}
                listScrollRef={listScrollRef}
                showBottomFade={showBottomFade}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </aside>
  )
}
