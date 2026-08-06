import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import * as THREE from 'three'
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
import { useGallery } from '../../context/GalleryContext'
import { SETTINGS_MENU_ENTRANCE } from '../../constants/shellMotion'
import { useChromeEntranceReady } from '../../hooks/useChromeEntranceReady'
import {
  ANIMATION_PRESETS,
  CLUSTER_MAX_CAMERA_Z,
  CLUSTER_MIN_CAMERA_Z,
  GLOBE_CAMERA_FOV,
  GLOBE_RADIUS,
  MAX_CAMERA_Z,
  MAX_GLOBE_ITEM_COUNT,
  MIN_CAMERA_Z,
  applyDisplaySettings,
  billboardTowardCamera,
  computeAnimationZoomOffset,
  computeClusterLayout,
  computeComprehensiveCameraZ,
  computeFilterFocusRotation,
  computeGlobeOverviewCameraZ,
  computeZoomFocusRotation,
  createGlobeRenderers,
  createPhotoElement,
  depthFadeDistanceT,
  fitClusterCameraToViewport,
  getGlobePositions,
  globeStaggeredLoadDelayMs,
  GLOBE_OVERVIEW_SCREEN_FRACTION,
  imageDimensions,
  isGlobePointFacingCamera,
  layoutBoundingRadius,
  placeOnSphere,
  pullClusterIntoViewport,
  sampleEvenly,
  shortestAngleDelta,
  viewAxisAngularDistance,
  updateObjectVisibility,
} from '../../lib/globe'
import {
  attachGlobeInteraction,
  createGlobeInteractionState,
  type GlobeInteractionState,
} from '../../lib/globeInteraction'
import {
  startCameraGesturePipeline,
  type CameraPipelineStatus,
} from '../../lib/cameraGesturePipeline'
import { findSimilarItems } from '../../lib/similarity'
import { itemMatchesFilter } from '../../lib/taxonomy'
import {
  CLUSTER_OUTSIDE_OPACITY,
  COMPLEXITY_DIM_OPACITY,
  clusterItems,
  clusterMemberIds,
  drawClusterThreads,
  setClusterHighlight,
  type ImageCluster,
} from '../../lib/threads'
import type { GalleryItem } from '../../types/gallery'
import {
  clusterElementPositions,
  CLUSTER_FOCUS_CAMERA_Z,
  CLUSTER_FOCUS_SCALE,
  computeClusterFocusCameraZForObjects,
  focusClusterRadius,
  type ClusterGlobe,
} from '../../lib/clusterLayout'
import { CameraGesturePreview } from '../CameraGesturePreview'
import { useAppCursor } from '../AppCursor'
import { isGlobeClickableTarget } from '../../lib/clickableTarget'
import {
  GLOBE_INTRO_CAMERA_START_FACTOR,
  GLOBE_INTRO_RING_START,
  GLOBE_INTRO_RING_DRIFT_Z,
  GLOBE_INTRO_CENTER_PREFETCH_INTERVAL_MS,
  clamp01,
  easeInOutCubic,
  globeIntroCameraProgress,
  introGlobeLoadFraction,
  globeIntroDepthFadeProgress,
  globeIntroFillProgress,
  globeIntroMotionEase,
  globeIntroRotationHandoff,
  introCenterFillCount,
  introCenterFillRank,
  introCenterItemReveal,
  introCenterPrefetchActive,
  introCenterTileOpacity,
  introDepthOpacityAtDistance,
  introLoadBehindSchedule,
  introGlobeSequenceComplete,
  assignParallelHemisphereRanks,
  assignRingLoadSeqShuffled,
  introRingHemisphereLoadCaps,
  introCenterHemisphereLoadCaps,
  introBackHemisphereMayShow,
  GLOBE_INTRO_RING_PAIR_INTERVAL_MS,
  GLOBE_INTRO_EXIT_BLEND_MS,
  introInScreenCenterCutout,
  introIsRingMember,
  introRevealActive,
  introRingCount,
  introScreenCenterCutoutRad,
  introTileOpacity,
} from '../../utils/globeIntro'

const COMPLEXITY_FOCUS_DURATION_MS = 1000
const COMPLEXITY_BLEND_RATE = 0.012
const CATEGORY_BLEND_RATE = 0.012
const COMPREHENSIVE_ZOOM_SMOOTH = 0.0025

export function GlobeView({
  introLocked = false,
  introProgressRef: externalIntroProgressRef,
  introGlobeReadyRef: externalIntroGlobeReadyRef,
  chromeEntranceKey = 'default',
}: {
  introLocked?: boolean
  introProgressRef?: React.MutableRefObject<number>
  introGlobeReadyRef?: React.MutableRefObject<boolean>
  chromeEntranceKey?: string
} = {}) {
  const {
    filteredItems,
    openModal,
    openModalScoped,
    globeArrangement,
    globeAnimation,
    globeDisplay,
    globeItemCount,
    linkCluster,
    cameraControls,
    constellation,
    closeModal,
    selectedItem,
    activeComplexity,
    comprehensiveMode,
    zoomMode,
    highlightedFilter,
  } = useGallery()
  const containerRef = useRef<HTMLDivElement>(null)
  const threadCanvasRef = useRef<HTMLCanvasElement>(null)
  const hoverLabelRef = useRef<HTMLParagraphElement>(null)
  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const interactionStateRef = useRef<GlobeInteractionState | null>(null)
  const cameraControlsRef = useRef(cameraControls)
  const [cameraStatus, setCameraStatus] = useState<CameraPipelineStatus>('idle')
  const [globeReady, setGlobeReady] = useState(false)
  const [showInteractionHint, setShowInteractionHint] = useState(!introLocked)
  const entranceReady = useChromeEntranceReady(chromeEntranceKey)
  const introLockedRef = useRef(introLocked)
  const localIntroProgressRef = useRef(0)
  const localIntroGlobeReadyRef = useRef(false)
  const introProgressRef = externalIntroProgressRef ?? localIntroProgressRef
  const introGlobeReadyRef = externalIntroGlobeReadyRef ?? localIntroGlobeReadyRef
  const wasIntroLockedRef = useRef(introLocked)
  const lastCenterPrefetchAtRef = useRef(0)
  const lastRingPairLoadAtRef = useRef(0)
  const introSceneStartedAtRef = useRef(0)
  const ringFrontLoadQueueRef = useRef<CSS3DObject[]>([])
  const ringBackLoadQueueRef = useRef<CSS3DObject[]>([])
  const ringFrontLoadIndexRef = useRef(0)
  const ringBackLoadIndexRef = useRef(0)
  const centerFrontLoadQueueRef = useRef<CSS3DObject[]>([])
  const centerBackLoadQueueRef = useRef<CSS3DObject[]>([])
  const centerFrontLoadIndexRef = useRef(0)
  const centerBackLoadIndexRef = useRef(0)
  const introLoadedFractionRef = useRef(1)
  const introRotationHandoffRef = useRef(0)
  const introExitStartedAtRef = useRef(0)
  const overviewCameraZRef = useRef(0)
  introLockedRef.current = introLocked
  const reduceMotion = useReducedMotion()
  const { setCameraCursor, setGlobeDragging } = useAppCursor()
  const [focusedClusterLabel, setFocusedClusterLabel] = useState<string | null>(
    null,
  )
  const openModalRef = useRef(openModal)
  const openModalScopedRef = useRef(openModalScoped)
  const animationRef = useRef(globeAnimation)
  const displaySettingsRef = useRef(globeDisplay)
  const linkClusterRef = useRef(linkCluster)
  const objectsRef = useRef<CSS3DObject[]>([])
  const objectByIdRef = useRef<Map<string, CSS3DObject>>(new Map())
  const clustersRef = useRef<ImageCluster | null>(null)
  const layoutClustersRef = useRef<ImageCluster[]>([])
  const layoutBridgesRef = useRef<{ fromId: string; toId: string }[]>([])
  const layoutFieldRadiusRef = useRef(GLOBE_RADIUS)
  const layoutClusterGlobesRef = useRef<ClusterGlobe[]>([])
  const itemClusterIdRef = useRef<Map<string, string>>(new Map())
  const clusterFocusRef = useRef<string | null>(null)
  const linkClusterFocusRef = useRef(false)
  const preFocusCameraZRef = useRef<number | null>(null)
  const focusBlendRef = useRef(0)
  const focusCameraTargetRef = useRef(CLUSTER_FOCUS_CAMERA_Z)
  const clusterFocusedAtRef = useRef(0)
  const focusZoomArmedRef = useRef(false)
  const clusterGroupsRef = useRef<Map<string, THREE.Group>>(new Map())
  const constellationRef = useRef(constellation)
  const closeModalRef = useRef(closeModal)
  const selectedItemRef = useRef(selectedItem)
  const handleImageActivateRef = useRef<(item: GalleryItem) => void>(() => {})
  const handleBackgroundPointerDownRef = useRef<() => void>(() => {})
  const globeArrangementRef = useRef(globeArrangement)
  const displayItemsRef = useRef<GalleryItem[]>([])
  const activeComplexityRef = useRef(activeComplexity)
  const complexityBlendRef = useRef(0)
  const categoryBlendRef = useRef(0)
  const highlightedFilterRef = useRef(highlightedFilter)
  const complexityFocusAnimRef = useRef<{
    startX: number
    startY: number
    targetX: number
    targetY: number
    startedAt: number
  } | null>(null)
  const comprehensiveModeRef = useRef(comprehensiveMode)
  const zoomModeRef = useRef(zoomMode)
  const comprehensiveZoomTargetRef = useRef<number | null>(null)
  const preComprehensiveCameraZRef = useRef<number | null>(null)
  const cssRendererRef = useRef<ReturnType<typeof createGlobeRenderers>['cssRenderer'] | null>(null)
  const globeGroupRef = useRef<THREE.Group | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const setGlobeDraggingRef = useRef(setGlobeDragging)
  setGlobeDraggingRef.current = setGlobeDragging

  const restorePreFocusCameraZ = () => {
    const state = interactionStateRef.current
    const camera = cameraRef.current
    const savedZ = preFocusCameraZRef.current
    if (!state || savedZ == null) return

    state.targetCameraDistance = savedZ
    state.cameraDistance = savedZ
    if (camera) camera.position.z = savedZ
    preFocusCameraZRef.current = null
  }

  const savePreFocusCameraZ = () => {
    const state = interactionStateRef.current
    if (state) {
      preFocusCameraZRef.current = state.cameraDistance
    }
  }

  const restoreClusterOverviewState = () => {
    focusBlendRef.current = 0

    clusterGroupsRef.current.forEach((group) => {
      const fieldCenter = group.userData.fieldCenter as THREE.Vector3
      group.position.copy(fieldCenter)
      group.rotation.set(0, 0, 0)
      group.scale.setScalar(1)
    })

    for (let i = 0; i < objectsRef.current.length; i++) {
      const obj = objectsRef.current[i]
      const el = obj.userData.element as HTMLElement
      const fieldLocal = obj.userData.fieldLocal as THREE.Vector3 | undefined
      const sphereLocal = obj.userData.sphereLocal as THREE.Vector3 | undefined
      if (fieldLocal) {
        obj.position.copy(fieldLocal)
      } else if (sphereLocal) {
        obj.position.copy(sphereLocal)
      }
      el.style.visibility = 'visible'
      el.style.pointerEvents = 'auto'
      el.style.removeProperty('opacity')
    }
  }

  const savePreFocusZoom = () => {
    savePreFocusCameraZ()
  }

  const exitLinkClusterFocus = (restoreZoom = true) => {
    if (!linkClusterFocusRef.current) return
    linkClusterFocusRef.current = false
    focusZoomArmedRef.current = false
    setActiveCluster(null)
    setFocusedClusterLabel(null)
    restoreClusterOverviewState()
    if (restoreZoom) restorePreFocusCameraZ()
  }

  const exitConstellationFocus = (restoreZoom = true) => {
    if (!clusterFocusRef.current) return
    clusterFocusRef.current = null
    clusterFocusedAtRef.current = 0
    focusZoomArmedRef.current = false
    setFocusedClusterLabel(null)
    restoreClusterOverviewState()
    if (restoreZoom) restorePreFocusCameraZ()
  }

  const cancelClusterSelection = () => {
    if (clusterFocusRef.current) {
      exitConstellationFocus(true)
      return
    }
    if (linkClusterFocusRef.current) {
      exitLinkClusterFocus(true)
      return
    }
    if (linkClusterRef.current.enabled && clustersRef.current) {
      setActiveCluster(null)
    }
  }

  const prepareLinkClusterFocusLayout = (cluster: ImageCluster) => {
    const items = clusterItems(cluster, displayItemsRef.current)
    const focusRadius = focusClusterRadius(
      constellationRef.current.elementSeparation,
    )
    const focusPositions = clusterElementPositions(
      constellationRef.current.elementLayout,
      items.length,
      focusRadius,
    )
    items.forEach((item, i) => {
      const obj = objectByIdRef.current.get(item.id)
      if (obj) {
        obj.userData.focusLocal = focusPositions[i].clone()
      }
    })
  }

  const enterLinkClusterFocus = (cluster: ImageCluster) => {
    const items = clusterItems(cluster, displayItemsRef.current)
    const anchor = items[0]
    prepareLinkClusterFocusLayout(cluster)
    savePreFocusZoom()
    linkClusterFocusRef.current = true
    focusBlendRef.current = 1
    clusterFocusedAtRef.current = performance.now()
    focusZoomArmedRef.current = false
    setFocusedClusterLabel(
      anchor?.subcategory?.replace(/_/g, ' ') ??
        anchor?.category.replace(/_/g, ' ') ??
        'Cluster',
    )

    const linked = clusterMemberIds(cluster)
    const clusterObjects: CSS3DObject[] = []
    linked.forEach((itemId) => {
      const obj = objectByIdRef.current.get(itemId)
      const focusLocal = obj?.userData.focusLocal as THREE.Vector3 | undefined
      if (obj && focusLocal) {
        obj.position.copy(focusLocal)
        clusterObjects.push(obj)
      }
    })

    applyClusterViewportFit(clusterObjects)
  }

  const applyClusterViewportFit = (clusterObjects: CSS3DObject[]) => {
    if (clusterObjects.length === 0) return

    const camera = cameraRef.current
    const scene = sceneRef.current
    const cssRenderer = cssRendererRef.current
    const state = interactionStateRef.current
    const container = containerRef.current
    if (!camera || !scene || !cssRenderer || !state) return

    for (let i = 0; i < objectsRef.current.length; i++) {
      const obj = objectsRef.current[i]
      const el = obj.userData.element as HTMLElement
      const inCluster = clusterObjects.includes(obj)
      el.style.visibility = 'visible'
      el.style.pointerEvents = inCluster ? 'auto' : 'none'
      el.style.opacity = inCluster ? '1' : '0.08'
      if (inCluster) {
        billboardTowardCamera(obj, camera)
      }
    }
    globeGroupRef.current?.updateMatrixWorld(true)

    const aspect =
      container && container.clientHeight > 0
        ? container.clientWidth / container.clientHeight
        : camera.aspect
    const { width, height } = imageDimensions(displaySettingsRef.current)
    const startZ = computeClusterFocusCameraZForObjects(
      clusterObjects,
      width,
      height,
      aspect,
    )
    const targetZ = fitClusterCameraToViewport(
      clusterObjects,
      camera,
      scene,
      cssRenderer,
      startZ,
      undefined,
      container,
    )

    state.targetCameraDistance = targetZ
    state.cameraDistance = targetZ
    focusCameraTargetRef.current = targetZ
    camera.position.z = targetZ
  }

  const focusConstellationCluster = (clusterId: string) => {
    const clusterGlobe = layoutClusterGlobesRef.current.find((g) => g.id === clusterId)
    if (!clusterGlobe) return
    savePreFocusZoom()
    clusterFocusRef.current = clusterId
    clusterFocusedAtRef.current = performance.now()
    focusBlendRef.current = 1
    focusZoomArmedRef.current = false
    setFocusedClusterLabel(clusterGlobe.label)

    const group = clusterGroupsRef.current.get(clusterId)
    if (group) {
      group.position.set(0, 0, 0)
      group.rotation.set(0, 0, 0)
      group.scale.setScalar(CLUSTER_FOCUS_SCALE)
    }

    const clusterObjects: CSS3DObject[] = []
    clusterGlobe.itemIds.forEach((itemId) => {
      const obj = objectByIdRef.current.get(itemId)
      const focusLocal = clusterGlobe.focusPositions.get(itemId)
      if (obj && focusLocal) {
        obj.userData.focusLocal = focusLocal.clone()
        obj.position.copy(focusLocal)
        clusterObjects.push(obj)
      }
    })

    applyClusterViewportFit(clusterObjects)
  }

  const displayItems = useMemo(
    () =>
      sampleEvenly(
        filteredItems,
        Math.min(globeItemCount, MAX_GLOBE_ITEM_COUNT),
      ),
    [filteredItems, globeItemCount],
  )

  openModalRef.current = openModal
  openModalScopedRef.current = openModalScoped
  animationRef.current = globeAnimation
  displaySettingsRef.current = globeDisplay
  linkClusterRef.current = linkCluster
  cameraControlsRef.current = cameraControls
  constellationRef.current = constellation
  closeModalRef.current = closeModal
  selectedItemRef.current = selectedItem
  globeArrangementRef.current = globeArrangement
  displayItemsRef.current = displayItems
  activeComplexityRef.current = activeComplexity
  comprehensiveModeRef.current = comprehensiveMode
  zoomModeRef.current = zoomMode
  highlightedFilterRef.current = highlightedFilter

  const applyScreenFillCameraTarget = () => {
    const state = interactionStateRef.current
    if (!state) return

    if (preComprehensiveCameraZRef.current == null) {
      preComprehensiveCameraZRef.current = state.cameraDistance
    }
    const targetZ = computeComprehensiveCameraZ(layoutFieldRadiusRef.current)
    state.targetCameraDistance = targetZ
    comprehensiveZoomTargetRef.current = targetZ
  }

  const restoreScreenFillCamera = () => {
    const state = interactionStateRef.current
    if (!state || comprehensiveZoomTargetRef.current == null) return

    const restoreZ =
      preComprehensiveCameraZRef.current ?? overviewCameraZRef.current
    state.targetCameraDistance = restoreZ
    comprehensiveZoomTargetRef.current = null
    preComprehensiveCameraZRef.current = null
  }

  const applyFilterSelectionCameraTarget = () => {
    if (comprehensiveModeRef.current || zoomModeRef.current) return

    const complexity = activeComplexityRef.current
    const filter = highlightedFilterRef.current
    const hasSelection = Boolean(complexity || filter)

    if (!hasSelection) {
      restoreScreenFillCamera()
      return
    }

    const state = interactionStateRef.current
    if (!state) return

    if (preComprehensiveCameraZRef.current == null) {
      preComprehensiveCameraZRef.current = state.cameraDistance
    }
    const targetZ = computeGlobeOverviewCameraZ(
      layoutFieldRadiusRef.current,
      GLOBE_CAMERA_FOV,
      GLOBE_OVERVIEW_SCREEN_FRACTION,
    )
    state.targetCameraDistance = targetZ
    comprehensiveZoomTargetRef.current = targetZ
  }

  const applyComprehensiveCameraTarget = () => {
    if (!comprehensiveModeRef.current) return

    const complexity = activeComplexityRef.current
    const filter = highlightedFilterRef.current
    const hasSelection = Boolean(complexity || filter)

    if (hasSelection) {
      applyScreenFillCameraTarget()
      startFilterFocusAnimation()
      return
    }

    restoreScreenFillCamera()
  }

  const startZoomFocusAnimation = () => {
    const state = interactionStateRef.current
    if (!zoomModeRef.current || !state || objectsRef.current.length === 0) {
      complexityFocusAnimRef.current = null
      return
    }

    const clusterFieldCenters = new Map<string, THREE.Vector3>()
    clusterGroupsRef.current.forEach((group, clusterId) => {
      const fieldCenter = group.userData.fieldCenter as THREE.Vector3 | undefined
      if (fieldCenter) clusterFieldCenters.set(clusterId, fieldCenter)
    })

    const target = computeZoomFocusRotation(
      objectsRef.current,
      clusterFieldCenters.size > 0 ? clusterFieldCenters : undefined,
    )
    if (!target) {
      complexityFocusAnimRef.current = null
      return
    }

    complexityFocusAnimRef.current = {
      startX: state.rotationX,
      startY: state.rotationY,
      targetX: target.x,
      targetY: target.y,
      startedAt: performance.now(),
    }
  }

  const applyZoomModeCameraTarget = () => {
    if (!zoomModeRef.current) return
    applyScreenFillCameraTarget()
    startZoomFocusAnimation()
  }

  useEffect(() => {
    if (!comprehensiveMode && !zoomMode) {
      if (!activeComplexity && !highlightedFilter) {
        restoreScreenFillCamera()
        for (const obj of objectsRef.current) {
          const sphereLocal = obj.userData.sphereLocal as THREE.Vector3 | undefined
          if (sphereLocal) obj.position.copy(sphereLocal)
        }
      } else {
        applyFilterSelectionCameraTarget()
      }
      return
    }

    if (zoomMode) {
      applyZoomModeCameraTarget()
      return
    }

    applyComprehensiveCameraTarget()
  }, [comprehensiveMode, zoomMode, activeComplexity, highlightedFilter])

  useEffect(() => {
    if (comprehensiveMode && !activeComplexity && !highlightedFilter) {
      for (const obj of objectsRef.current) {
        const sphereLocal = obj.userData.sphereLocal as THREE.Vector3 | undefined
        if (sphereLocal) obj.position.copy(sphereLocal)
      }
    }
  }, [comprehensiveMode, activeComplexity, highlightedFilter])

  useEffect(() => {
    if (introLocked) {
      setShowInteractionHint(false)
      return
    }
    const timeout = window.setTimeout(
      () => setShowInteractionHint(true),
      GLOBE_INTRO_EXIT_BLEND_MS,
    )
    return () => window.clearTimeout(timeout)
  }, [introLocked])

  useEffect(() => {
    if (wasIntroLockedRef.current && !introLocked) {
      introExitStartedAtRef.current = performance.now()
      const state = interactionStateRef.current
      const overviewZ = overviewCameraZRef.current
      if (state && overviewZ > 0) {
        state.targetCameraDistance = state.cameraDistance
        if (Math.abs(state.cameraDistance - overviewZ) > overviewZ * 0.08) {
          state.cameraDistance = overviewZ
          state.targetCameraDistance = overviewZ
          const camera = cameraRef.current
          if (camera) camera.position.z = overviewZ
        }
      }

      if (state) {
        state.velocityX = 0
        state.velocityY = 0
      }
      introProgressRef.current = 1
      introRotationHandoffRef.current = 1

      for (const obj of objectsRef.current) {
        const el = obj.userData.element as HTMLElement | undefined
        if (!el) continue
        el.style.pointerEvents = 'auto'
        const flushDeferredLoad = obj.userData.flushDeferredLoad as
          | (() => void)
          | undefined
        flushDeferredLoad?.()
      }
    } else if (introLocked) {
      introExitStartedAtRef.current = 0
    }
    wasIntroLockedRef.current = introLocked
  }, [introLocked])

  const startFilterFocusAnimation = () => {
    const complexity = activeComplexityRef.current
    const highlighted = highlightedFilterRef.current
    const filterActive = highlighted !== null
    const state = interactionStateRef.current
    if ((!complexity && !filterActive) || !state || objectsRef.current.length === 0) {
      complexityFocusAnimRef.current = null
      return
    }

    const clusterFieldCenters = new Map<string, THREE.Vector3>()
    clusterGroupsRef.current.forEach((group, clusterId) => {
      const fieldCenter = group.userData.fieldCenter as THREE.Vector3 | undefined
      if (fieldCenter) clusterFieldCenters.set(clusterId, fieldCenter)
    })

    const target = computeFilterFocusRotation(objectsRef.current, {
      complexity,
      highlightedFilter: highlighted,
      preferBackHemisphere:
        comprehensiveModeRef.current || zoomModeRef.current,
      clusterFieldCenters:
        clusterFieldCenters.size > 0 ? clusterFieldCenters : undefined,
    })
    if (!target) {
      complexityFocusAnimRef.current = null
      return
    }

    complexityFocusAnimRef.current = {
      startX: state.rotationX,
      startY: state.rotationY,
      targetX: target.x,
      targetY: target.y,
      startedAt: performance.now(),
    }
  }

  useEffect(() => {
    startFilterFocusAnimation()
    if (comprehensiveMode) {
      applyComprehensiveCameraTarget()
    } else if (zoomMode) {
      applyZoomModeCameraTarget()
    } else {
      applyFilterSelectionCameraTarget()
    }
  }, [
    activeComplexity,
    highlightedFilter,
    displayItems,
    globeArrangement,
    comprehensiveMode,
    zoomMode,
  ])

  const setHoverLabel = (item: GalleryItem | null) => {
    const el = hoverLabelRef.current
    if (!el) return
    if (!item) {
      el.textContent = ''
      el.style.display = 'none'
      return
    }
    el.textContent =
      item.subcategory?.replace(/_/g, ' ') ?? item.category.replace(/_/g, ' ')
    el.style.display = 'block'
  }

  const setActiveCluster = (cluster: ImageCluster | null) => {
    clustersRef.current = cluster
    setClusterHighlight(
      objectByIdRef.current,
      cluster,
      linkClusterRef.current.enabled,
    )
  }

  const createCluster = (anchor: GalleryItem): ImageCluster => {
    const similar = findSimilarItems(anchor, displayItemsRef.current, 6)
    const cluster: ImageCluster = {
      id: `cluster-${anchor.id}`,
      anchorId: anchor.id,
      memberIds: similar.map((item) => item.id),
    }
    prepareLinkClusterFocusLayout(cluster)
    return cluster
  }

  const constellationClusterScope = (clusterId: string): GalleryItem[] => {
    const clusterGlobe = layoutClusterGlobesRef.current.find((g) => g.id === clusterId)
    if (!clusterGlobe) return []
    return clusterItems(clusterGlobe.cluster, displayItemsRef.current)
  }

  const handleImageActivate = (item: GalleryItem) => {
    if (globeArrangementRef.current === 'clusters') {
      const clusterId = itemClusterIdRef.current.get(item.id)

      if (clusterFocusRef.current) {
        if (clusterId && clusterFocusRef.current === clusterId) {
          if (performance.now() - clusterFocusedAtRef.current < 600) return
          openModalScopedRef.current(item, constellationClusterScope(clusterId))
          return
        }
        exitConstellationFocus(true)
        return
      }

      if (!clusterId) return

      focusConstellationCluster(clusterId)
      return
    }

    if (!linkClusterRef.current.enabled) {
      openModalRef.current(item)
      return
    }

    const existing = clustersRef.current
    const members = existing ? clusterMemberIds(existing) : null

    if (
      linkClusterFocusRef.current &&
      existing &&
      members?.has(item.id)
    ) {
      if (performance.now() - clusterFocusedAtRef.current < 600) return
      const scope = clusterItems(existing, displayItemsRef.current)
      openModalScopedRef.current(item, scope)
      return
    }

    if (linkClusterFocusRef.current) {
      exitLinkClusterFocus(true)
      return
    }

    let cluster = existing
    if (!cluster || !members?.has(item.id)) {
      if (linkClusterFocusRef.current) {
        exitLinkClusterFocus(false)
      }
      cluster = createCluster(item)
      setActiveCluster(cluster)
    }

    enterLinkClusterFocus(cluster)
  }

  handleImageActivateRef.current = handleImageActivate
  handleBackgroundPointerDownRef.current = cancelClusterSelection

  const handlePinchSelect = (clientX: number, clientY: number) => {
    const target = document.elementFromPoint(clientX, clientY)
    const photo = target?.closest('.globe-photo') as HTMLElement | null
    const itemId = photo?.dataset.itemId
    if (!itemId) return
    const item = displayItemsRef.current.find((entry) => entry.id === itemId)
    if (item) handleImageActivateRef.current(item)
  }

  useEffect(() => {
    if (!linkCluster.enabled) {
      exitLinkClusterFocus()
      setActiveCluster(null)
    }
  }, [linkCluster.enabled])

  useEffect(() => {
    if (globeArrangement !== 'clusters') {
      exitConstellationFocus()
    }
  }, [globeArrangement])

  useEffect(() => {
    if (!cameraControls.enabled) {
      setCameraStatus('idle')
      setCameraCursor({
        visible: false,
        x: 0,
        y: 0,
        pinching: false,
        clickable: false,
      })
      return
    }

    const video = cameraVideoRef.current
    const state = interactionStateRef.current
    if (!video || !state) return

    let stopPipeline: (() => void) | undefined
    let cancelled = false

    startCameraGesturePipeline({
      video,
      state,
      getSettings: () => cameraControlsRef.current,
      getViewport: () => {
        const el = containerRef.current
        return el
          ? el.getBoundingClientRect()
          : new DOMRect(0, 0, window.innerWidth, window.innerHeight)
      },
      onStatus: (status) => {
        if (!cancelled) setCameraStatus(status)
      },
      onFrame: (frame) => {
        if (cancelled) return
        setCameraCursor({
          visible: frame.tracking,
          x: frame.cursorX,
          y: frame.cursorY,
          pinching: frame.pinching,
          clickable: frame.tracking
            ? isGlobeClickableTarget(
                document.elementFromPoint(frame.cursorX, frame.cursorY),
              )
            : false,
        })
      },
      onPinchSelect: handlePinchSelect,
      onDoublePinch: () => {
        if (selectedItemRef.current) closeModalRef.current()
      },
    }).then((stop) => {
      if (cancelled) {
        stop()
        return
      }
      stopPipeline = stop
    })

    return () => {
      cancelled = true
      stopPipeline?.()
      setCameraStatus('idle')
      setCameraCursor({
        visible: false,
        x: 0,
        y: 0,
        pinching: false,
        clickable: false,
      })
    }
  }, [
    cameraControls.enabled,
    cameraControls.traverseSensitivity,
    cameraControls.zoomSensitivity,
    globeReady,
    setCameraCursor,
  ])

  useEffect(() => {
    objectsRef.current.forEach((obj) => {
      applyDisplaySettings(obj, globeDisplay)
    })
  }, [globeDisplay])

  useEffect(() => {
    const container = containerRef.current
    const threadCanvas = threadCanvasRef.current
    if (!container || !threadCanvas || displayItems.length === 0) return

    const threadCtx = threadCanvas.getContext('2d')
    if (!threadCtx) return

    clustersRef.current = null
    clusterFocusRef.current = null
    linkClusterFocusRef.current = false
    preFocusCameraZRef.current = null
    focusBlendRef.current = 0
    lastCenterPrefetchAtRef.current = 0
    lastRingPairLoadAtRef.current = 0
    introRotationHandoffRef.current = 0
    introExitStartedAtRef.current = 0
    ringFrontLoadIndexRef.current = 0
    ringBackLoadIndexRef.current = 0
    centerFrontLoadIndexRef.current = 0
    centerBackLoadIndexRef.current = 0
    ringFrontLoadQueueRef.current = []
    ringBackLoadQueueRef.current = []
    introSceneStartedAtRef.current = performance.now()
    setFocusedClusterLabel(null)

    const isClusters = globeArrangement === 'clusters'
    const layout = isClusters
      ? computeClusterLayout(displayItems, constellationRef.current)
      : null
    layoutClustersRef.current = layout?.clusters ?? []
    layoutBridgesRef.current = layout?.bridges ?? []
    layoutFieldRadiusRef.current = layout?.fieldRadius ?? GLOBE_RADIUS
    layoutClusterGlobesRef.current = layout?.clusterGlobes ?? []
    itemClusterIdRef.current = layout?.itemClusterId ?? new Map()

    const { cssRenderer, camera, scene, globe } = createGlobeRenderers(
      container,
    )
    cssRendererRef.current = cssRenderer
    globeGroupRef.current = globe
    cameraRef.current = camera
    sceneRef.current = scene
    globe.matrixAutoUpdate = true

    const objects: CSS3DObject[] = []
    const objectById = new Map<string, CSS3DObject>()
    const positions = getGlobePositions(
      globeArrangement,
      displayItems.length,
      GLOBE_RADIUS,
      displayItems,
    )

    const clusterGroups = new Map<string, THREE.Group>()
    if (isClusters && layout) {
      layout.clusterGlobes.forEach((clusterGlobe) => {
        const group = new THREE.Group()
        group.position.copy(clusterGlobe.center)
        group.userData.clusterId = clusterGlobe.id
        group.userData.fieldCenter = clusterGlobe.center.clone()
        group.userData.spinPhase = clusterGlobe.center.x * 0.0017 + clusterGlobe.center.z * 0.0023
        globe.add(group)
        clusterGroups.set(clusterGlobe.id, group)
      })
    }
    clusterGroupsRef.current = clusterGroups

    const loadRankByIndex = new Map<number, number>()
    const centralityOrder = displayItems
      .map((item, i) => {
        let worldPos = positions[i]
        if (isClusters && layout) {
          const clusterId = layout.itemClusterId.get(item.id)
          const clusterGlobe = clusterId
            ? layout.clusterGlobes.find((g) => g.id === clusterId)
            : null
          const fieldLocal = clusterGlobe?.fieldPositions.get(item.id)
          if (clusterGlobe && fieldLocal) {
            worldPos = clusterGlobe.center.clone().add(fieldLocal)
          } else if (layout.positions[i]) {
            worldPos = layout.positions[i]
          }
        }
        return { i, centrality: viewAxisAngularDistance(worldPos) }
      })
      .sort((a, b) => a.centrality - b.centrality)
    centralityOrder.forEach((entry, rank) => {
      loadRankByIndex.set(entry.i, rank)
    })

    const loadTotal = displayItems.length
    const ringCount = introRingCount(loadTotal)
    const centerFillCount = introCenterFillCount(loadTotal)
    const introLockedNow = introLockedRef.current

    displayItems.forEach((item, i) => {
      const loadRank = loadRankByIndex.get(i) ?? i
      const isRingMember = introIsRingMember(loadRank, loadTotal)
      const isCenterMember = !isRingMember
      const centerFillRank = isCenterMember
        ? introCenterFillRank(loadRank, loadTotal)
        : -1
      const loadDelayMs = introLockedNow
        ? 0
        : globeStaggeredLoadDelayMs(loadRank, loadTotal)
      const { object } = createPhotoElement(
        item,
        displaySettingsRef.current,
        (activated) => handleImageActivateRef.current(activated),
        setHoverLabel,
        {
          eager: false,
          holdLoad: introLockedNow,
          introBlur: introLockedNow,
          loadDelayMs,
        },
      )
      object.userData.introIsRingMember = isRingMember
      object.userData.introIsCenterMember = isCenterMember
      object.userData.introLoadRank = loadRank
      object.userData.introRingCount = ringCount
      object.userData.introCenterFillRank = centerFillRank
      object.userData.introCenterFillCount = centerFillCount
      const sphereZ =
        isClusters && layout
          ? (object.userData.fieldLocal as THREE.Vector3 | undefined)?.z ??
            positions[i].z
          : positions[i].z
      object.userData.introHemisphereFront = sphereZ >= 0

      if (isClusters && layout) {
        const clusterId = layout.itemClusterId.get(item.id)
        const group = clusterId ? clusterGroups.get(clusterId) : null
        const clusterGlobe = clusterId
          ? layout.clusterGlobes.find((g) => g.id === clusterId)
          : null
        const fieldLocal = clusterGlobe?.fieldPositions.get(item.id)
        if (group && clusterGlobe && fieldLocal) {
          placeOnSphere(object, fieldLocal.clone())
          object.userData.clusterId = clusterId
          object.userData.fieldLocal = fieldLocal.clone()
          object.userData.focusLocal =
            clusterGlobe.focusPositions.get(item.id)?.clone() ?? fieldLocal.clone()
          group.add(object)
        } else {
          placeOnSphere(object, positions[i])
          object.userData.sphereLocal = positions[i].clone()
          globe.add(object)
        }
      } else {
        placeOnSphere(object, positions[i])
        object.userData.sphereLocal = positions[i].clone()
        globe.add(object)
      }

      objects.push(object)
      objectById.set(item.id, object)
    })
    objectsRef.current = objects
    objectByIdRef.current = objectById

    const ringMembers = objects.filter((obj) => obj.userData.introIsRingMember)
    const ringFrontMembers = ringMembers.filter(
      (obj) => obj.userData.introHemisphereFront,
    )
    const ringBackMembers = ringMembers.filter(
      (obj) => !obj.userData.introHemisphereFront,
    )
    assignRingLoadSeqShuffled(
      ringFrontMembers.map((obj) => ({
        setSeq: (seq) => {
          obj.userData.introRingLoadSeq = seq
        },
      })),
    )
    assignRingLoadSeqShuffled(
      ringBackMembers.map((obj) => ({
        setSeq: (seq) => {
          obj.userData.introRingLoadSeq = seq
        },
      })),
    )
    const sortRingBySeq = (a: CSS3DObject, b: CSS3DObject) =>
      ((a.userData.introRingLoadSeq as number) ?? 0) -
      ((b.userData.introRingLoadSeq as number) ?? 0)
    ringFrontLoadQueueRef.current = [...ringFrontMembers].sort(sortRingBySeq)
    ringBackLoadQueueRef.current = [...ringBackMembers].sort(sortRingBySeq)

    const centerMembers = objects.filter((obj) => obj.userData.introIsCenterMember)
    const centerEntries = centerMembers.map((obj) => ({
      obj,
      front: Boolean(obj.userData.introHemisphereFront),
    }))
    assignParallelHemisphereRanks(
      centerEntries,
      (entry) => -((entry.obj.userData.introLoadRank as number) ?? 0),
      (entry, seq) => {
        entry.obj.userData.introCenterFillRank =
          centerEntries.length - 1 - seq
      },
    )
    centerFrontLoadQueueRef.current = centerEntries
      .filter((entry) => entry.front)
      .sort(
        (a, b) =>
          ((a.obj.userData.introLoadRank as number) ?? 0) -
          ((b.obj.userData.introLoadRank as number) ?? 0),
      )
      .map((entry) => entry.obj)
    centerBackLoadQueueRef.current = centerEntries
      .filter((entry) => !entry.front)
      .sort(
        (a, b) =>
          ((a.obj.userData.introLoadRank as number) ?? 0) -
          ((b.obj.userData.introLoadRank as number) ?? 0),
      )
      .map((entry) => entry.obj)

    startFilterFocusAnimation()
    if (zoomModeRef.current) {
      applyZoomModeCameraTarget()
    } else if (comprehensiveModeRef.current) {
      applyComprehensiveCameraTarget()
    } else {
      applyFilterSelectionCameraTarget()
    }

    const overviewBoundingRadius =
      isClusters && layout
        ? layoutBoundingRadius(layout.positions, layout.fieldRadius)
        : GLOBE_RADIUS
    const overviewCameraZ = computeGlobeOverviewCameraZ(
      overviewBoundingRadius,
      GLOBE_CAMERA_FOV,
    )
    overviewCameraZRef.current = overviewCameraZ

    const interactionState = createGlobeInteractionState(overviewCameraZ)
    if (introLockedRef.current) {
      const cameraT = globeIntroCameraProgress(introProgressRef.current)
      const introZ =
        overviewCameraZ *
        (GLOBE_INTRO_CAMERA_START_FACTOR +
          (1 - GLOBE_INTRO_CAMERA_START_FACTOR) * cameraT)
      interactionState.cameraDistance = introZ
      interactionState.targetCameraDistance = introZ
    }
    interactionStateRef.current = interactionState
    if (!introLockedRef.current) {
      introProgressRef.current = 1
      introRotationHandoffRef.current = 1
      introExitStartedAtRef.current = 0
      interactionState.cameraDistance = overviewCameraZ
      interactionState.targetCameraDistance = overviewCameraZ
      camera.position.z = overviewCameraZ
    }
    setGlobeReady(true)

    const detachInteraction = attachGlobeInteraction(
      cssRenderer.domElement,
      interactionState,
      {
        getDragSensitivity: () =>
          ANIMATION_PRESETS[animationRef.current].dragSensitivity,
        getZoomLimits: () => {
          if (!isClusters) {
            if (linkClusterFocusRef.current) {
              return {
                min: focusCameraTargetRef.current,
                max: MAX_CAMERA_Z,
              }
            }
            return { min: MIN_CAMERA_Z, max: MAX_CAMERA_Z }
          }
          if (clusterFocusRef.current) {
            return {
              min: focusCameraTargetRef.current,
              max: CLUSTER_MAX_CAMERA_Z,
            }
          }
          return { min: CLUSTER_MIN_CAMERA_Z, max: CLUSTER_MAX_CAMERA_Z }
        },
        onDragChange: (active) => {
          setGlobeDraggingRef.current(active)
          if (active) complexityFocusAnimRef.current = null
        },
        onBackgroundPointerDown: () => handleBackgroundPointerDownRef.current(),
      },
    )

    let time = 0
    let lastFrame = performance.now()
    let lastCameraZ = overviewCameraZ
    camera.position.z = interactionState.cameraDistance

    const resize = () => {
      const { clientWidth, clientHeight } = container
      if (clientWidth < 1 || clientHeight < 1) return

      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      cssRenderer.setSize(clientWidth, clientHeight)
      const dpr = window.devicePixelRatio || 1
      threadCanvas.width = clientWidth * dpr
      threadCanvas.height = clientHeight * dpr
      threadCanvas.style.width = `${clientWidth}px`
      threadCanvas.style.height = `${clientHeight}px`
      threadCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    resize()
    if (container.clientWidth < 1 || container.clientHeight < 1) {
      requestAnimationFrame(resize)
    }

    let frameId = 0
    let running = true
    const worldPos = new THREE.Vector3()

    const focusBlendTarget = { current: 0 }

    const animate = (now: number) => {
      if (!running) return
      frameId = requestAnimationFrame(animate)

      const dt = Math.min((now - lastFrame) / 16.667, 2.5)
      lastFrame = now
      time += dt
      const timeScale = dt

      const preset = ANIMATION_PRESETS[animationRef.current]
      const introProgress = introProgressRef.current
      const introExitElapsed =
        introExitStartedAtRef.current > 0
          ? now - introExitStartedAtRef.current
          : Number.POSITIVE_INFINITY
      const introExitBlend = easeInOutCubic(
        clamp01(1 - introExitElapsed / GLOBE_INTRO_EXIT_BLEND_MS),
      )
      if (introLockedRef.current) {
        const tryFlushIntroLoad = (
          obj: CSS3DObject,
          trackRevealStart: boolean,
        ): boolean => {
          const img = obj.userData.img as HTMLImageElement | undefined
          if (img?.src) return false
          const flushDeferredLoad = obj.userData.flushDeferredLoad as
            | (() => void)
            | undefined
          if (!flushDeferredLoad) return false
          flushDeferredLoad()
          if (trackRevealStart) {
            obj.userData.introLoadStartedAt = now
          }
          const loadedImg = obj.userData.img as HTMLImageElement | undefined
          loadedImg?.decode?.().catch(() => {})
          return true
        }

        const flushIntroLoad = tryFlushIntroLoad

        const drainHemispherePairBalanced = (
          frontQueue: CSS3DObject[],
          frontIndexRef: { current: number },
          backQueue: CSS3DObject[],
          backIndexRef: { current: number },
          lastLoadRef: { current: number },
          intervalMs: number,
          trackRevealStart: boolean,
          frontCap: number,
          backCap: number,
          skipInterval = false,
          maxLoadsPerTick = 2,
        ) => {
          if (!skipInterval && now - lastLoadRef.current < intervalMs) {
            return
          }

          const countLoaded = (queue: CSS3DObject[]) => {
            let count = 0
            for (const obj of queue) {
              const img = obj.userData.img as HTMLImageElement | undefined
              if (img?.src) count += 1
            }
            return count
          }

          const drainOneFrom = (queue: CSS3DObject[], indexRef: { current: number }) => {
            let i = indexRef.current
            while (i < queue.length) {
              const obj = queue[i]
              i += 1
              const img = obj.userData.img as HTMLImageElement | undefined
              if (img?.src) continue
              if (flushIntroLoad(obj, trackRevealStart)) {
                indexRef.current = i
                const loadedImg = obj.userData.img as HTMLImageElement | undefined
                loadedImg?.decode?.().catch(() => {})
                return true
              }
            }
            indexRef.current = i
            return false
          }

          const frontLoaded = countLoaded(frontQueue)
          const backLoaded = countLoaded(backQueue)
          const frontRemain = Math.max(0, frontCap - frontLoaded)
          const backRemain = Math.max(0, backCap - backLoaded)
          if (frontRemain <= 0 && backRemain <= 0) return

          const pairRounds = Math.max(1, Math.floor(maxLoadsPerTick / 2))
          let loaded = 0

          for (let round = 0; round < pairRounds; round++) {
            const fLoaded = countLoaded(frontQueue)
            const bLoaded = countLoaded(backQueue)
            const fP = frontQueue.length > 0 ? fLoaded / frontQueue.length : 1
            const bP = backQueue.length > 0 ? bLoaded / backQueue.length : 1
            const fCan = fLoaded < frontCap && fLoaded < frontQueue.length
            const bCan = bLoaded < backCap && bLoaded < backQueue.length

            if (!fCan && !bCan) break

            if (fCan && bCan) {
              if (drainOneFrom(frontQueue, frontIndexRef)) loaded += 1
              if (drainOneFrom(backQueue, backIndexRef)) loaded += 1
              continue
            }

            if (fCan && fP + 0.001 < bP) {
              if (drainOneFrom(frontQueue, frontIndexRef)) loaded += 1
              continue
            }

            if (bCan && bP + 0.001 < fP) {
              if (drainOneFrom(backQueue, backIndexRef)) loaded += 1
              continue
            }

            break
          }

          if (loaded > 0) {
            lastLoadRef.current = now
          }
        }

        const ringFrontQueue = ringFrontLoadQueueRef.current
        const ringBackQueue = ringBackLoadQueueRef.current
        const centerFrontQueue = centerFrontLoadQueueRef.current
        const centerBackQueue = centerBackLoadQueueRef.current
        const sceneObjects = objectsRef.current
        const introImageTotal =
          ringFrontQueue.length +
          ringBackQueue.length +
          centerFrontQueue.length +
          centerBackQueue.length
        let introImagesLoaded = 0
        for (const obj of sceneObjects) {
          const img = obj.userData.img as HTMLImageElement | undefined
          if (img?.src) introImagesLoaded += 1
        }
        const loadBehind = introLoadBehindSchedule(
          introProgress,
          introImagesLoaded,
          introImageTotal,
        )
        introGlobeReadyRef.current = introGlobeSequenceComplete(
          introProgress,
          introImagesLoaded,
          introImageTotal,
        )
        introLoadedFractionRef.current = introGlobeLoadFraction(
          introImagesLoaded,
          introImageTotal,
        )

        if (
          (ringFrontQueue.length > 0 || ringBackQueue.length > 0) &&
          introProgress >= GLOBE_INTRO_RING_START
        ) {
          const ringCaps = introRingHemisphereLoadCaps(
            introProgress,
            ringFrontQueue.length,
            ringBackQueue.length,
          )
          drainHemispherePairBalanced(
            ringFrontQueue,
            ringFrontLoadIndexRef,
            ringBackQueue,
            ringBackLoadIndexRef,
            lastRingPairLoadAtRef,
            GLOBE_INTRO_RING_PAIR_INTERVAL_MS,
            true,
            ringCaps.frontCap,
            ringCaps.backCap,
            loadBehind,
            loadBehind ? 7 : 2,
          )
        }

        if (introCenterPrefetchActive(introProgress)) {
          const centerCaps = introCenterHemisphereLoadCaps(
            introProgress,
            centerFrontQueue.length,
            centerBackQueue.length,
          )
          drainHemispherePairBalanced(
            centerFrontQueue,
            centerFrontLoadIndexRef,
            centerBackQueue,
            centerBackLoadIndexRef,
            lastCenterPrefetchAtRef,
            GLOBE_INTRO_CENTER_PREFETCH_INTERVAL_MS,
            true,
            centerCaps.frontCap,
            centerCaps.backCap,
            loadBehind,
            loadBehind ? 7 : 2,
          )
        }
      } else {
        introLoadedFractionRef.current = 1
      }
      const introMotionP = introLockedRef.current
        ? globeIntroMotionEase(introProgress)
        : 1
      const introDepthFadeP =
        introLockedRef.current || introExitBlend > 0.01
          ? globeIntroDepthFadeProgress(
              introLockedRef.current ? introProgress : 1,
            )
          : 1
      let introRotationHandoff = introLockedRef.current
        ? globeIntroRotationHandoff(introProgress)
        : introRotationHandoffRef.current
      if (!introLockedRef.current && introRotationHandoff < 0.999) {
        introRotationHandoff +=
          (1 - introRotationHandoff) * (1 - Math.pow(0.035, timeScale))
        introRotationHandoffRef.current = introRotationHandoff
      } else if (introLockedRef.current) {
        introRotationHandoffRef.current = introRotationHandoff
      }
      const depthFade =
        displaySettingsRef.current.depthFade *
        (introLockedRef.current || introExitBlend > 0.01 ? introDepthFadeP : 1)
      const depthFadeRange = displaySettingsRef.current.depthFadeRange

      if (!interactionState.dragActive) {
        const friction = Math.pow(preset.friction, timeScale)
        const focusAnim = complexityFocusAnimRef.current
        const categoryFilterActive =
          highlightedFilterRef.current !== null
        const inComplexityFocus =
          focusAnim &&
          (activeComplexityRef.current ||
            categoryFilterActive ||
            zoomModeRef.current) &&
          !clusterFocusRef.current &&
          !linkClusterFocusRef.current

        if (inComplexityFocus) {
          interactionState.velocityX *= friction
          interactionState.velocityY *= friction

          const elapsed = now - focusAnim.startedAt
          const t = Math.min(1, elapsed / COMPLEXITY_FOCUS_DURATION_MS)
          const eased = easeInOutCubic(t)
          const dx = shortestAngleDelta(focusAnim.startX, focusAnim.targetX)
          const dy = shortestAngleDelta(focusAnim.startY, focusAnim.targetY)

          interactionState.rotationX = focusAnim.startX + dx * eased
          interactionState.rotationY = focusAnim.startY + dy * eased
          interactionState.rotationY += preset.autoRotateY * timeScale * introMotionP

          if (preset.wobble) {
            const amp = preset.wobbleAmplitude ?? 0.15
            const speed = preset.wobbleSpeed ?? 0.001
            const motionP = introLockedRef.current ? introMotionP : 1
            interactionState.rotationX +=
              Math.sin(time * speed) * amp * 0.02 * timeScale * motionP
            interactionState.rotationY +=
              Math.cos(time * speed * 0.7) * amp * 0.015 * timeScale * motionP
          } else {
            interactionState.rotationX += preset.autoRotateX * timeScale * introMotionP
          }

          if (t >= 1) {
            complexityFocusAnimRef.current = null
          }
        } else {
          interactionState.velocityX *= friction
          interactionState.velocityY *= friction

          const revealSpin =
            introLockedRef.current && introRevealActive(introProgress)
          const ySpinScale = revealSpin
            ? introMotionP
            : introLockedRef.current
              ? 0
              : 1

          if (introRotationHandoff < 1) {
            const handoffEased = easeInOutCubic(introRotationHandoff)
            const xyDamp = Math.pow(
              0.92 + 0.08 * handoffEased,
              timeScale,
            )
            interactionState.rotationX *= xyDamp
            interactionState.rotationY *= xyDamp
            if (handoffEased < 0.82) {
              interactionState.rotationZ +=
                GLOBE_INTRO_RING_DRIFT_Z *
                (1 - handoffEased) *
                timeScale
            }
          }

          const zDecay =
            introRotationHandoff > 0.75 ? 0.72 : 0.84 + 0.16 * (1 - introRotationHandoff)
          interactionState.rotationZ *= Math.pow(zDecay, timeScale)

          if (
            introRotationHandoff > 0.05 &&
            introRotationHandoff < 0.72 &&
            Math.abs(interactionState.rotationZ) > 0.0005
          ) {
            const fold =
              (1 - Math.pow(0.92, timeScale)) *
              easeInOutCubic(introRotationHandoff) *
              0.06
            interactionState.rotationY += interactionState.rotationZ * fold
            interactionState.rotationZ *= 1 - fold
          }

          const autoY = preset.autoRotateY * ySpinScale
          interactionState.rotationX += interactionState.velocityX * timeScale
          interactionState.rotationY +=
            (interactionState.velocityY + autoY) * timeScale

          if (preset.wobble) {
            const amp = preset.wobbleAmplitude ?? 0.15
            const speed = preset.wobbleSpeed ?? 0.001
            const wobbleP = introLockedRef.current
              ? Math.max(introRotationHandoff, introMotionP)
              : 1
            interactionState.rotationX +=
              Math.sin(time * speed) * amp * 0.02 * timeScale * wobbleP
            interactionState.rotationY +=
              Math.cos(time * speed * 0.7) * amp * 0.015 * timeScale * wobbleP
          } else {
            const xSpinScale = revealSpin
              ? introMotionP
              : introLockedRef.current
                ? introRotationHandoff
                : 1
            interactionState.rotationX += preset.autoRotateX * timeScale * xSpinScale
          }
        }

        interactionState.rotationX = Math.max(
          -0.9,
          Math.min(0.9, interactionState.rotationX),
        )
      }

      const complexityBlendTarget = activeComplexityRef.current ? 1 : 0
      complexityBlendRef.current +=
        (complexityBlendTarget - complexityBlendRef.current) *
        (1 - Math.pow(COMPLEXITY_BLEND_RATE, timeScale))

      const categoryHighlightActive =
        highlightedFilterRef.current !== null
      const categoryBlendTarget = categoryHighlightActive ? 1 : 0
      categoryBlendRef.current +=
        (categoryBlendTarget - categoryBlendRef.current) *
        (1 - Math.pow(CATEGORY_BLEND_RATE, timeScale))

      if (isClusters) {
        focusBlendTarget.current = clusterFocusRef.current ? 1 : 0
      } else if (
        linkClusterRef.current.enabled &&
        linkClusterFocusRef.current
      ) {
        focusBlendTarget.current = 1
      } else {
        focusBlendTarget.current = 0
      }

      if (clusterFocusRef.current || linkClusterFocusRef.current) {
        focusBlendRef.current = 1
      } else {
        focusBlendRef.current +=
          (focusBlendTarget.current - focusBlendRef.current) * 0.12 * timeScale
      }

      if (isClusters) {
        const focusId = clusterFocusRef.current
        const constellationSettings = constellationRef.current
        const elementPreset =
          ANIMATION_PRESETS[constellationSettings.elementAnimation]

        if (
          focusId &&
          interactionState.cameraDistance < focusCameraTargetRef.current * 1.08
        ) {
          focusZoomArmedRef.current = true
        }

        if (
          focusId &&
          focusZoomArmedRef.current &&
          interactionState.cameraDistance > focusCameraTargetRef.current * 1.55
        ) {
          exitConstellationFocus(false)
        }

        globe.position.set(0, 0, 0)

        clusterGroupsRef.current.forEach((group, clusterId) => {
          const fieldCenter = group.userData.fieldCenter as THREE.Vector3
          if (focusId === clusterId) {
            group.position.set(0, 0, 0)
            group.rotation.set(0, 0, 0)
          } else if (focusId) {
            group.position.copy(fieldCenter)
            const phase = (group.userData.spinPhase as number) ?? 0
            const focusWeight = 0.35
            const targetScale = 1
            const nextScale =
              group.scale.x + (targetScale - group.scale.x) * 0.14 * timeScale
            group.scale.setScalar(nextScale)

            if (elementPreset.wobble) {
              const amp = elementPreset.wobbleAmplitude ?? 0.15
              const speed = elementPreset.wobbleSpeed ?? 0.0008
              group.rotation.x +=
                Math.sin(time * speed + phase) *
                amp *
                0.025 *
                timeScale *
                focusWeight
              group.rotation.y +=
                (elementPreset.autoRotateY +
                  Math.cos(time * speed * 0.7 + phase) * amp * 0.018) *
                timeScale *
                focusWeight
            } else {
              group.rotation.x +=
                elementPreset.autoRotateX * timeScale * focusWeight
              group.rotation.y +=
                elementPreset.autoRotateY * timeScale * focusWeight
            }
          } else {
            group.position.lerp(fieldCenter, 0.14 * timeScale)
            const phase = (group.userData.spinPhase as number) ?? 0
            const targetScale = 1
            const nextScale =
              group.scale.x + (targetScale - group.scale.x) * 0.14 * timeScale
            group.scale.setScalar(nextScale)

            if (elementPreset.wobble) {
              const amp = elementPreset.wobbleAmplitude ?? 0.15
              const speed = elementPreset.wobbleSpeed ?? 0.0008
              group.rotation.x +=
                Math.sin(time * speed + phase) *
                amp *
                0.025 *
                timeScale
              group.rotation.y +=
                (elementPreset.autoRotateY +
                  Math.cos(time * speed * 0.7 + phase) * amp * 0.018) *
                timeScale
            } else {
              group.rotation.x += elementPreset.autoRotateX * timeScale
              group.rotation.y += elementPreset.autoRotateY * timeScale
            }
          }
        })

        if (focusId) {
          for (let i = 0; i < objects.length; i++) {
            const obj = objects[i]
            if (obj.userData.clusterId !== focusId) continue
            const focusLocal = obj.userData.focusLocal as THREE.Vector3 | undefined
            if (!focusLocal) continue
            obj.position.copy(focusLocal)
          }
        } else {
          for (let i = 0; i < objects.length; i++) {
            const obj = objects[i]
            const fieldLocal = obj.userData.fieldLocal as THREE.Vector3 | undefined
            if (!fieldLocal) continue
            obj.position.copy(fieldLocal)
          }
        }
      }

      if (
        !isClusters &&
        linkClusterRef.current.enabled &&
        clustersRef.current &&
        linkClusterFocusRef.current
      ) {
        const linkCluster = clustersRef.current
        const linked = clusterMemberIds(linkCluster)

        if (
          interactionState.cameraDistance < focusCameraTargetRef.current * 1.08
        ) {
          focusZoomArmedRef.current = true
        }

        if (
          focusZoomArmedRef.current &&
          interactionState.cameraDistance > focusCameraTargetRef.current * 1.55
        ) {
          exitLinkClusterFocus(false)
        }

        for (let i = 0; i < objects.length; i++) {
          const obj = objects[i]
          const item = obj.userData.item as GalleryItem | undefined
          const focusLocal = obj.userData.focusLocal as THREE.Vector3 | undefined
          if (!item || !focusLocal) continue
          if (linked.has(item.id)) {
            obj.position.copy(focusLocal)
          }
        }
      }

      globe.rotation.x = interactionState.rotationX
      globe.rotation.y = interactionState.rotationY
      globe.rotation.z = interactionState.rotationZ

      const clusterFocused =
        (isClusters && clusterFocusRef.current) ||
        linkClusterFocusRef.current
      const categoryFilterActive =
        highlightedFilterRef.current !== null
      const inComplexityFocus = Boolean(
        complexityFocusAnimRef.current &&
          (activeComplexityRef.current ||
            categoryFilterActive ||
            zoomModeRef.current) &&
          !clusterFocusRef.current &&
          !linkClusterFocusRef.current,
      )

      let effectiveCameraZ = interactionState.cameraDistance

      if (introLockedRef.current || introExitBlend > 0.01) {
        const introOverviewZ = overviewCameraZRef.current
        const cameraT = globeIntroCameraProgress(
          introLockedRef.current ? introProgressRef.current : 1,
        )
        const targetIntroZ =
          introOverviewZ *
          (GLOBE_INTRO_CAMERA_START_FACTOR +
            (1 - GLOBE_INTRO_CAMERA_START_FACTOR) * cameraT)
        interactionState.cameraDistance = targetIntroZ
        interactionState.targetCameraDistance = targetIntroZ
        effectiveCameraZ = targetIntroZ
      } else {
      const delta =
        interactionState.targetCameraDistance -
        interactionState.cameraDistance
      const focusEnterAge = now - clusterFocusedAtRef.current
      const focusSnap =
        clusterFocused && focusEnterAge < 1200 && Math.abs(delta) > 0.5
      const focusPullBack = clusterFocused && delta > 0
      const screenFillZoomActive =
        comprehensiveZoomTargetRef.current != null &&
        (zoomModeRef.current ||
          Boolean(activeComplexityRef.current) ||
          highlightedFilterRef.current !== null)
      const zoomSmooth = screenFillZoomActive
        ? 1 - Math.pow(COMPREHENSIVE_ZOOM_SMOOTH, timeScale)
        : focusSnap
          ? 1
          : focusPullBack
            ? 1 - Math.pow(0.015, timeScale)
            : 1 - Math.pow(0.0012, timeScale)
      interactionState.cameraDistance += delta * zoomSmooth

      const allowAutoZoom =
        !interactionState.dragActive &&
        !clusterFocused &&
        !inComplexityFocus &&
        !screenFillZoomActive &&
        !selectedItemRef.current
      const autoZoomRamp = 1 - introExitBlend
      const autoZoomOffset =
        allowAutoZoom && autoZoomRamp > 0.001
          ? computeAnimationZoomOffset(preset, time, overviewCameraZ) *
            autoZoomRamp
          : 0
      effectiveCameraZ = interactionState.cameraDistance + autoZoomOffset
      }

      camera.position.z = effectiveCameraZ

      const fieldRadius = layoutFieldRadiusRef.current
      const nextCameraFar = Math.max(
        16000,
        interactionState.cameraDistance + fieldRadius * 3.2,
      )
      if (Math.abs(camera.far - nextCameraFar) > 1) {
        camera.far = nextCameraFar
        camera.updateProjectionMatrix()
      }

      globe.updateMatrixWorld(true)
      camera.updateMatrixWorld(true)

      const cameraMoving =
        Math.abs(effectiveCameraZ - lastCameraZ) > 0.35
      lastCameraZ = effectiveCameraZ

      const cluster = clustersRef.current
      const clusterDimActive =
        linkClusterRef.current.enabled && cluster !== null
      const linkedIds = cluster ? clusterMemberIds(cluster) : null
      const linkClusterFocused =
        !isClusters &&
        linkClusterRef.current.enabled &&
        linkClusterFocusRef.current
      const constellationFocusId = isClusters ? clusterFocusRef.current : null
      const visibilityZ =
        (isClusters && constellationFocusId) || linkClusterFocused
          ? 240
          : displaySettingsRef.current.depthVisibility
      const focusedGlobeIds = constellationFocusId
        ? layoutClusterGlobesRef.current.find((g) => g.id === constellationFocusId)
            ?.itemIds
        : null

      const complexityBlend = complexityBlendRef.current
      const categoryBlend = categoryBlendRef.current
      const activeComplexity = activeComplexityRef.current
      const highlightedFilter = highlightedFilterRef.current
      const comprehensiveActive =
        comprehensiveModeRef.current &&
        (Boolean(activeComplexity) || highlightedFilter !== null) &&
        (complexityBlend > 0.01 || categoryBlend > 0.01) &&
        !clusterDimActive &&
        !constellationFocusId &&
        !linkClusterFocused
      const zoomModeActive =
        zoomModeRef.current &&
        !clusterDimActive &&
        !constellationFocusId &&
        !linkClusterFocused
      const screenFillActive = comprehensiveActive || zoomModeActive

      const introLockedNow = introLockedRef.current
      const introVisualProgress = introLockedNow ? introProgress : 1
      const introVisualActive = introLockedNow || introExitBlend > 0.01
      const introRevealOn =
        introVisualActive && introRevealActive(introVisualProgress)
      const introFillP = introVisualActive
        ? globeIntroFillProgress(introVisualProgress)
        : 0
      const introCutoutRad = introVisualActive
        ? introScreenCenterCutoutRad(introVisualProgress)
        : 0

      const countIntroQueueLoaded = (queue: CSS3DObject[]) => {
        let count = 0
        for (const entry of queue) {
          const img = entry.userData.img as HTMLImageElement | undefined
          if (img?.src) count += 1
        }
        return count
      }

      const ringFrontQueue = ringFrontLoadQueueRef.current
      const ringBackQueue = ringBackLoadQueueRef.current
      const centerFrontQueue = centerFrontLoadQueueRef.current
      const centerBackQueue = centerBackLoadQueueRef.current
      const ringFrontLoaded = introVisualActive
        ? countIntroQueueLoaded(ringFrontQueue)
        : 0
      const ringBackLoaded = introVisualActive
        ? countIntroQueueLoaded(ringBackQueue)
        : 0
      const centerFrontLoaded = introVisualActive
        ? countIntroQueueLoaded(centerFrontQueue)
        : 0
      const centerBackLoaded = introVisualActive
        ? countIntroQueueLoaded(centerBackQueue)
        : 0

      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i]
        const el = obj.userData.element as HTMLElement
        if (!el) continue

        const item = obj.userData.item as GalleryItem

        if (!updateObjectVisibility(obj, camera, el, visibilityZ)) continue

        if (screenFillActive && isGlobePointFacingCamera(obj, camera)) {
          if (el.style.opacity !== '0') el.style.opacity = '0'
          el.style.pointerEvents = 'none'
          obj.userData.globePointerEvents = 'none'
          continue
        }

        if (introVisualActive) {
          const isRingMember = Boolean(obj.userData.introIsRingMember)
          const isCenterMember = Boolean(obj.userData.introIsCenterMember)
          const isBackHemisphere = !obj.userData.introHemisphereFront
          const img = obj.userData.img as HTMLImageElement | undefined
          const imageLoaded = Boolean(img?.src && img.complete)
          let introOpacity = 0

          if (isRingMember) {
            const loadStartedAt = obj.userData.introLoadStartedAt as
              | number
              | undefined

            if (introCutoutRad > 0.001) {
              worldPos.setFromMatrixPosition(obj.matrixWorld)
              if (introInScreenCenterCutout(worldPos, camera, introCutoutRad)) {
                if (el.style.opacity !== '0') el.style.opacity = '0'
                el.style.pointerEvents = 'none'
                continue
              }
            }

            if (!loadStartedAt || !img?.src) {
              if (el.style.opacity !== '0') el.style.opacity = '0'
              el.style.pointerEvents = 'none'
              continue
            }

            introOpacity = introTileOpacity(loadStartedAt, now, imageLoaded)
            if (
              isBackHemisphere &&
              !introBackHemisphereMayShow(
                true,
                ringFrontLoaded,
                ringFrontQueue.length,
                ringBackLoaded,
                ringBackQueue.length,
              )
            ) {
              introOpacity = 0
            }
          } else if (
            isCenterMember &&
            introRevealOn &&
            introCenterPrefetchActive(introVisualProgress)
          ) {
            const centerFillRank =
              (obj.userData.introCenterFillRank as number) ?? -1
            const centerFillCount =
              (obj.userData.introCenterFillCount as number) ?? 1
            const stagger = introCenterItemReveal(
              introFillP,
              centerFillRank,
              centerFillCount,
              isBackHemisphere,
            )
            if (stagger <= 0.001) {
              if (el.style.opacity !== '0') el.style.opacity = '0'
              el.style.pointerEvents = 'none'
              continue
            }

            let loadStartedAt = obj.userData.introLoadStartedAt as
              | number
              | undefined
            if (!loadStartedAt && img?.src) {
              loadStartedAt = now
              obj.userData.introLoadStartedAt = loadStartedAt
            }

            if (!img?.src) {
              if (el.style.opacity !== '0') el.style.opacity = '0'
              el.style.pointerEvents = 'none'
              continue
            }

            if (!loadStartedAt) {
              loadStartedAt = now
              obj.userData.introLoadStartedAt = loadStartedAt
            }

            introOpacity =
              introCenterTileOpacity(loadStartedAt, now, imageLoaded) * stagger
            if (
              isBackHemisphere &&
              !introBackHemisphereMayShow(
                true,
                centerFrontLoaded,
                centerFrontQueue.length,
                centerBackLoaded,
                centerBackQueue.length,
              )
            ) {
              introOpacity = 0
            }
          }

          if (introOpacity <= 0) {
            if (el.style.opacity !== '0') el.style.opacity = '0'
            el.style.pointerEvents = 'none'
            continue
          }

          if (
            introCutoutRad > 0.001 &&
            isCenterMember &&
            introRevealOn &&
            introFillP < 0.94
          ) {
            worldPos.setFromMatrixPosition(obj.matrixWorld)
            if (introInScreenCenterCutout(worldPos, camera, introCutoutRad)) {
              if (el.style.opacity !== '0') el.style.opacity = '0'
              el.style.pointerEvents = 'none'
              continue
            }
          }

          billboardTowardCamera(obj, camera)

          if (introDepthFadeP > 0.001) {
            worldPos.setFromMatrixPosition(obj.matrixWorld)
            const dist = worldPos.distanceTo(camera.position)
            const fieldRadius = layoutFieldRadiusRef.current
            const t = depthFadeDistanceT(
              dist,
              effectiveCameraZ,
              fieldRadius,
              depthFadeRange,
            )
            introOpacity *= introDepthOpacityAtDistance(introDepthFadeP, t)
          }

          if (!introLockedNow && introExitBlend < 0.999) {
            let settledOpacity = 1
            if (isClusters && !constellationFocusId) settledOpacity = 0.94
            if (depthFade > 0) {
              worldPos.setFromMatrixPosition(obj.matrixWorld)
              const dist = worldPos.distanceTo(camera.position)
              const fieldRadius = layoutFieldRadiusRef.current
              const t = depthFadeDistanceT(
                dist,
                effectiveCameraZ,
                fieldRadius,
                depthFadeRange,
              )
              settledOpacity *= introDepthOpacityAtDistance(depthFade, t)
            }
            introOpacity =
              introOpacity * introExitBlend +
              settledOpacity * (1 - introExitBlend)
          }

          const introOpacityStr = String(introOpacity)
          if (el.style.opacity !== introOpacityStr) el.style.opacity = introOpacityStr
          el.style.pointerEvents = introOpacity > 0.05 ? 'auto' : 'none'
          continue
        }

        billboardTowardCamera(obj, camera)

        if (el.dataset.hovered === 'true') {
          if (el.style.opacity !== '1') el.style.opacity = '1'
          continue
        }

        if (
          (cameraMoving || interactionState.dragActive) &&
          introExitBlend < 0.01
        ) {
          continue
        }

        let opacity = 1
        let zIndex = '1'
        if (clusterDimActive && linkedIds) {
          const inCluster = linkedIds.has(item.id)
          if (linkClusterFocusRef.current) {
            opacity = inCluster ? 1 : 0.08
            zIndex = inCluster
              ? String(180 + Math.round(focusBlendRef.current * 40))
              : '1'
          } else {
            opacity = inCluster ? 1 : CLUSTER_OUTSIDE_OPACITY
          }
        } else if (constellationFocusId && focusedGlobeIds) {
          const inFocus = focusedGlobeIds.has(item.id)
          opacity = inFocus ? 1 : 0.08
          zIndex = inFocus
            ? String(180 + Math.round(focusBlendRef.current * 40))
            : '1'
        } else if (isClusters && !constellationFocusId) {
          opacity = 0.94
        }

        if (
          !clusterDimActive &&
          !constellationFocusId &&
          activeComplexity &&
          complexityBlend > 0.01
        ) {
          if (item.complexity !== activeComplexity) {
            opacity *= 1 - complexityBlend * (1 - COMPLEXITY_DIM_OPACITY)
          }
        }

        if (
          !clusterDimActive &&
          !constellationFocusId &&
          categoryHighlightActive &&
          categoryBlend > 0.01
        ) {
          if (!itemMatchesFilter(item, highlightedFilter)) {
            opacity *= 1 - categoryBlend * (1 - COMPLEXITY_DIM_OPACITY)
          }
        }

        const filterActive = highlightedFilter !== null
        const matchesComprehensiveSelection =
          comprehensiveActive &&
          (!activeComplexity || item.complexity === activeComplexity) &&
          (!filterActive || itemMatchesFilter(item, highlightedFilter))
        const matchesZoomDisplay = zoomModeActive

        if (matchesComprehensiveSelection || matchesZoomDisplay) {
          opacity = 1
        }

        if (el.style.zIndex !== zIndex) el.style.zIndex = zIndex

        if (
          depthFade > 0 &&
          !matchesComprehensiveSelection &&
          !matchesZoomDisplay
        ) {
          worldPos.setFromMatrixPosition(obj.matrixWorld)
          const dist = worldPos.distanceTo(camera.position)
          const fieldRadius = layoutFieldRadiusRef.current
          const t = depthFadeDistanceT(
            dist,
            effectiveCameraZ,
            fieldRadius,
            depthFadeRange,
          )
          opacity *= introDepthOpacityAtDistance(depthFade, t)
        }

        const opacityStr = String(opacity)
        if (el.style.opacity !== opacityStr) el.style.opacity = opacityStr

        if (constellationFocusId && focusedGlobeIds) {
          const inFocus = focusedGlobeIds.has(item.id)
          const nextPointerEvents = inFocus ? 'auto' : 'none'
          if (obj.userData.globePointerEvents !== nextPointerEvents) {
            el.style.pointerEvents = nextPointerEvents
            obj.userData.globePointerEvents = nextPointerEvents
          }
        } else if (linkClusterFocused && linkedIds) {
          const inCluster = linkedIds.has(item.id)
          const nextPointerEvents = inCluster ? 'auto' : 'none'
          if (obj.userData.globePointerEvents !== nextPointerEvents) {
            el.style.pointerEvents = nextPointerEvents
            obj.userData.globePointerEvents = nextPointerEvents
          }
        } else if (
          !clusterDimActive &&
          !constellationFocusId &&
          ((activeComplexity && complexityBlend > 0.01) ||
            (categoryHighlightActive && categoryBlend > 0.01))
        ) {
          const complexityFilterActive =
            Boolean(activeComplexity) && complexityBlend > 0.01
          const categoryFilterActive = categoryHighlightActive && categoryBlend > 0.01
          const matchesComplexity =
            !complexityFilterActive || item.complexity === activeComplexity
          const matchesFilter =
            !categoryFilterActive || itemMatchesFilter(item, highlightedFilter)
          const nextPointerEvents =
            matchesComplexity && matchesFilter ? 'auto' : 'none'
          if (obj.userData.globePointerEvents !== nextPointerEvents) {
            el.style.pointerEvents = nextPointerEvents
            obj.userData.globePointerEvents = nextPointerEvents
          }
        } else if (obj.userData.globePointerEvents !== 'auto') {
          el.style.pointerEvents = 'auto'
          obj.userData.globePointerEvents = 'auto'
        }
      }

      const activeFocusObjects: CSS3DObject[] = []
      if (isClusters && constellationFocusId) {
        for (let i = 0; i < objects.length; i++) {
          const obj = objects[i]
          if (obj.userData.clusterId === constellationFocusId) {
            activeFocusObjects.push(obj)
          }
        }
      } else if (linkClusterFocused && clustersRef.current) {
        const linked = clusterMemberIds(clustersRef.current)
        for (let i = 0; i < objects.length; i++) {
          const obj = objects[i]
          const item = obj.userData.item as GalleryItem | undefined
          if (item && linked.has(item.id)) {
            activeFocusObjects.push(obj)
          }
        }
      }

      if (activeFocusObjects.length > 0) {
        for (let i = 0; i < activeFocusObjects.length; i++) {
          billboardTowardCamera(activeFocusObjects[i], camera)
        }
        globe.updateMatrixWorld(true)
        const fittedZ = pullClusterIntoViewport(
          activeFocusObjects,
          camera,
          scene,
          cssRenderer,
          undefined,
          container,
        )
        if (fittedZ > interactionState.cameraDistance) {
          interactionState.cameraDistance = fittedZ
          interactionState.targetCameraDistance = fittedZ
          focusCameraTargetRef.current = fittedZ
          camera.position.z = fittedZ
        }
      }

      cssRenderer.render(scene, camera)

      const { clientWidth, clientHeight } = container
      if (
        linkClusterRef.current.enabled &&
        linkClusterFocusRef.current &&
        clustersRef.current
      ) {
        drawClusterThreads(
          threadCtx,
          clustersRef.current,
          objectById,
          camera,
          clientWidth,
          clientHeight,
          linkClusterRef.current,
        )
      } else {
        threadCtx.clearRect(0, 0, clientWidth, clientHeight)
      }
    }
    frameId = requestAnimationFrame(animate)

    return () => {
      running = false
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      detachInteraction()
      container.removeChild(cssRenderer.domElement)
      globeGroupRef.current = null
      cameraRef.current = null
      sceneRef.current = null
      cssRendererRef.current = null
      interactionStateRef.current = null
      setGlobeReady(false)

      objects.forEach((obj) => {
        const cancelDeferredLoad = obj.userData.cancelDeferredLoad as
          | (() => void)
          | undefined
        cancelDeferredLoad?.()
        globe.remove(obj)
        obj.element.remove()
      })
      objectsRef.current = []
      objectByIdRef.current.clear()
      clustersRef.current = null
      layoutClustersRef.current = []
      layoutBridgesRef.current = []
      layoutClusterGlobesRef.current = []
      itemClusterIdRef.current.clear()
      clusterGroupsRef.current.clear()
      clusterFocusRef.current = null
      linkClusterFocusRef.current = false
      preFocusCameraZRef.current = null
      focusZoomArmedRef.current = false
      setFocusedClusterLabel(null)
      setGlobeDraggingRef.current(false)
      setHoverLabel(null)
      complexityBlendRef.current = 0
      categoryBlendRef.current = 0
      complexityFocusAnimRef.current = null
    }
  }, [
    displayItems,
    globeArrangement,
    constellation.clusterSpread,
    constellation.elementSeparation,
    constellation.elementLayout,
    constellation.fieldLayout,
  ])

  if (filteredItems.length === 0) {
    return (
      <div className="globe-view globe-view--empty flex h-full items-center justify-center text-neutral-400">
        No images match the current filters.
      </div>
    )
  }

  return (
    <div className="globe-view relative h-full w-full overflow-hidden">
      {focusedClusterLabel && (
        <div className="pointer-events-none absolute top-20 left-1/2 z-10 -translate-x-1/2 text-center">
          <p className="text-sm font-medium text-neutral-700 capitalize">
            {focusedClusterLabel}
          </p>
          <p className="mt-1 text-[11px] text-neutral-400">
            {globeArrangement === 'clusters'
              ? 'Click background to return · click image for detail'
              : 'Click background to return · click image for detail'}
          </p>
          <button
            type="button"
            onClick={() => {
              if (globeArrangement === 'clusters') {
                exitConstellationFocus(true)
              } else {
                exitLinkClusterFocus(true)
              }
            }}
            className="pointer-events-auto mt-3 rounded-full border border-neutral-300 bg-white px-4 py-1.5 text-xs text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50"
          >
            Exit cluster
          </button>
        </div>
      )}

      <canvas
        ref={threadCanvasRef}
        className="pointer-events-none absolute inset-0 z-[1]"
        aria-hidden
      />

      <div
        ref={containerRef}
        className="absolute inset-0 z-[2]"
        style={{
          pointerEvents: introLocked || !showInteractionHint ? 'none' : 'auto',
        }}
      />

      <CameraGesturePreview
        videoRef={cameraVideoRef}
        status={cameraStatus}
        visible={cameraControls.enabled && cameraControls.showPreview}
      />

      <motion.div
        className="pointer-events-none absolute left-1/2 w-max max-w-[min(42rem,calc(100vw-4rem))] -translate-x-1/2 translate-y-1/2 px-4 text-center"
        style={{ bottom: 'var(--killchain-bottom-chrome-midline)' }}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: entranceReady && showInteractionHint ? 1 : 0 }}
        transition={reduceMotion ? { duration: 0 } : SETTINGS_MENU_ENTRANCE.transition}
      >
        <p className="text-black" style={{ fontSize: 'var(--killchain-chrome-hint-font-size)' }}>
          {cameraControls.enabled
            ? 'Point to move · hand closer/farther to zoom · pinch to select · pinch twice to close'
            : globeArrangement === 'clusters'
              ? focusedClusterLabel
                ? 'Inside cluster · click image for detail · background to return'
                : 'Click an image to zoom into its cluster · drag to explore'
              : linkCluster.enabled
              ? focusedClusterLabel
                ? 'Inside cluster · click image for detail · background to return'
                : 'Click an image to zoom into its cluster'
              : 'Drag or pinch to spin · scroll to zoom · click to inspect'}
        </p>
        <p
          ref={hoverLabelRef}
          className="mt-1 text-black capitalize"
          style={{
            fontSize: 'var(--killchain-chrome-hint-font-size)',
            display: 'none',
          }}
        />
      </motion.div>
    </div>
  )
}
