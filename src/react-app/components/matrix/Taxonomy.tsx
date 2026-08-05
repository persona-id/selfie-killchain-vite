import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'

import { observedPaths, taxonomy } from '../../data/taxonomyData'
import type { Selections, Stage } from '../../types/killchain'
import { useKillchainChrome } from '../../context/KillchainChromeContext'
import { parsePathToSelections } from '../../utils/parsePathToSelections'
import { tagsToSelections } from '../../utils/resolvePathFromTags'
import { buildMatrixImageOverrides, selectedTechniqueIds } from '../../utils/chainFaceImages'
import { getMatrixStageNavStages, getStageNavStatus } from '../../utils/stageNav'
import { MATRIX_STAGE_ORDER, getStageIdFromTechnique } from '../../utils/techniqueStage'
import { buildMatrixCardModel, matrixCardKey, type TechniqueState } from '../../utils/taxonomyHelpers'
import { hasMatrixBuiltPath } from '../../utils/viewMenuNavigation'
import {
  getMatrixCardDelay,
  getMatrixColumnHeaderDelay,
  getMatrixContentEntranceCompleteDelay,
  getMatrixEntranceNavCompleteDelay,
  MATRIX_NODE_EASE,
  MATRIX_NODE_FADE_S,
} from '../../utils/matrixIntro'
import {
  ensureHuggingFacePreconnect,
  preloadTechniqueImages,
} from '../../utils/preloadTechniqueImages'
import TechniqueCard from './TechniqueCard'
import './Taxonomy.css'

const matrixHeaderItem = {
  hidden: {
    opacity: 0,
    x: -28,
    scale: 0.985,
  },
  visible: (columnIndex: number) => ({
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      delay: getMatrixColumnHeaderDelay(columnIndex),
      duration: MATRIX_NODE_FADE_S,
      ease: MATRIX_NODE_EASE,
    },
  }),
}

const matrixCardItem = {
  hidden: {
    opacity: 0,
    x: -22,
    scale: 0.985,
  },
  visible: ({ columnIndex, rowIndex }: { columnIndex: number; rowIndex: number }) => ({
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      delay: getMatrixCardDelay(columnIndex, rowIndex),
      duration: MATRIX_NODE_FADE_S,
      ease: MATRIX_NODE_EASE,
    },
  }),
}

function ColumnHeader({ stage, isOptional }: { stage: Stage; isOptional: boolean }) {
  const tagLabel = `${stage.id} — ${stage.techniques.length} Techniques`

  return (
    <header className="column-header">
      <div className="column-header__intro">
        <div className="column-header__meta">
          <div className="column-header__tag">
            {isOptional && <span className="column-header__tag-dot" aria-hidden />}
            <span>{tagLabel}</span>
          </div>
        </div>
        <h2 className="column-header__title" id={`column-${stage.id}`}>
          <span className="column-header__name">{stage.stage}</span>
        </h2>
      </div>
      <div className="column-header__divider" aria-hidden />
      <p className="column-header__desc">{stage.description}</p>
    </header>
  )
}

function getInitialMatrixState(initialPathId?: string | null, initialTags?: string | null) {
  const emptySelections: Selections = { TA: null, AC: null, AR: [], DL: null }

  if (initialTags) {
    const tags = initialTags.split(',').filter(Boolean)
    if (tags.length > 0) {
      return { selections: tagsToSelections(tags) }
    }
  }

  if (initialPathId) {
    const path = observedPaths.find((p) => p.id === initialPathId)
    if (path) {
      return { selections: parsePathToSelections(path) }
    }
  }

  return { selections: emptySelections }
}

function hasInitialChainContext(initialPathId?: string | null, initialTags?: string | null) {
  if (initialTags?.split(',').filter(Boolean).length) return true
  return Boolean(initialPathId)
}

function selectionsToExpandedKeys(selections: Selections) {
  const keys = new Set<string>()
  const techniqueIds = [
    selections.TA,
    selections.AC,
    selections.DL,
    ...(selections.AR || []),
  ].filter((id): id is string => Boolean(id))

  for (const techId of techniqueIds) {
    const stageId = getStageIdFromTechnique(techId)
    if (stageId) keys.add(matrixCardKey(stageId, techId))
  }

  return keys
}

interface MatrixTechniqueCardProps {
  tech: (typeof taxonomy)[number]['techniques'][number]
  stageId: string
  columnIndex: number
  rowIndex: number
  state: TechniqueState
  isExpanded: boolean
  orderIdx: number | null
  imageOverride?: string | null
  entranceComplete: boolean
  entranceMotion: { initial: false; animate?: undefined } | { initial: 'hidden'; animate: 'hidden' | 'visible' }
  onSelect: (techId: string, stageId: string) => void
  onToggleInfo: (techId: string, stageId: string) => void
}

const MatrixTechniqueCard = memo(function MatrixTechniqueCard({
  tech,
  stageId,
  columnIndex,
  rowIndex,
  state,
  isExpanded,
  orderIdx,
  imageOverride,
  entranceComplete,
  entranceMotion,
  onSelect,
  onToggleInfo,
}: MatrixTechniqueCardProps) {
  const handleSelect = useCallback(() => onSelect(tech.id, stageId), [onSelect, stageId, tech.id])
  const handleToggleInfo = useCallback(
    () => onToggleInfo(tech.id, stageId),
    [onToggleInfo, stageId, tech.id],
  )

  const card = (
    <TechniqueCard
      tech={tech}
      state={state}
      isExpanded={isExpanded}
      orderIdx={orderIdx}
      imageOverride={imageOverride}
      imageLoading="eager"
      imageFetchPriority={columnIndex === 0 ? 'high' : 'auto'}
      onSelect={handleSelect}
      onToggleInfo={handleToggleInfo}
    />
  )

  const shouldAnimate =
    entranceMotion.initial !== false && !entranceComplete

  return (
    <motion.div
      className={`matrix-card-shell${
        entranceComplete ? ' matrix-card-shell--entrance-complete' : ''
      }`}
      custom={{ columnIndex, rowIndex }}
      variants={shouldAnimate ? matrixCardItem : undefined}
      initial={shouldAnimate ? entranceMotion.initial : false}
      animate={shouldAnimate ? entranceMotion.animate : undefined}
      data-technique-id={tech.id}
    >
      {card}
    </motion.div>
  )
})

interface TaxonomyProps {
  initialPathId?: string | null
  initialTags?: string | null
  initialImageUrl?: string | null
}

export default function Taxonomy({ initialPathId, initialTags, initialImageUrl }: TaxonomyProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { setLeftChrome, setTopBarChrome, setMatrixSelections } = useKillchainChrome()
  const reduceMotion = useReducedMotion()
  const hasPresetPath = hasInitialChainContext(initialPathId, initialTags)
  const [matrixEntranceActive, setMatrixEntranceActive] = useState(reduceMotion ?? false)
  const [revealedStageIndex, setRevealedStageIndex] = useState(() =>
    reduceMotion || !hasPresetPath ? MATRIX_STAGE_ORDER.length - 1 : -1,
  )
  const [entranceNavComplete, setEntranceNavComplete] = useState(
    () => Boolean(reduceMotion) || !hasPresetPath,
  )
  const [matrixContentEntranceComplete, setMatrixContentEntranceComplete] = useState(
    Boolean(reduceMotion),
  )
  const initialMatrixState = useMemo(
    () => getInitialMatrixState(initialPathId, initialTags),
    [initialPathId, initialTags],
  )
  const [selections, setSelections] = useState<Selections>(initialMatrixState.selections)
  const [expandedCardKeys, setExpandedCardKeys] = useState<Set<string>>(() =>
    hasInitialChainContext(initialPathId, initialTags)
      ? selectionsToExpandedKeys(initialMatrixState.selections)
      : new Set(),
  )
  const selectionsRef = useRef(selections)
  selectionsRef.current = selections

  useEffect(() => {
    if (location.pathname !== '/matrix') {
      setMatrixSelections(null)
      return
    }

    setMatrixSelections(selections)
    return () => setMatrixSelections(null)
  }, [location.pathname, selections, setMatrixSelections])

  useEffect(() => {
    if (reduceMotion) {
      setMatrixEntranceActive(true)
      return
    }

    setMatrixEntranceActive(false)
    const frame = requestAnimationFrame(() => setMatrixEntranceActive(true))
    return () => cancelAnimationFrame(frame)
  }, [reduceMotion, location.pathname])

  useEffect(() => {
    if (reduceMotion || !hasPresetPath) {
      setRevealedStageIndex(MATRIX_STAGE_ORDER.length - 1)
      setEntranceNavComplete(true)
      return
    }

    if (!matrixEntranceActive) return

    setRevealedStageIndex(-1)
    setEntranceNavComplete(false)

    const revealTimers = MATRIX_STAGE_ORDER.map((_, index) =>
      window.setTimeout(() => {
        setRevealedStageIndex(index)
      }, getMatrixColumnHeaderDelay(index) * 1000),
    )

    const completeTimer = window.setTimeout(() => {
      setEntranceNavComplete(true)
    }, getMatrixEntranceNavCompleteDelay(MATRIX_STAGE_ORDER.length) * 1000)

    return () => {
      revealTimers.forEach((timer) => window.clearTimeout(timer))
      window.clearTimeout(completeTimer)
    }
  }, [hasPresetPath, reduceMotion, matrixEntranceActive, location.pathname])

  const matrixContentEntranceCompleteDelayMs = useMemo(() => {
    const lastStage = taxonomy[taxonomy.length - 1]
    return (
      getMatrixContentEntranceCompleteDelay(
        taxonomy.length,
        lastStage?.techniques.length ?? 0,
      ) * 1000
    )
  }, [])

  useEffect(() => {
    if (reduceMotion) {
      setMatrixContentEntranceComplete(true)
      return
    }

    if (!matrixEntranceActive) return

    setMatrixContentEntranceComplete(false)

    const completeTimer = window.setTimeout(() => {
      setMatrixContentEntranceComplete(true)
    }, matrixContentEntranceCompleteDelayMs)

    return () => window.clearTimeout(completeTimer)
  }, [matrixContentEntranceCompleteDelayMs, reduceMotion, matrixEntranceActive, location.pathname])

  useEffect(() => {
    if (initialTags) {
      const tags = initialTags.split(',').filter(Boolean)
      if (tags.length > 0) {
        const nextSelections = tagsToSelections(tags)
        setSelections(nextSelections)
        setExpandedCardKeys(selectionsToExpandedKeys(nextSelections))
        return
      }
    }

    if (!initialPathId) return
    const path = observedPaths.find((p) => p.id === initialPathId)
    if (path) {
      const nextSelections = parsePathToSelections(path)
      setSelections(nextSelections)
      setExpandedCardKeys(selectionsToExpandedKeys(nextSelections))
    }
  }, [initialPathId, initialTags])

  useEffect(() => {
    if (location.pathname !== '/matrix') {
      document.body.classList.remove('matrix-chrome-elevated')
      return
    }

    const updateChromeElevation = () => {
      const elevation = Math.min(1, Math.max(0, (window.scrollY - 4) / 24))
      document.documentElement.style.setProperty('--matrix-chrome-elevation', elevation.toFixed(3))
      document.body.classList.toggle('matrix-chrome-elevated', elevation > 0.02)
    }

    updateChromeElevation()
    window.addEventListener('scroll', updateChromeElevation, { passive: true })
    return () => {
      window.removeEventListener('scroll', updateChromeElevation)
      document.body.classList.remove('matrix-chrome-elevated')
      document.documentElement.style.removeProperty('--matrix-chrome-elevation')
    }
  }, [location.pathname])

  const cardModel = useMemo(() => buildMatrixCardModel(selections), [selections])
  const cardModelRef = useRef(cardModel)
  cardModelRef.current = cardModel

  const onToggleTechniqueInfo = useCallback((techId: string, stageId: string) => {
    const key = matrixCardKey(stageId, techId)
    setExpandedCardKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const onTechniqueClick = useCallback((techId: string, stageId: string) => {
    const selections = selectionsRef.current
    const state = cardModelRef.current.states.get(matrixCardKey(stageId, techId))
    if (state === 'locked' || state === 'unavailable') return

    const cardKey = matrixCardKey(stageId, techId)

    if (stageId === 'AR') {
      const cur = selections.AR || []
      if (cur.includes(techId)) {
        setExpandedCardKeys((prev) => {
          const next = new Set(prev)
          next.delete(cardKey)
          return next
        })
        setSelections({ ...selections, AR: cur.filter((t) => t !== techId), DL: null })
      } else {
        setExpandedCardKeys((prev) => {
          const next = new Set(prev)
          next.add(cardKey)
          return next
        })
        setSelections({ ...selections, AR: [...cur, techId], DL: null })
      }
      return
    }

    const isCurrentlySelected = selections[stageId as keyof Selections] === techId
    const newSel = { ...selections }
    if (stageId === 'TA') newSel.TA = isCurrentlySelected ? null : techId
    else if (stageId === 'AC') newSel.AC = isCurrentlySelected ? null : techId
    else if (stageId === 'DL') newSel.DL = isCurrentlySelected ? null : techId

    if (isCurrentlySelected) {
      setExpandedCardKeys((prev) => {
        const next = new Set(prev)
        next.delete(cardKey)
        return next
      })
    } else {
      setExpandedCardKeys((prev) => {
        const next = new Set(prev)
        next.add(cardKey)
        return next
      })
    }

    if (stageId === 'TA') {
      newSel.AC = null
      newSel.AR = []
      newSel.DL = null
    } else if (stageId === 'AC') {
      newSel.AR = []
      newSel.DL = null
    }

    setSelections(newSel)
  }, [])

  const handleReset = useCallback(() => {
    const emptySelections: Selections = { TA: null, AC: null, AR: [], DL: null }
    setSelections(emptySelections)
    setExpandedCardKeys(new Set())
    setRevealedStageIndex(MATRIX_STAGE_ORDER.length - 1)
    setEntranceNavComplete(true)
    setMatrixContentEntranceComplete(true)
    navigate('/matrix', { replace: true })
  }, [navigate])

  const showReset = hasPresetPath || hasMatrixBuiltPath(selections)

  const matrixStageNav = useMemo(
    () => getMatrixStageNavStages(selections, MATRIX_STAGE_ORDER),
    [selections],
  )

  const techniqueImageOverrides = useMemo(
    () =>
      buildMatrixImageOverrides(
        initialImageUrl,
        hasInitialChainContext(initialPathId, initialTags)
          ? selectedTechniqueIds(initialMatrixState.selections)
          : [],
      ),
    [initialImageUrl, initialMatrixState.selections, initialPathId, initialTags],
  )

  useLayoutEffect(() => {
    if (location.pathname !== '/matrix') return
    window.scrollTo(0, 0)
  }, [location.pathname, initialPathId, initialTags])

  useLayoutEffect(() => {
    ensureHuggingFacePreconnect()
    preloadTechniqueImages([
      initialImageUrl,
      ...Object.values(techniqueImageOverrides ?? {}),
    ])
  }, [initialImageUrl, techniqueImageOverrides])

  useLayoutEffect(() => {
    if (location.pathname !== '/matrix') return

    const useEntranceNav = !entranceNavComplete && !reduceMotion
    const entranceActiveStage =
      revealedStageIndex >= 0 ? MATRIX_STAGE_ORDER[revealedStageIndex] : null

    setLeftChrome({
      visible: true,
      expanded: false,
      complexityNav: null,
      stageNav: useEntranceNav
        ? {
            stageOrder: MATRIX_STAGE_ORDER,
            activeStage: entranceActiveStage,
            slidingIndicator: true,
            indicatorVisible: revealedStageIndex >= 0,
          }
        : {
            stageOrder: MATRIX_STAGE_ORDER,
            activeStages:
              matrixStageNav.activeStages.length > 0 ? matrixStageNav.activeStages : undefined,
            skippedStages:
              matrixStageNav.skippedStages.length > 0 ? matrixStageNav.skippedStages : undefined,
            activeStage: matrixStageNav.activeStages.length > 0 ? undefined : null,
            slidingIndicator: true,
            indicatorVisible: true,
          },
      body: null,
    })
    setTopBarChrome({
      onFitToScreen: undefined,
      onViewResult: undefined,
      onReset: showReset ? handleReset : undefined,
      fitToScreenActive: false,
      viewResultActive: false,
    })
  }, [
    entranceNavComplete,
    handleReset,
    location.pathname,
    matrixStageNav,
    reduceMotion,
    revealedStageIndex,
    setLeftChrome,
    setTopBarChrome,
    showReset,
  ])

  const entranceMotion = reduceMotion
    ? { initial: false as const, animate: undefined }
    : {
        initial: 'hidden' as const,
        animate: matrixEntranceActive ? ('visible' as const) : ('hidden' as const),
      }

  return (
    <div className="killchain killchain--matrix">
      <div className="killchain--matrix__content">
        <div className="killchain-matrix-wrap">
          <div className="killchain__inner killchain__inner--panel">
            <div className="killchain-matrix-body">
              <div className="killchain-headers">
                {taxonomy.map((stage, columnIndex) => (
                  <motion.div
                    key={stage.id}
                    custom={columnIndex}
                    variants={matrixHeaderItem}
                    {...entranceMotion}
                  >
                    <ColumnHeader
                      stage={stage}
                      isOptional={stage.id === 'AR' || stage.id === 'DL'}
                    />
                  </motion.div>
                ))}
              </div>
              <div className="killchain-matrix">
                {taxonomy.map((stage, columnIndex) => {
                  const navStatus = getStageNavStatus(stage.id, selections)
                  const columnClass =
                    navStatus === 'current'
                      ? 'killchain-column--current'
                      : navStatus === 'upcoming'
                        ? 'killchain-column--upcoming'
                        : ''

                  return (
                    <section
                      key={stage.id}
                      className={`killchain-column ${columnClass}`}
                      aria-labelledby={`column-${stage.id}`}
                    >
                      <div className="column-cards">
                        {stage.techniques.map((tech, rowIndex) => {
                          const key = matrixCardKey(stage.id, tech.id)

                          return (
                            <MatrixTechniqueCard
                              key={tech.id}
                              tech={tech}
                              stageId={stage.id}
                              columnIndex={columnIndex}
                              rowIndex={rowIndex}
                              state={cardModel.states.get(key) ?? 'locked'}
                              isExpanded={expandedCardKeys.has(key)}
                              orderIdx={cardModel.orderIdx.get(key) ?? null}
                              imageOverride={techniqueImageOverrides[tech.id]}
                              entranceComplete={matrixContentEntranceComplete}
                              entranceMotion={entranceMotion}
                              onSelect={onTechniqueClick}
                              onToggleInfo={onToggleTechniqueInfo}
                            />
                          )
                        })}
                      </div>
                    </section>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
