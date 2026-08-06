import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'

import ContextualHintBar from '../components/ContextualHintBar'
import DeconstructBreakdownPanel, {
  type BreakdownMode,
} from '../components/deconstruct/DeconstructBreakdownPanel'
import DeconstructGraph, {
  type DeconstructGraphHandle,
} from '../components/deconstruct/DeconstructGraph'
import { useKillchainChrome } from '../context/KillchainChromeContext'
import { LEFT_SHELL_DURATION_MS } from '../constants/shellMotion'
import { resolveResultGalleryItem } from '../lib/galleryLookup'
import type { GalleryItem } from '../types/gallery'
import type { DeconstructNode, Selections, StageId } from '../types/killchain'
import { hasDeconstructIntroPlayed } from '../utils/deconstructIntroState'
import { parsePathToSelections } from '../utils/parsePathToSelections'
import { resolveDeconstructPath, tagsToSelections } from '../utils/resolvePathFromTags'
import { buildMatrixImageOverrides, selectedTechniqueIds } from '../utils/chainFaceImages'
import { getMatrixStageNavStages } from '../utils/stageNav'
import { getStageIdFromTechnique, DECONSTRUCT_STAGE_ORDER } from '../utils/techniqueStage'

import './DeconstructView.css'

export default function DeconstructView() {
  const { setLeftChrome, setTopBarChrome, dismissUtilityMenu, topBar } = useKillchainChrome()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const pathParam = searchParams.get('path')
  const resultImageUrl = searchParams.get('image')
  const tagsParam = searchParams.get('tags')
  const introSessionKey = useMemo(() => {
    const search = searchParams.toString()
    if (search) return search
    if (pathParam) return `path:${pathParam}`
    return 'default'
  }, [pathParam, searchParams])
  const fromGlobeModal = Boolean(
    (location.state as { fromGlobeModal?: boolean } | null)?.fromGlobeModal,
  )
  const skipIntro = !fromGlobeModal && hasDeconstructIntroPlayed(introSessionKey)
  const tags = useMemo(() => (tagsParam ? tagsParam.split(',').filter(Boolean) : []), [tagsParam])

  const path = useMemo(
    () => resolveDeconstructPath(tags, pathParam),
    [pathParam, tags],
  )

  const selections: Selections = useMemo(() => {
    if (tags.length > 0) return tagsToSelections(tags)
    if (path) return parsePathToSelections(path)
    return { TA: null, AC: null, AR: [], DL: null }
  }, [tags, path])

  const techniqueImageOverrides = useMemo(
    () => buildMatrixImageOverrides(resultImageUrl, selectedTechniqueIds(selections)),
    [resultImageUrl, selections],
  )

  const [galleryItem, setGalleryItem] = useState<GalleryItem | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [panelMode, setPanelMode] = useState<BreakdownMode>('technique')
  const [panelExpanded, setPanelExpanded] = useState(false)
  const [techniqueInfoExpanded, setTechniqueInfoExpanded] = useState(false)
  const [fitToScreenActive, setFitToScreenActive] = useState(false)
  const [graphHint, setGraphHint] = useState({
    primary: 'Loading kill chain nodes…',
    secondary: null as string | null,
  })
  const suppressAutoResultRef = useRef(false)
  const skipAutoRevealRef = useRef(
    !fromGlobeModal && hasDeconstructIntroPlayed(introSessionKey),
  )

  const loadResultItem = useCallback(
    async (imageUrl: string) => {
      if (!path) return
      const item = await resolveResultGalleryItem(imageUrl, path)
      setGalleryItem(item)
    },
    [path],
  )

  useEffect(() => {
    if (!path || !resultImageUrl) return
    let cancelled = false
    loadResultItem(resultImageUrl).then(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
  }, [path, resultImageUrl, loadResultItem])

  useEffect(() => {
    suppressAutoResultRef.current = false
    skipAutoRevealRef.current =
      !fromGlobeModal && hasDeconstructIntroPlayed(introSessionKey)
    setSelectedNodeId(null)
    setPanelMode('technique')
    setPanelExpanded(false)
    setTechniqueInfoExpanded(false)
    setFitToScreenActive(false)
  }, [fromGlobeModal, introSessionKey, path?.id])

  const handleSelectNode = useCallback((node: DeconstructNode) => {
    suppressAutoResultRef.current = true
    setFitToScreenActive(false)
    if (node.isResult) {
      if (!resultImageUrl) return
      setSelectedNodeId('result')
      setPanelMode('result')
      setPanelExpanded(true)
      setTechniqueInfoExpanded(false)
      void loadResultItem(resultImageUrl)
      return
    }
    setSelectedNodeId(node.techniqueId)
    setPanelMode('technique')
    setPanelExpanded(true)
    setTechniqueInfoExpanded(true)
  }, [loadResultItem, resultImageUrl])

  const pathTechniques = useMemo(() => new Set(path?.techniques ?? tags), [path, tags])

  const activeStage: StageId | null = useMemo(() => {
    if (selectedNodeId) return getStageIdFromTechnique(selectedNodeId)
    return null
  }, [selectedNodeId])

  const panelTechniqueId = useMemo(() => {
    if (panelMode === 'result') return null
    return selectedNodeId
  }, [panelMode, selectedNodeId])

  const handleSelectTechnique = useCallback((techniqueId: string) => {
    if (!pathTechniques.has(techniqueId)) return
    setSelectedNodeId(techniqueId)
    setPanelMode('technique')
    setPanelExpanded(true)
    setTechniqueInfoExpanded(true)
  }, [pathTechniques])

  const handleToggleTechniqueInfo = useCallback(
    (techniqueId: string) => {
      if (!pathTechniques.has(techniqueId)) return

      const isCurrentTechnique =
        panelMode === 'technique' && panelTechniqueId === techniqueId

      if (isCurrentTechnique && techniqueInfoExpanded) {
        setTechniqueInfoExpanded(false)
        return
      }

      setSelectedNodeId(techniqueId)
      setPanelMode('technique')
      setPanelExpanded(true)
      setTechniqueInfoExpanded(true)
    },
    [panelMode, panelTechniqueId, pathTechniques, techniqueInfoExpanded],
  )

  const handleClosePanel = useCallback(() => {
    suppressAutoResultRef.current = true
    dismissUtilityMenu()
    setPanelExpanded(false)
    setPanelMode('technique')
    setTechniqueInfoExpanded(false)
    setSelectedNodeId(null)
    setFitToScreenActive(false)
  }, [dismissUtilityMenu])

  const graphRef = useRef<DeconstructGraphHandle>(null)

  const revealResultPanel = useCallback(() => {
    if (!resultImageUrl) return
    setFitToScreenActive(false)
    setSelectedNodeId(null)
    setPanelMode('result')
    setPanelExpanded(true)
    void loadResultItem(resultImageUrl)
  }, [loadResultItem, resultImageUrl])

  const handleFitToScreen = useCallback(() => {
    suppressAutoResultRef.current = true
    graphRef.current?.fitToScreen()
    setFitToScreenActive(true)
    setPanelMode('technique')
    setPanelExpanded(false)
    setTechniqueInfoExpanded(false)
    setSelectedNodeId(null)
  }, [])

  const handleViewResult = useCallback(() => {
    revealResultPanel()
  }, [revealResultPanel])

  const revealResultPanelRef = useRef(revealResultPanel)
  revealResultPanelRef.current = revealResultPanel

  const handleIntroComplete = useCallback(() => {
    if (suppressAutoResultRef.current || skipAutoRevealRef.current || !resultImageUrl) return
    revealResultPanelRef.current()
  }, [resultImageUrl])

  const showLeftPanel = panelExpanded && (panelMode === 'result' || panelTechniqueId !== null)
  const emphasizeAllStages = panelMode === 'result' && panelExpanded
  const hasStageSelection = selectedNodeId !== null
  const pathStageNav = useMemo(
    () => getMatrixStageNavStages(selections, DECONSTRUCT_STAGE_ORDER),
    [selections],
  )
  const [panelMounted, setPanelMounted] = useState(false)
  const [indicatorVisible, setIndicatorVisible] = useState(false)

  useEffect(() => {
    if (showLeftPanel) {
      setPanelMounted(true)
      const timer = window.setTimeout(() => setIndicatorVisible(true), 140)
      return () => window.clearTimeout(timer)
    }

    setIndicatorVisible(false)
    const timer = window.setTimeout(() => setPanelMounted(false), LEFT_SHELL_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [showLeftPanel])

  const activeStageCount = pathStageNav.activeStages.length
  const skippedStageCount = pathStageNav.skippedStages.length

  useLayoutEffect(() => {
    if (location.pathname !== '/deconstruct') return

    setLeftChrome({
      visible: Boolean(path),
      expanded: showLeftPanel,
      complexityNav: null,
      stageNav: {
        selections: hasStageSelection || emphasizeAllStages ? selections : undefined,
        stageOrder: DECONSTRUCT_STAGE_ORDER,
        activeStages:
          emphasizeAllStages && activeStageCount > 0
            ? pathStageNav.activeStages
            : undefined,
        skippedStages:
          (hasStageSelection || emphasizeAllStages) && skippedStageCount > 0
            ? pathStageNav.skippedStages
            : undefined,
        activeStage:
          emphasizeAllStages || !hasStageSelection ? undefined : activeStage,
        slidingIndicator: true,
        indicatorVisible,
      },
      body:
        panelMounted ? (
          <DeconstructBreakdownPanel
            embedded
            mode={panelMode}
            galleryItem={galleryItem}
            selectedTechniqueId={panelTechniqueId}
            techniqueInfoExpanded={techniqueInfoExpanded}
            techniqueImageOverrides={techniqueImageOverrides}
            pathTechniques={pathTechniques}
            onSelectTechnique={handleSelectTechnique}
            onToggleTechniqueInfo={handleToggleTechniqueInfo}
          />
        ) : null,
    })
    setTopBarChrome({
      onFitToScreen: handleFitToScreen,
      onViewResult: resultImageUrl ? handleViewResult : undefined,
      fitToScreenActive,
      viewResultActive: panelMode === 'result' && panelExpanded,
    })
  }, [
    activeStage,
    activeStageCount,
    emphasizeAllStages,
    hasStageSelection,
    fitToScreenActive,
    galleryItem,
    handleFitToScreen,
    handleSelectTechnique,
    handleToggleTechniqueInfo,
    handleViewResult,
    indicatorVisible,
    location.pathname,
    panelExpanded,
    panelMode,
    panelMounted,
    panelTechniqueId,
    path,
    path?.id,
    pathTechniques,
    resultImageUrl,
    selections,
    setLeftChrome,
    setTopBarChrome,
    showLeftPanel,
    skippedStageCount,
    techniqueImageOverrides,
    techniqueInfoExpanded,
  ])

  const handleGraphHintChange = useCallback(
    (hint: { primary: string; secondary: string | null }) => {
      setGraphHint(hint)
    },
    [],
  )

  const hintPrimary = topBar.utilityActionHint ?? graphHint.primary
  const hintSecondary = topBar.utilityActionHint ? null : graphHint.secondary

  return (
    <div className="deconstruct-view">
      <div className="deconstruct-view__body">
        <div className="deconstruct-view__graph-col">
          <DeconstructGraph
            ref={graphRef}
            path={path}
            resultImageUrl={resultImageUrl}
            introSessionKey={introSessionKey}
            skipIntro={skipIntro}
            selectedNodeId={panelMode === 'result' ? 'result' : selectedNodeId}
            onSelectNode={handleSelectNode}
            onCanvasClick={handleClosePanel}
            onHintChange={handleGraphHintChange}
            onIntroComplete={handleIntroComplete}
            resultFocusActive={panelMode === 'result' && panelExpanded}
          />
        </div>
      </div>
      <ContextualHintBar primary={hintPrimary} secondary={hintSecondary} />
    </div>
  )
}
