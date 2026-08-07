import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import * as THREE from 'three'
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
import { useGallery } from '../../context/GalleryContext'
import { useKillchainChrome } from '../../context/KillchainChromeContext'
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
  computeFilterFocusRotation,
  computeGlobeOverviewCameraZ,
  createGlobeRenderers,
  createPhotoElement,
  depthFadeDistanceT,
  fitClusterViewportFill,
  getGlobePositions,
  globeStaggeredLoadDelayMs,
  GLOBE_OVERVIEW_SCREEN_FRACTION,
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
import {
  createFraudAxisLabel,
  fraudAxisLabelText,
} from '../../lib/fraudAxisLabels'
import {
  createClusterFocusPlaque,
  playClusterFocusPlaqueEntrance,
} from '../../lib/clusterFocusPlaque'
import {
  applyHeroClusterIntroSphereLayout,
  clusterIntroCameraZ,
  clusterIntroCenterFillProgress,
  clusterIntroDeferredLoadActive,
  clusterIntroDistanceNorm,
  clusterIntroEarlyCenterLoadCaps,
  clusterIntroFieldBoundingRadius,
  clusterIntroHeroItemBlend,
  clusterIntroHeroStartCameraZ,
  clusterIntroMotionEase,
  clusterIntroOtherReveal,
  clusterIntroRevealActive,
  clusterIntroRingHemisphereLoadCaps,
  clusterIntroRotationHandoff,
  clusterIntroScreenCenterCutoutRad,
  clusterIntroTextPhaseActive,
  clusterIntroTextSyncedRingAllowedCount,
  clusterIntroZoomProgress,
  CLUSTER_INTRO_RING_START,
  configureClusterIntroParticipation,
  pickHeroClusterGlobe,
  anchorHeroClusterAtOrigin,
  centerHeroClusterFieldPositions,
  centerSurroundingClustersAtOrigin,
} from '../../lib/clusterIntro'
import {
  focusOrbitDepthOpacity,
  focusPresentationZIndex,
  orbitSphereFocusPositions,
} from '../../lib/clusterFocusPresentation'
import {
  createSeverityOrb,
  dominantClusterComplexity,
  updateSeverityOrb,
} from '../../lib/clusterSeverityOrb'
import { findSimilarItems } from '../../lib/similarity'
import { animateClusterImageLocal, imageFlutterOffset } from '../../lib/globeMotion'
import { itemMatchesFilter, galleryItemTitle, toSentenceCase } from '../../lib/taxonomy'
import {
  CLUSTER_OUTSIDE_OPACITY,
  COMPLEXITY_DIM_OPACITY,
  clusterItems,
  clusterMemberIds,
  drawClusterThreads,
  findClusterAtScreenPoint,
  setClusterHighlight,
  type ClusterHoverTarget,
  type ImageCluster,
} from '../../lib/threads'
import type { GalleryItem } from '../../types/gallery'
import {
  clusterElementPositions,
  CLUSTER_FOCUS_CAMERA_Z,
  CLUSTER_FOCUS_SCALE,
  constellationSettingsForCategoryView,
  focusClusterRadius,
  sampleClusterIntroDisplayItems,
  type ClusterGlobe,
} from '../../lib/clusterLayout'
import { CameraGesturePreview } from '../CameraGesturePreview'
import { ClusterCursorLabel } from '../globe/ClusterCursorLabel'
import '../globe/ClusterFocusPlaque.css'
import '../globe/ClusterSeverityOrb.css'
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
  assignRingLoadSeqAzimuth,
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
    categoryView,
    highlightedFilter,
  } = useGallery()
  const { setClusterFocusImmersive } = useKillchainChrome()
  const containerRef = useRef<HTMLDivElement>(null)
  const threadCanvasRef = useRef<HTMLCanvasElement>(null)
  const hoverLabelRef = useRef<HTMLParagraphElement>(null)
  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const interactionStateRef = useRef<GlobeInteractionState | null>(null)
  const cameraControlsRef = useRef(cameraControls)
  const [cameraStatus, setCameraStatus] = useState<CameraPipelineStatus>('idle')
  const [globeReady, setGlobeReady] = useState(false)
  const [showInteractionHint, setShowInteractionHint] = useState(!introLocked)
  const showInteractionHintRef = useRef(!introLocked)
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
  showInteractionHintRef.current = showInteractionHint
  const reduceMotion = useReducedMotion()
  const { setCameraCursor, setGlobeDragging } = useAppCursor()
  const [focusedClusterInfo, setFocusedClusterInfo] = useState<{
    label: string
    count: number
  } | null>(null)
  const [focusedImageTitle, setFocusedImageTitle] = useState<string | null>(null)
  const [isConstellationFocused, setIsConstellationFocused] = useState(false)
  const [clusterHover, setClusterHover] = useState<{
    label: string
    count: number
    x: number
    y: number
  } | null>(null)

  useEffect(() => {
    const immersive =
      globeArrangement === 'clusters' && isConstellationFocused
    setClusterFocusImmersive(immersive)
    return () => setClusterFocusImmersive(false)
  }, [globeArrangement, isConstellationFocused, setClusterFocusImmersive])

  const mousePosRef = useRef({ x: 0, y: 0 })
  const clusterHoverTargetsRef = useRef<ClusterHoverTarget[]>([])
  const clusterHoverWorldPosRef = useRef(new THREE.Vector3())
  const openModalRef = useRef(openModal)
  const openModalScopedRef = useRef(openModalScoped)
  const animationRef = useRef(globeAnimation)
  const displaySettingsRef = useRef(globeDisplay)
  const linkClusterRef = useRef(linkCluster)
  const objectsRef = useRef<CSS3DObject[]>([])
  const objectByIdRef = useRef<Map<string, CSS3DObject>>(new Map())
  const clustersRef = useRef<ImageCluster | null>(null)
  const layoutClustersRef = useRef<ImageCluster[]>([])
  const layoutFieldRadiusRef = useRef(GLOBE_RADIUS)
  const layoutClusterGlobesRef = useRef<ClusterGlobe[]>([])
  const itemClusterIdRef = useRef<Map<string, string>>(new Map())
  const clusterFocusRef = useRef<string | null>(null)
  const linkClusterFocusRef = useRef(false)
  const preFocusCameraZRef = useRef<number | null>(null)
  const preFocusRotationRef = useRef<{
    x: number
    y: number
    z: number
  } | null>(null)
  const focusBlendRef = useRef(0)
  const focusCameraTargetRef = useRef(CLUSTER_FOCUS_CAMERA_Z)
  const clusterFocusedAtRef = useRef(0)
  const focusZoomArmedRef = useRef(false)
  const clusterGroupsRef = useRef<Map<string, THREE.Group>>(new Map())
  const clusterFocusPlaqueRef = useRef<CSS3DObject | null>(null)
  const clusterFocusPlaqueClusterIdRef = useRef<string | null>(null)
  const clusterIntroActiveRef = useRef(false)
  const heroClusterIdRef = useRef<string | null>(null)
  const heroClusterStartZRef = useRef<number | null>(null)
  const fraudAxisLabelsRef = useRef<CSS3DObject[]>([])
  const constellationRef = useRef(constellation)
  const closeModalRef = useRef(closeModal)
  const selectedItemRef = useRef(selectedItem)
  const handleImageActivateRef = useRef<(item: GalleryItem) => void>(() => {})
  const handleBackgroundPointerDownRef = useRef<
    (clientX: number, clientY: number) => void
  >(() => {})
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
  const categoryViewRef = useRef(categoryView)
  const filterZoomTargetRef = useRef<number | null>(null)
  const preFilterCameraZRef = useRef<number | null>(null)
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
    const savedRotation = preFocusRotationRef.current
    if (!state || savedZ == null) return

    state.targetCameraDistance = savedZ
    state.cameraDistance = savedZ
    if (camera) camera.position.z = savedZ
    if (savedRotation) {
      state.rotationX = savedRotation.x
      state.rotationY = savedRotation.y
      state.rotationZ = savedRotation.z
    }
    preFocusCameraZRef.current = null
    preFocusRotationRef.current = null
  }

  const savePreFocusCameraZ = () => {
    const state = interactionStateRef.current
    if (state) {
      preFocusCameraZRef.current = state.cameraDistance
      preFocusRotationRef.current = {
        x: state.rotationX,
        y: state.rotationY,
        z: state.rotationZ,
      }
    }
  }

  const removeClusterFocusPlaque = () => {
    const plaque = clusterFocusPlaqueRef.current
    if (!plaque) return
    ;(plaque.userData.cancelPlaqueTypewriter as (() => void) | undefined)?.()
    plaque.userData.cancelPlaqueTypewriter = undefined
    globeGroupRef.current?.remove(plaque)
    plaque.element.remove()
    clusterFocusPlaqueRef.current = null
    clusterFocusPlaqueClusterIdRef.current = null
  }

  const attachClusterFocusPlaque = (
    clusterId: string,
    label: string,
    count: number,
  ) => {
    removeClusterFocusPlaque()
    const globe = globeGroupRef.current
    if (!globe) return
    const plaque = createClusterFocusPlaque(label, count)
    plaque.position.set(0, 0, 0)
    globe.add(plaque)
    clusterFocusPlaqueRef.current = plaque
    clusterFocusPlaqueClusterIdRef.current = clusterId
    playClusterFocusPlaqueEntrance(plaque, {
      blur: categoryViewRef.current.clusterFocusPlaqueAnimate && !reduceMotion,
      typewriter: !reduceMotion,
    })
  }

  const applyOrbitFocusPositions = (
    clusterGlobe: ClusterGlobe,
    spacing: number,
  ) => {
    const displayedIds = [...clusterGlobe.itemIds]
      .filter((itemId) => objectByIdRef.current.has(itemId))
      .sort()
    const positions = orbitSphereFocusPositions(displayedIds.length, spacing)
    displayedIds.forEach((itemId, index) => {
      const obj = objectByIdRef.current.get(itemId)
      const position = positions[index]
      if (!obj || !position) return
      obj.userData.focusLocal = position.clone()
      obj.position.copy(position)
    })
  }

  const restoreClusterOverviewState = () => {
    focusBlendRef.current = 0
    removeClusterFocusPlaque()

    const heroId = heroClusterIdRef.current
    const introLayoutActive =
      clusterIntroActiveRef.current && Boolean(heroId)

    clusterGroupsRef.current.forEach((group, clusterId) => {
      const fieldCenter = group.userData.fieldCenter as THREE.Vector3
      if (introLayoutActive && clusterId === heroId) {
        group.position.set(0, 0, 0)
      } else {
        group.position.copy(fieldCenter)
      }
      group.rotation.set(0, 0, 0)
      group.scale.setScalar(1)
    })

    for (let i = 0; i < objectsRef.current.length; i++) {
      const obj = objectsRef.current[i]
      const el = obj.userData.element as HTMLElement
      const fieldLocal = obj.userData.fieldLocal as THREE.Vector3 | undefined
      const sphereLocal = obj.userData.sphereLocal as THREE.Vector3 | undefined
      const introSphereLocal = obj.userData.introSphereLocal as
        | THREE.Vector3
        | undefined
      const objClusterId = obj.userData.clusterId as string | undefined
      if (
        introLayoutActive &&
        heroId &&
        objClusterId === heroId &&
        introSphereLocal
      ) {
        obj.position.copy(introSphereLocal)
      } else if (fieldLocal) {
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
    setFocusedClusterInfo(null)
    restoreClusterOverviewState()
    if (restoreZoom) restorePreFocusCameraZ()
  }

  const exitConstellationFocus = (restoreZoom = true) => {
    if (!clusterFocusRef.current) return
    clusterFocusRef.current = null
    clusterFocusedAtRef.current = 0
    focusZoomArmedRef.current = false
    setIsConstellationFocused(false)
    setFocusedClusterInfo(null)
    setFocusedImageTitle(null)
    setClusterHover(null)
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
    setFocusedClusterInfo({
      label:
        anchor?.subcategory?.replace(/_/g, ' ') ??
        anchor?.category.replace(/_/g, ' ') ??
        'Cluster',
      count: items.length,
    })

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

  const centerClusterObjects = (clusterObjects: CSS3DObject[]) => {
    if (clusterObjects.length === 0) return

    const centroid = new THREE.Vector3()
    clusterObjects.forEach((obj) => centroid.add(obj.position))
    centroid.divideScalar(clusterObjects.length)

    clusterObjects.forEach((obj) => {
      obj.position.sub(centroid)
      const focusLocal = obj.userData.focusLocal as THREE.Vector3 | undefined
      if (focusLocal) {
        focusLocal.sub(centroid)
      }
    })
  }

  const resetGlobeRotationForFocus = () => {
    const state = interactionStateRef.current
    if (!state) return
    state.rotationX = 0
    state.rotationY = 0
    state.rotationZ = 0
    state.velocityX = 0
    state.velocityY = 0
  }

  const applyClusterViewportFit = (clusterObjects: CSS3DObject[]) => {
    if (clusterObjects.length === 0) return

    const camera = cameraRef.current
    const scene = sceneRef.current
    const cssRenderer = cssRendererRef.current
    const state = interactionStateRef.current
    const container = containerRef.current
    if (!camera || !scene || !cssRenderer || !state) return

    const hideUnfocused =
      categoryViewRef.current.clusterFocusPresentation &&
      Boolean(clusterFocusRef.current)

    resetGlobeRotationForFocus()
    globeGroupRef.current?.rotation.set(0, 0, 0)
    centerClusterObjects(clusterObjects)

    for (let i = 0; i < objectsRef.current.length; i++) {
      const obj = objectsRef.current[i]
      const el = obj.userData.element as HTMLElement
      const inCluster = clusterObjects.includes(obj)
      if (inCluster) {
        el.style.visibility = 'visible'
        el.style.pointerEvents = 'auto'
        el.style.opacity = '1'
        billboardTowardCamera(obj, camera)
      } else if (hideUnfocused) {
        el.style.visibility = 'hidden'
        el.style.pointerEvents = 'none'
        el.style.opacity = '0'
      } else {
        el.style.visibility = 'visible'
        el.style.pointerEvents = 'none'
        el.style.opacity = '0.08'
      }
    }
    globeGroupRef.current?.updateMatrixWorld(true)

    const targetZ = fitClusterViewportFill(
      clusterObjects,
      camera,
      scene,
      cssRenderer,
      displaySettingsRef.current,
      0.85,
      container,
    )

    state.targetCameraDistance = targetZ
    focusCameraTargetRef.current = targetZ
    if (!categoryViewRef.current.clusterFocusSmoothZoom) {
      state.cameraDistance = targetZ
      camera.position.z = targetZ
    }
  }

  const focusConstellationCluster = (clusterId: string) => {
    const clusterGlobe = layoutClusterGlobesRef.current.find((g) => g.id === clusterId)
    if (!clusterGlobe) return
    savePreFocusZoom()
    clusterFocusRef.current = clusterId
    clusterFocusedAtRef.current = performance.now()
    focusBlendRef.current = 1
    focusZoomArmedRef.current = false
    setIsConstellationFocused(true)
    setFocusedClusterInfo({
      label: toSentenceCase(clusterGlobe.label),
      count: clusterGlobe.itemIds.size,
    })
    setClusterHover(null)

    const group = clusterGroupsRef.current.get(clusterId)
    if (group) {
      group.position.set(0, 0, 0)
      group.rotation.set(0, 0, 0)
      group.scale.setScalar(CLUSTER_FOCUS_SCALE)
    }

    globeGroupRef.current?.rotation.set(0, 0, 0)
    globeGroupRef.current?.position.set(0, 0, 0)

    const presentation = categoryViewRef.current.clusterFocusPresentation

    clusterGlobe.itemIds.forEach((itemId) => {
      const obj = objectByIdRef.current.get(itemId)
      const fieldLocal = clusterGlobe.fieldPositions.get(itemId)
      if (!obj || !fieldLocal) return

      obj.userData.introIsRingMember = false
      obj.userData.introIsCenterMember = false
      delete obj.userData.introLoadStartedAt

      const focusFromLayout =
        clusterGlobe.focusPositions.get(itemId)?.clone() ?? fieldLocal.clone()
      obj.userData.focusLocal = focusFromLayout
      obj.position.copy(focusFromLayout)
    })

    if (presentation && categoryViewRef.current.clusterFocusOrbitSphere) {
      applyOrbitFocusPositions(
        clusterGlobe,
        categoryViewRef.current.clusterSpacing,
      )
    }

    const clusterObjects: CSS3DObject[] = []
    clusterGlobe.itemIds.forEach((itemId) => {
      const obj = objectByIdRef.current.get(itemId)
      const focusLocal = obj?.userData.focusLocal as THREE.Vector3 | undefined
      if (obj && focusLocal) {
        clusterObjects.push(obj)
      }
    })

    resetGlobeRotationForFocus()
    applyClusterViewportFit(clusterObjects)

    if (presentation) {
      attachClusterFocusPlaque(
        clusterId,
        clusterGlobe.label,
        clusterGlobe.itemIds.size,
      )
    }
  }

  const displayItems = useMemo(
    () => {
      const max = Math.min(globeItemCount, MAX_GLOBE_ITEM_COUNT)
      if (categoryView.clusterIntroTest && globeArrangement === 'clusters') {
        return sampleClusterIntroDisplayItems(filteredItems, max)
      }
      return sampleEvenly(filteredItems, max)
    },
    [filteredItems, globeItemCount, categoryView.clusterIntroTest, globeArrangement],
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
  categoryViewRef.current = categoryView
  highlightedFilterRef.current = highlightedFilter

  const restoreFilterCamera = () => {
    const state = interactionStateRef.current
    if (!state || filterZoomTargetRef.current == null) return

    const restoreZ = preFilterCameraZRef.current ?? overviewCameraZRef.current
    state.targetCameraDistance = restoreZ
    filterZoomTargetRef.current = null
    preFilterCameraZRef.current = null
  }

  const applyFilterSelectionCameraTarget = () => {
    const complexity = activeComplexityRef.current
    const filter = highlightedFilterRef.current
    const hasSelection = Boolean(complexity || filter)

    if (!hasSelection) {
      restoreFilterCamera()
      return
    }

    const state = interactionStateRef.current
    if (!state) return

    if (preFilterCameraZRef.current == null) {
      preFilterCameraZRef.current = state.cameraDistance
    }
    const screenFraction = GLOBE_OVERVIEW_SCREEN_FRACTION
    const targetZ = computeGlobeOverviewCameraZ(
      layoutFieldRadiusRef.current,
      GLOBE_CAMERA_FOV,
      screenFraction,
    )
    state.targetCameraDistance = targetZ
    filterZoomTargetRef.current = targetZ
  }

  useEffect(() => {
    if (!activeComplexity && !highlightedFilter) {
      restoreFilterCamera()
      for (const obj of objectsRef.current) {
        const sphereLocal = obj.userData.sphereLocal as THREE.Vector3 | undefined
        if (sphereLocal) obj.position.copy(sphereLocal)
      }
    } else {
      applyFilterSelectionCameraTarget()
    }
  }, [activeComplexity, highlightedFilter])

  useEffect(() => {
    if (introLocked) {
      setShowInteractionHint(false)
      setClusterHover(null)
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
      preferBackHemisphere: false,
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
    applyFilterSelectionCameraTarget()
  }, [
    activeComplexity,
    highlightedFilter,
    displayItems,
    globeArrangement,
  ])

  const setHoverLabel = (item: GalleryItem | null) => {
    if (globeArrangementRef.current === 'clusters') {
      const focusId = clusterFocusRef.current
      if (
        focusId &&
        categoryViewRef.current.clusterFocusPresentation &&
        item &&
        itemClusterIdRef.current.get(item.id) === focusId
      ) {
        setFocusedImageTitle(galleryItemTitle(item))
        return
      }

      setFocusedImageTitle(null)
      const el = hoverLabelRef.current
      if (el) {
        el.textContent = ''
        el.style.display = 'none'
      }
      return
    }

    setFocusedImageTitle(null)
    setClusterHover(null)
    const el = hoverLabelRef.current
    if (!el) return
    if (!item) {
      el.textContent = ''
      el.style.display = 'none'
      return
    }
    el.textContent = galleryItemTitle(item)
    el.style.display = 'block'
  }

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      mousePosRef.current = { x: event.clientX, y: event.clientY }

      if (introLockedRef.current || !showInteractionHintRef.current) {
        setClusterHover(null)
        return
      }

      if (
        globeArrangementRef.current !== 'clusters' ||
        clusterFocusRef.current
      ) {
        setClusterHover((prev) =>
          prev ? { ...prev, x: event.clientX, y: event.clientY } : null,
        )
        return
      }

      const camera = cameraRef.current
      const globe = globeGroupRef.current
      const container = containerRef.current
      const targets = clusterHoverTargetsRef.current
      if (!camera || !globe || !container || targets.length === 0) {
        setClusterHover(null)
        return
      }

      globe.updateMatrixWorld(true)
      const { clientWidth, clientHeight } = container
      const hit = findClusterAtScreenPoint(
        targets,
        (cluster) => {
          const group = clusterGroupsRef.current.get(cluster.id)
          if (group) {
            return clusterHoverWorldPosRef.current.setFromMatrixPosition(
              group.matrixWorld,
            )
          }
          const globeMatch = layoutClusterGlobesRef.current.find(
            (entry) => entry.id === cluster.id,
          )
          return clusterHoverWorldPosRef.current.copy(
            globeMatch?.center ?? new THREE.Vector3(),
          )
        },
        event.clientX,
        event.clientY,
        camera,
        clientWidth,
        clientHeight,
      )

      if (hit) {
        setClusterHover({
          label: hit.label,
          count: hit.count,
          x: event.clientX,
          y: event.clientY,
        })
      } else {
        setClusterHover(null)
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

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

  const pickClusterAtScreen = (clientX: number, clientY: number): string | null => {
    if (introLockedRef.current || !showInteractionHintRef.current) {
      return null
    }

    if (globeArrangementRef.current !== 'clusters' || clusterFocusRef.current) {
      return null
    }

    const camera = cameraRef.current
    const globe = globeGroupRef.current
    const container = containerRef.current
    const targets = clusterHoverTargetsRef.current
    if (!camera || !globe || !container || targets.length === 0) return null

    globe.updateMatrixWorld(true)
    const { clientWidth, clientHeight } = container
    const hit = findClusterAtScreenPoint(
      targets,
      (cluster) => {
        const group = clusterGroupsRef.current.get(cluster.id)
        if (group) {
          return clusterHoverWorldPosRef.current.setFromMatrixPosition(
            group.matrixWorld,
          )
        }
        const globeMatch = layoutClusterGlobesRef.current.find(
          (entry) => entry.id === cluster.id,
        )
        return clusterHoverWorldPosRef.current.copy(
          globeMatch?.center ?? new THREE.Vector3(),
        )
      },
      clientX,
      clientY,
      camera,
      clientWidth,
      clientHeight,
    )

    return hit?.id ?? null
  }

  const handleBackgroundPointerDown = (clientX: number, clientY: number) => {
    const clusterId = pickClusterAtScreen(clientX, clientY)
    if (clusterId) {
      focusConstellationCluster(clusterId)
      return
    }
    cancelClusterSelection()
  }

  const handleImageActivate = (item: GalleryItem) => {
    if (introLockedRef.current || !showInteractionHintRef.current) return

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
  handleBackgroundPointerDownRef.current = handleBackgroundPointerDown

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
    removeClusterFocusPlaque()
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
    setFocusedClusterInfo(null)

    const isClusters = globeArrangement === 'clusters'
    const layout = isClusters
      ? computeClusterLayout(
          displayItems,
          constellationSettingsForCategoryView(
            categoryViewRef.current,
            constellationRef.current,
          ),
          categoryViewRef.current,
        )
      : null

    let clusterIntroHeroId: string | null = null
    if (
      layout &&
      isClusters &&
      categoryViewRef.current.clusterIntroTest
    ) {
      const introHero = pickHeroClusterGlobe(layout.clusterGlobes)
      if (introHero) {
        anchorHeroClusterAtOrigin(layout, introHero.id)
        centerSurroundingClustersAtOrigin(layout, introHero.id)
        centerHeroClusterFieldPositions(layout, introHero.id)
        clusterIntroHeroId = introHero.id
        displayItems.forEach((item, i) => {
          const clusterId = layout.itemClusterId.get(item.id)
          const clusterGlobe = clusterId
            ? layout.clusterGlobes.find((globe) => globe.id === clusterId)
            : null
          const fieldLocal = clusterGlobe?.fieldPositions.get(item.id)
          if (clusterGlobe && fieldLocal) {
            layout.positions[i] = clusterGlobe.center.clone().add(fieldLocal)
          }
        })
      }
    }

    layoutClustersRef.current = layout?.clusters ?? []
    layoutFieldRadiusRef.current = layout?.fieldRadius ?? GLOBE_RADIUS
    layoutClusterGlobesRef.current = layout?.clusterGlobes ?? []
    itemClusterIdRef.current = layout?.itemClusterId ?? new Map()
    clusterHoverTargetsRef.current =
      layout?.clusterGlobes.map((globe) => ({
        id: globe.id,
        label: globe.label,
        count: globe.itemIds.size,
        radius: globe.radius,
      })) ?? []

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
    const positions = isClusters && layout
      ? layout.positions
      : getGlobePositions(
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
        const clusterItemsForOrb = displayItems.filter((item) =>
          clusterGlobe.itemIds.has(item.id),
        )
        if (categoryViewRef.current.showSeverityOrb) {
          const orb = createSeverityOrb(
            dominantClusterComplexity(clusterItemsForOrb),
            categoryViewRef.current.severityOrbAnimation,
          )
          orb.userData.orbPhase =
            clusterGlobe.center.x * 0.0031 + clusterGlobe.center.z * 0.0019
          group.add(orb)
        }
        globe.add(group)
        clusterGroups.set(clusterGlobe.id, group)
      })
    }
    clusterGroupsRef.current = clusterGroups

    fraudAxisLabelsRef.current.forEach((label) => {
      globe.remove(label)
      label.element.remove()
    })
    fraudAxisLabelsRef.current = []
    if (
      isClusters &&
      layout &&
      categoryViewRef.current.fraudAxisEnabled &&
      categoryViewRef.current.fraudAxisLabelStyle !== 'none'
    ) {
      const labelStyle = categoryViewRef.current.fraudAxisLabelStyle
      const axisExtent = layout.fieldRadius * 0.92
      const digitalText = fraudAxisLabelText('digital', labelStyle)
      const physicalText = fraudAxisLabelText('physical', labelStyle)
      if (digitalText) {
        const top = createFraudAxisLabel(digitalText)
        top.position.set(0, axisExtent, 0)
        globe.add(top)
        fraudAxisLabelsRef.current.push(top)
      }
      if (physicalText) {
        const bottom = createFraudAxisLabel(physicalText)
        bottom.position.set(0, -axisExtent, 0)
        globe.add(bottom)
        fraudAxisLabelsRef.current.push(bottom)
      }
    }

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
    const clusterIntroSetup =
      Boolean(clusterIntroHeroId) && introLockedNow && isClusters && layout

    displayItems.forEach((item, i) => {
      const loadRank = loadRankByIndex.get(i) ?? i
      const isRingMember = clusterIntroSetup
        ? false
        : introIsRingMember(loadRank, loadTotal)
      const isCenterMember = clusterIntroSetup
        ? false
        : !isRingMember
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
      object.userData.introGlobalLoadRank = loadRank
      object.userData.introLoadTotal = loadTotal
      object.userData.introRingCount = ringCount
      object.userData.introCenterFillRank = centerFillRank
      object.userData.introCenterFillCount = centerFillCount
      if (clusterIntroSetup) {
        const clusterId = layout!.itemClusterId.get(item.id)
        object.userData.introIsDeferredCluster = clusterId !== clusterIntroHeroId
      }
      const sphereZ =
        isClusters && layout
          ? (object.userData.fieldLocal as THREE.Vector3 | undefined)?.z ??
            positions[i].z
          : positions[i].z
      object.userData.introHemisphereFront = sphereZ >= 0

      if (isClusters && layout) {
        const clusterId = layout.itemClusterId.get(item.id)
        const clusterGlobeIndex = layout.clusterGlobes.findIndex(
          (globe) => globe.id === clusterId,
        )
        const group = clusterId ? clusterGroups.get(clusterId) : null
        const clusterGlobe = clusterId
          ? layout.clusterGlobes.find((g) => g.id === clusterId)
          : null
        const fieldLocal = clusterGlobe?.fieldPositions.get(item.id)
        if (group && clusterGlobe && fieldLocal) {
          placeOnSphere(object, fieldLocal.clone())
          object.userData.clusterId = clusterId
          object.userData.hubIndex =
            clusterGlobeIndex >= 0 ? clusterGlobeIndex : 0
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

      const storedLocal =
        (object.userData.fieldLocal as THREE.Vector3 | undefined) ??
        (object.userData.sphereLocal as THREE.Vector3 | undefined)
      if (storedLocal) {
        object.userData.baseLocal = storedLocal.clone()
      }

      objects.push(object)
      objectById.set(item.id, object)
    })
    objectsRef.current = objects
    objectByIdRef.current = objectById

    const clusterIntroActive =
      isClusters &&
      Boolean(layout) &&
      categoryViewRef.current.clusterIntroTest
    clusterIntroActiveRef.current = clusterIntroActive
    heroClusterIdRef.current = null
    heroClusterStartZRef.current = null

    if (clusterIntroActive && layout) {
      const heroGlobe = pickHeroClusterGlobe(layout.clusterGlobes)
      if (heroGlobe) {
        heroClusterIdRef.current = heroGlobe.id
        if (introLockedRef.current) {
          applyHeroClusterIntroSphereLayout(
            objects,
            heroGlobe.id,
            categoryViewRef.current.clusterSpacing,
            heroGlobe.radius,
          )
          configureClusterIntroParticipation(objects, heroGlobe.id)
          clusterGroups.forEach((group, clusterId) => {
            const fieldCenter = group.userData.fieldCenter as THREE.Vector3
            if (clusterId === heroGlobe.id) {
              group.position.set(0, 0, 0)
            } else {
              group.position.copy(fieldCenter)
            }
          })
          for (const obj of objects) {
            const el = obj.userData.element as HTMLElement | undefined
            if (el) el.style.opacity = '0'
          }
          heroClusterStartZRef.current = clusterIntroHeroStartCameraZ(
            categoryViewRef.current.clusterSpacing,
          )
        } else {
          clusterGroups.forEach((group, clusterId) => {
            const fieldCenter = group.userData.fieldCenter as THREE.Vector3
            if (clusterId === heroGlobe.id) {
              group.position.set(0, 0, 0)
            } else {
              group.position.copy(fieldCenter)
            }
          })
        }
      } else {
        clusterIntroActiveRef.current = false
      }
    }

    const ringMembers = objects.filter((obj) => obj.userData.introIsRingMember)
    const ringFrontMembers = ringMembers.filter(
      (obj) => obj.userData.introHemisphereFront,
    )
    const ringBackMembers = ringMembers.filter(
      (obj) => !obj.userData.introHemisphereFront,
    )
    const assignRingSeq = clusterIntroActive
      ? assignRingLoadSeqAzimuth
      : assignRingLoadSeqShuffled
    if (clusterIntroActive) {
      assignRingLoadSeqAzimuth(
        ringMembers.map((obj) => ({
          pos:
            (obj.userData.introSphereLocal as THREE.Vector3 | undefined) ??
            (obj.userData.fieldLocal as THREE.Vector3) ??
            (obj.userData.sphereLocal as THREE.Vector3) ??
            new THREE.Vector3(),
          setSeq: (seq) => {
            obj.userData.introRingRevealIndex = seq
            obj.userData.introRingLoadSeq = seq
          },
        })),
      )
    } else {
      assignRingSeq(
        ringFrontMembers.map((obj) => ({
          pos:
            (obj.userData.introSphereLocal as THREE.Vector3 | undefined) ??
            (obj.userData.fieldLocal as THREE.Vector3) ??
            (obj.userData.sphereLocal as THREE.Vector3) ??
            new THREE.Vector3(),
          setSeq: (seq) => {
            obj.userData.introRingLoadSeq = seq
          },
        })),
      )
      assignRingSeq(
        ringBackMembers.map((obj) => ({
          pos:
            (obj.userData.introSphereLocal as THREE.Vector3 | undefined) ??
            (obj.userData.fieldLocal as THREE.Vector3) ??
            (obj.userData.sphereLocal as THREE.Vector3) ??
            new THREE.Vector3(),
          setSeq: (seq) => {
            obj.userData.introRingLoadSeq = seq
          },
        })),
      )
    }
    const sortRingBySeq = (a: CSS3DObject, b: CSS3DObject) =>
      ((a.userData.introRingRevealIndex as number) ??
        (a.userData.introRingLoadSeq as number) ??
        0) -
      ((b.userData.introRingRevealIndex as number) ??
        (b.userData.introRingLoadSeq as number) ??
        0)
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
    applyFilterSelectionCameraTarget()

    const overviewBoundingRadius =
      isClusters && layout
        ? categoryViewRef.current.clusterIntroTest
          ? clusterIntroFieldBoundingRadius(layout)
          : layoutBoundingRadius(layout.positions, layout.fieldRadius)
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
        clusterIntroActiveRef.current && heroClusterStartZRef.current != null
          ? clusterIntroCameraZ(
              introProgressRef.current,
              heroClusterStartZRef.current,
              overviewCameraZ,
            )
          : overviewCameraZ *
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
        onBackgroundPointerDown: (clientX, clientY) =>
          handleBackgroundPointerDownRef.current(clientX, clientY),
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
    const clusterIntroBlendPos = new THREE.Vector3()

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
        let introImageTotal =
          ringFrontQueue.length +
          ringBackQueue.length +
          centerFrontQueue.length +
          centerBackQueue.length
        let introImagesLoaded = 0
        for (const obj of sceneObjects) {
          const img = obj.userData.img as HTMLImageElement | undefined
          if (img?.src) introImagesLoaded += 1
        }
        if (
          clusterIntroActiveRef.current &&
          heroClusterIdRef.current &&
          !clusterIntroRevealActive(introProgress)
        ) {
          introImageTotal =
            ringFrontQueue.length +
            ringBackQueue.length +
            centerFrontQueue.length +
            centerBackQueue.length
          introImagesLoaded = 0
          const introParticipantIds = new Set([
            ...ringFrontQueue,
            ...ringBackQueue,
            ...centerFrontQueue,
            ...centerBackQueue,
          ])
          for (const obj of sceneObjects) {
            if (!introParticipantIds.has(obj)) continue
            const img = obj.userData.img as HTMLImageElement | undefined
            if (img?.src) introImagesLoaded += 1
          }
        } else if (
          clusterIntroActiveRef.current &&
          heroClusterIdRef.current &&
          clusterIntroRevealActive(introProgress)
        ) {
          introImageTotal = sceneObjects.length
          introImagesLoaded = 0
          for (const obj of sceneObjects) {
            const img = obj.userData.img as HTMLImageElement | undefined
            if (img?.src) introImagesLoaded += 1
          }
        }
        const loadBehind = introLoadBehindSchedule(
          introProgress,
          introImagesLoaded,
          introImageTotal,
        )
        introGlobeReadyRef.current = clusterIntroActiveRef.current
          ? (introProgress >= 1 ||
              clusterIntroZoomProgress(introProgress) >= 0.995) &&
            introImagesLoaded >= introImageTotal
          : introGlobeSequenceComplete(
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
          introProgress >=
            (clusterIntroActiveRef.current
              ? CLUSTER_INTRO_RING_START
              : GLOBE_INTRO_RING_START)
        ) {
          const ringCaps = clusterIntroActiveRef.current
            ? clusterIntroRingHemisphereLoadCaps(
                introProgress,
                ringFrontQueue.length,
                ringBackQueue.length,
              )
            : introRingHemisphereLoadCaps(
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
            clusterIntroActiveRef.current
              ? GLOBE_INTRO_RING_PAIR_INTERVAL_MS * 0.28
              : GLOBE_INTRO_RING_PAIR_INTERVAL_MS,
            true,
            ringCaps.frontCap,
            ringCaps.backCap,
            loadBehind,
            clusterIntroActiveRef.current ? (loadBehind ? 20 : 10) : loadBehind ? 7 : 2,
          )
        }

        const centerPrefetchOn = clusterIntroActiveRef.current
          ? clusterIntroRevealActive(introProgress)
          : introCenterPrefetchActive(introProgress)

        if (centerPrefetchOn) {
          if (
            clusterIntroActiveRef.current &&
            clusterIntroDeferredLoadActive(introProgress)
          ) {
            for (const obj of sceneObjects) {
              if (!obj.userData.introIsDeferredCluster) continue
              const flushDeferredLoad = obj.userData.flushDeferredLoad as
                | (() => void)
                | undefined
              if (!flushDeferredLoad || obj.userData.introDeferredLoadQueued) {
                continue
              }
              obj.userData.introDeferredLoadQueued = true
              flushDeferredLoad()
            }
          }

          const centerCaps = clusterIntroActiveRef.current
            ? clusterIntroEarlyCenterLoadCaps(
                introProgress,
                centerFrontQueue.length,
                centerBackQueue.length,
              )
            : introCenterHemisphereLoadCaps(
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
      const clusterIntroNow = clusterIntroActiveRef.current
      const introMotionP = introLockedRef.current
        ? clusterIntroNow
          ? clusterIntroMotionEase(introProgress)
          : globeIntroMotionEase(introProgress)
        : 1
      const introDepthFadeP =
        introLockedRef.current || introExitBlend > 0.01
          ? globeIntroDepthFadeProgress(
              introLockedRef.current ? introProgress : 1,
            )
          : 1
      let introRotationHandoff = introLockedRef.current
        ? clusterIntroNow
          ? clusterIntroRotationHandoff(introProgress)
          : globeIntroRotationHandoff(introProgress)
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
          (activeComplexityRef.current || categoryFilterActive) &&
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
            introLockedRef.current &&
            (clusterIntroNow
              ? clusterIntroRevealActive(introProgress)
              : introRevealActive(introProgress))
          const clusterIntroTextSpin =
            clusterIntroNow &&
            introLockedRef.current &&
            clusterIntroTextPhaseActive(introProgress)
          const ySpinScale = revealSpin
            ? introMotionP
            : clusterIntroTextSpin
              ? 0.42
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
                (clusterIntroTextSpin ? 2.8 : 1) *
                (1 - handoffEased) *
                timeScale
            }
          }

          if (clusterIntroTextSpin) {
            interactionState.rotationY +=
              preset.autoRotateY * 0.42 * timeScale
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

        if (focusId) {
          interactionState.rotationX = 0
          interactionState.rotationY = 0
          interactionState.rotationZ = 0
          interactionState.velocityX = 0
          interactionState.velocityY = 0
        }

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
          if (focusId && clusterId === focusId) {
            group.position.set(0, 0, 0)
            group.rotation.set(0, 0, 0)
            group.scale.setScalar(CLUSTER_FOCUS_SCALE)
          } else if (
            !focusId &&
            clusterIntroActiveRef.current &&
            heroClusterIdRef.current &&
            clusterId === heroClusterIdRef.current
          ) {
            group.position.set(0, 0, 0)
            group.rotation.set(0, 0, 0)
            group.scale.setScalar(1)
          } else {
            group.position.copy(fieldCenter)
            group.rotation.set(0, 0, 0)
            group.scale.setScalar(1)
          }
        })

        if (focusId) {
          const motion = categoryViewRef.current
          const clusterAnimActive =
            motion.clusterAnimation !== 'static' || motion.imageFlutter > 0
          for (let i = 0; i < objects.length; i++) {
            const obj = objects[i]
            if (obj.userData.clusterId !== focusId) continue
            const focusLocal = obj.userData.focusLocal as THREE.Vector3 | undefined
            if (!focusLocal) continue
            if (clusterAnimActive) {
              const item = obj.userData.item as GalleryItem | undefined
              const animated = animateClusterImageLocal(
                focusLocal,
                item?.id ?? String(i),
                now,
                motion.clusterAnimation,
                motion.imageFlutter,
                (obj.userData.hubIndex as number | undefined) ?? 0,
                motion.motionSpeed,
              )
              obj.position.copy(animated)
            } else {
              obj.position.copy(focusLocal)
            }
          }
        } else {
          const motion = categoryViewRef.current
          const clusterAnimActive =
            motion.clusterAnimation !== 'static' || motion.imageFlutter > 0
          const clusterIntroActiveNow =
            clusterIntroActiveRef.current &&
            heroClusterIdRef.current &&
            (introLockedRef.current || introExitBlend > 0.01)
          const heroClusterId = heroClusterIdRef.current
          const introItemBlend = introLockedRef.current
            ? clusterIntroHeroItemBlend(introProgress)
            : 1
          for (let i = 0; i < objects.length; i++) {
            const obj = objects[i]
            const item = obj.userData.item as GalleryItem | undefined
            const fieldLocal = obj.userData.fieldLocal as THREE.Vector3 | undefined
            const introSphereLocal = obj.userData.introSphereLocal as
              | THREE.Vector3
              | undefined

            if (
              clusterIntroActiveNow &&
              heroClusterId &&
              obj.userData.clusterId === heroClusterId &&
              introSphereLocal &&
              fieldLocal
            ) {
              clusterIntroBlendPos.lerpVectors(
                introSphereLocal,
                fieldLocal,
                introItemBlend,
              )
              if (clusterAnimActive && introItemBlend >= 0.99) {
                const animated = animateClusterImageLocal(
                  clusterIntroBlendPos,
                  item?.id ?? String(i),
                  now,
                  motion.clusterAnimation,
                  motion.imageFlutter,
                  (obj.userData.hubIndex as number | undefined) ?? 0,
                  motion.motionSpeed,
                )
                obj.position.copy(animated)
              } else {
                obj.position.copy(clusterIntroBlendPos)
              }
              continue
            }

            const baseLocal = obj.userData.baseLocal as THREE.Vector3 | undefined
            if (!baseLocal || !obj.userData.clusterId) continue
            if (clusterAnimActive) {
              const animated = animateClusterImageLocal(
                baseLocal,
                item?.id ?? String(i),
                now,
                motion.clusterAnimation,
                motion.imageFlutter,
                (obj.userData.hubIndex as number | undefined) ?? 0,
                motion.motionSpeed,
              )
              obj.position.copy(animated)
            } else if (fieldLocal) {
              obj.position.copy(fieldLocal)
            }
          }
        }

        const motion = categoryViewRef.current
        const focusPresentationActive =
          Boolean(focusId) && motion.clusterFocusPresentation
        const focusPlaque = clusterFocusPlaqueRef.current
        if (focusPresentationActive && focusPlaque) {
          billboardTowardCamera(focusPlaque, camera)
          focusPlaque.element.style.zIndex = String(
            focusPresentationZIndex(focusPlaque, camera),
          )
        }

        if (motion.showSeverityOrb) {
          clusterGroupsRef.current.forEach((group, clusterId) => {
            const orbVisible =
              (!focusId || focusId === clusterId) &&
              !(focusPresentationActive && focusId === clusterId)
            group.children.forEach((child) => {
              if (!child.userData.isSeverityOrb) return
              const orb = child as CSS3DObject
              orb.element.style.display = orbVisible ? '' : 'none'
              if (!orbVisible) return
              updateSeverityOrb(
                orb,
                now,
                motion.severityOrbAnimation,
                motion.motionSpeed,
              )
              billboardTowardCamera(orb, camera)
            })
          })
        }

        if (motion.fraudAxisEnabled && motion.fraudAxisLabelStyle !== 'none' && !focusId) {
          fraudAxisLabelsRef.current.forEach((label) => {
            label.element.style.display = ''
            billboardTowardCamera(label, camera)
          })
        } else {
          fraudAxisLabelsRef.current.forEach((label) => {
            label.element.style.display = 'none'
          })
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

      if (categoryViewRef.current.imageFlutter > 0 && !isClusters) {
        const motion = categoryViewRef.current
        for (let i = 0; i < objects.length; i++) {
          const obj = objects[i]
          const item = obj.userData.item as GalleryItem | undefined
          const baseLocal = obj.userData.baseLocal as THREE.Vector3 | undefined
          if (!baseLocal || obj.userData.clusterId) continue
          const offset = imageFlutterOffset(
            item?.id ?? String(i),
            time,
            motion.imageFlutter,
            motion.clusterAnimation,
          )
          obj.position.copy(baseLocal).add(offset)
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
          (activeComplexityRef.current || categoryFilterActive) &&
          !clusterFocusRef.current &&
          !linkClusterFocusRef.current,
      )

      let effectiveCameraZ = interactionState.cameraDistance

      if (
        (introLockedRef.current || introExitBlend > 0.01) &&
        !clusterFocusRef.current
      ) {
        const introOverviewZ = overviewCameraZRef.current
        const cameraT = globeIntroCameraProgress(
          introLockedRef.current ? introProgressRef.current : 1,
        )
        const targetIntroZ =
          clusterIntroActiveRef.current && heroClusterStartZRef.current != null
            ? clusterIntroCameraZ(
                introLockedRef.current ? introProgressRef.current : 1,
                heroClusterStartZRef.current,
                introOverviewZ,
              )
            : introOverviewZ *
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
      const smoothClusterFocusZoom = categoryViewRef.current.clusterFocusSmoothZoom
      const focusSnap =
        clusterFocused &&
        focusEnterAge < 1200 &&
        Math.abs(delta) > 0.5 &&
        !smoothClusterFocusZoom
      const focusPullBack = clusterFocused && delta > 0
      const filterZoomActive =
        filterZoomTargetRef.current != null &&
        (Boolean(activeComplexityRef.current) ||
          highlightedFilterRef.current !== null)
      const zoomSmooth = filterZoomActive
        ? 1 - Math.pow(COMPREHENSIVE_ZOOM_SMOOTH, timeScale)
        : clusterFocused && smoothClusterFocusZoom
          ? 1 - Math.pow(0.055, timeScale)
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
        !filterZoomActive &&
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

      const introLockedNow = introLockedRef.current
      const introVisualProgress = introLockedNow ? introProgress : 1
      const focusPresentationActive =
        Boolean(constellationFocusId) &&
        categoryViewRef.current.clusterFocusPresentation
      const introVisualActive =
        (introLockedNow || introExitBlend > 0.01) && !constellationFocusId
      const introRevealOn =
        introVisualActive &&
        (clusterIntroActiveRef.current
          ? clusterIntroRevealActive(introVisualProgress)
          : introRevealActive(introVisualProgress))
      const introFillP = introVisualActive
        ? clusterIntroActiveRef.current
          ? clusterIntroCenterFillProgress(introVisualProgress)
          : globeIntroFillProgress(introVisualProgress)
        : 0
      const introCutoutRad = introVisualActive
        ? clusterIntroActiveRef.current
          ? clusterIntroScreenCenterCutoutRad(introVisualProgress)
          : introScreenCenterCutoutRad(introVisualProgress)
        : 0
      const introInteractionBlocked = introLockedNow || introExitBlend > 0.01

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

        if (introVisualActive) {
          const isRingMember = Boolean(obj.userData.introIsRingMember)
          const isCenterMember = Boolean(obj.userData.introIsCenterMember)
          const isBackHemisphere = !obj.userData.introHemisphereFront
          const img = obj.userData.img as HTMLImageElement | undefined
          const imageLoaded = Boolean(img?.src && img.complete)
          let introOpacity = 0

          if (obj.userData.introIsDeferredCluster) {
            if (
              introRevealOn &&
              heroClusterIdRef.current &&
              obj.userData.clusterId
            ) {
              const distanceNorm = clusterIntroDistanceNorm(
                layoutClusterGlobesRef.current,
                heroClusterIdRef.current,
                obj.userData.clusterId as string,
              )
              const reveal = clusterIntroOtherReveal(
                introVisualProgress,
                distanceNorm,
              )
              if (reveal > 0.001 && img?.src) {
                let loadStartedAt = obj.userData.introLoadStartedAt as
                  | number
                  | undefined
                if (!loadStartedAt) {
                  loadStartedAt = now
                  obj.userData.introLoadStartedAt = loadStartedAt
                }
                introOpacity =
                  reveal *
                  introCenterTileOpacity(loadStartedAt, now, imageLoaded)
              }
            }
          } else if (isRingMember) {
            const loadStartedAt = obj.userData.introLoadStartedAt as
              | number
              | undefined

            if (
              clusterIntroActiveRef.current &&
              !introRevealOn &&
              heroClusterIdRef.current &&
              obj.userData.clusterId === heroClusterIdRef.current
            ) {
              const revealIndex =
                (obj.userData.introRingRevealIndex as number) ??
                (obj.userData.introRingLoadSeq as number) ??
                0
              if (
                revealIndex >=
                clusterIntroTextSyncedRingAllowedCount(introVisualProgress)
              ) {
                if (el.style.opacity !== '0') el.style.opacity = '0'
                el.style.pointerEvents = 'none'
                continue
              }
            }

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
            (clusterIntroActiveRef.current ||
              introCenterPrefetchActive(introVisualProgress))
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
          el.style.pointerEvents =
            introInteractionBlocked || introOpacity <= 0.05 ? 'none' : 'auto'
          continue
        }

        billboardTowardCamera(obj, camera)

        if (el.dataset.hovered === 'true') {
          if (el.style.opacity !== '1') el.style.opacity = '1'
          continue
        }

        const inFocusedCluster =
          Boolean(constellationFocusId && focusedGlobeIds?.has(item.id)) ||
          Boolean(linkClusterFocused && linkedIds?.has(item.id))

        if (
          (cameraMoving || interactionState.dragActive) &&
          introExitBlend < 0.01 &&
          !inFocusedCluster
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
          opacity = inFocus
            ? 1
            : focusPresentationActive
              ? 0
              : categoryViewRef.current.unfocusedClusterOpacity
          if (!inFocus && focusPresentationActive) {
            if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden'
          } else if (el.style.visibility !== 'visible') {
            el.style.visibility = 'visible'
          }
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

        if (el.style.zIndex !== zIndex) el.style.zIndex = zIndex

        if (inFocusedCluster) {
          const focusPresentation =
            categoryViewRef.current.clusterFocusPresentation
          const focusOrbit = categoryViewRef.current.clusterFocusOrbitSphere
          if (focusPresentation) {
            if (focusOrbit) {
              worldPos.setFromMatrixPosition(obj.matrixWorld)
              opacity = focusOrbitDepthOpacity(worldPos, camera)
            } else {
              opacity = 1
            }
            zIndex = String(focusPresentationZIndex(obj, camera))
            if (el.style.zIndex !== zIndex) el.style.zIndex = zIndex
          } else {
            opacity = 1
          }
        } else if (depthFade > 0) {
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
        const fittedZ = isClusters && constellationFocusId
          ? fitClusterViewportFill(
              activeFocusObjects,
              camera,
              scene,
              cssRenderer,
              displaySettingsRef.current,
              0.85,
              container,
            )
          : pullClusterIntoViewport(
              activeFocusObjects,
              camera,
              scene,
              cssRenderer,
              undefined,
              container,
            )
        if (Math.abs(fittedZ - interactionState.cameraDistance) > 1) {
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
      layoutClusterGlobesRef.current = []
      itemClusterIdRef.current.clear()
      clusterGroupsRef.current.clear()
      clusterIntroActiveRef.current = false
      heroClusterIdRef.current = null
      heroClusterStartZRef.current = null
      fraudAxisLabelsRef.current.forEach((label) => {
        globe.remove(label)
        label.element.remove()
      })
      fraudAxisLabelsRef.current = []
      clusterHoverTargetsRef.current = []
      removeClusterFocusPlaque()
      clusterFocusRef.current = null
      linkClusterFocusRef.current = false
      preFocusCameraZRef.current = null
      preFocusRotationRef.current = null
      focusZoomArmedRef.current = false
      setFocusedClusterInfo(null)
      setIsConstellationFocused(false)
      setClusterHover(null)
      setGlobeDraggingRef.current(false)
      setHoverLabel(null)
      complexityBlendRef.current = 0
      categoryBlendRef.current = 0
      complexityFocusAnimRef.current = null
    }
  }, [
    displayItems,
    globeArrangement,
    categoryView.clusterSpacing,
    categoryView.clusterShape,
    categoryView.clusterFieldLayout,
    categoryView.unfocusedClusterOpacity,
    categoryView.showSeverityOrb,
    categoryView.severityOrbAnimation,
    categoryView.fraudAxisEnabled,
    categoryView.fraudAxisSpread,
    categoryView.fraudAxisLabelStyle,
    categoryView.groupSpread,
    categoryView.clusterAnimation,
    categoryView.imageFlutter,
    categoryView.motionSpeed,
    categoryView.clusterIntroTest,
    constellation.clusterSpread,
    constellation.elementSeparation,
    constellation.elementLayout,
  ])

  if (filteredItems.length === 0) {
    return (
      <div className="globe-view globe-view--empty flex h-full items-center justify-center text-neutral-400">
        No images match the current filters.
      </div>
    )
  }

  const clusterFocusHintActive =
    globeArrangement === 'clusters' &&
    isConstellationFocused &&
    categoryView.clusterFocusPresentation
  const showBottomHint =
    entranceReady &&
    (clusterFocusHintActive ||
      (showInteractionHint &&
        !(globeArrangement === 'clusters' && isConstellationFocused)))

  return (
    <div className="globe-view relative h-full w-full overflow-hidden">
      {focusedClusterInfo && globeArrangement !== 'clusters' && (
        <div className="pointer-events-none absolute top-20 left-1/2 z-10 -translate-x-1/2 text-center">
          <p className="text-sm font-medium text-neutral-700 capitalize">
            {focusedClusterInfo.label}
          </p>
          <p className="mt-1 text-[11px] text-neutral-400">
            {focusedClusterInfo.count} images · click background to return · click image for detail
          </p>
          <button
            type="button"
            onClick={() => exitLinkClusterFocus(true)}
            className="pointer-events-auto mt-3 rounded-full border border-neutral-300 bg-white px-4 py-1.5 text-xs text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50"
          >
            Exit cluster
          </button>
        </div>
      )}

      <ClusterCursorLabel
        title={clusterHover?.label ?? ''}
        count={clusterHover?.count ?? 0}
        x={clusterHover?.x ?? 0}
        y={clusterHover?.y ?? 0}
        visible={
          Boolean(
            clusterHover &&
              globeArrangement === 'clusters' &&
              !isConstellationFocused &&
              showInteractionHint &&
              !introLocked,
          )
        }
      />

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
        animate={{
          opacity: showBottomHint ? 1 : 0,
        }}
        transition={reduceMotion ? { duration: 0 } : SETTINGS_MENU_ENTRANCE.transition}
      >
        <p className="text-black" style={{ fontSize: 'var(--killchain-chrome-hint-font-size)' }}>
          {clusterFocusHintActive
            ? 'Click any image to reveal its fraud path'
            : cameraControls.enabled
            ? 'Point to move · hand closer/farther to zoom · pinch to select · pinch twice to close'
            : globeArrangement === 'clusters'
              ? 'Click a cluster or image to zoom in · drag to explore'
              : linkCluster.enabled
              ? focusedClusterInfo
                ? `${focusedClusterInfo.label} · ${focusedClusterInfo.count} images · click image for detail · background to return`
                : 'Click an image to zoom into its cluster'
              : 'Drag or pinch to spin · scroll to zoom · click to inspect'}
        </p>
        {clusterFocusHintActive && focusedImageTitle ? (
          <p
            className="mt-1 text-black"
            style={{ fontSize: 'var(--killchain-chrome-hint-font-size)' }}
          >
            {focusedImageTitle}
          </p>
        ) : null}
        <p
          ref={hoverLabelRef}
          className="mt-1 text-black"
          style={{
            fontSize: 'var(--killchain-chrome-hint-font-size)',
            display: 'none',
          }}
        />
      </motion.div>
    </div>
  )
}
