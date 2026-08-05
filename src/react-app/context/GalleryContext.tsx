import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  CATEGORIES,
  type Category,
  type GalleryItem,
  type GalleryIndex,
  type GlobeAnimation,
  type GlobeArrangement,
  type GlobeDisplaySettings,
  type LinkClusterSettings,
  type CameraControlSettings,
  type ConstellationSettings,
  DEFAULT_GLOBE_DISPLAY,
  DEFAULT_LINK_CLUSTER,
  DEFAULT_CAMERA_CONTROLS,
  DEFAULT_CONSTELLATION,
  DEFAULT_COMPREHENSIVE_MODE,
  type Complexity,
} from '../types/gallery'
import {
  DEFAULT_GLOBE_ITEM_COUNT,
  MAX_GLOBE_ITEM_COUNT,
  MIN_GLOBE_ITEM_COUNT,
  isGlobeAnimation,
} from '../lib/globe'

const STORAGE_KEY = 'persona-fas-gallery'

type StoredState = {
  activeCategories: Category[]
  activeComplexity: Complexity | null
  backgroundColor: string
  globeArrangement: GlobeArrangement
  globeAnimation: GlobeAnimation
  globeItemCount: number
  globeDisplay: GlobeDisplaySettings
  linkCluster: LinkClusterSettings
  cameraControls: CameraControlSettings
  constellation: ConstellationSettings
  comprehensiveMode: boolean
}

type GalleryContextValue = {
  items: GalleryItem[]
  loading: boolean
  backgroundColor: string
  setBackgroundColor: (color: string) => void
  globeArrangement: GlobeArrangement
  setGlobeArrangement: (arrangement: GlobeArrangement) => void
  globeAnimation: GlobeAnimation
  globeItemCount: number
  setGlobeItemCount: (count: number) => void
  globeDisplay: GlobeDisplaySettings
  linkCluster: LinkClusterSettings
  cameraControls: CameraControlSettings
  constellation: ConstellationSettings
  setGlobeDisplay: (settings: Partial<GlobeDisplaySettings>) => void
  setLinkCluster: (settings: Partial<LinkClusterSettings>) => void
  setCameraControls: (settings: Partial<CameraControlSettings>) => void
  setConstellation: (settings: Partial<ConstellationSettings>) => void
  setGlobeAnimation: (animation: GlobeAnimation) => void
  comprehensiveMode: boolean
  setComprehensiveMode: (enabled: boolean) => void
  activeCategories: Set<Category>
  toggleCategory: (category: Category) => void
  selectAllCategories: () => void
  activeComplexity: Complexity | null
  setActiveComplexity: (complexity: Complexity | null) => void
  filteredItems: GalleryItem[]
  categoryCounts: Record<Category, number>
  selectedItem: GalleryItem | null
  selectedIndex: number
  modalItems: GalleryItem[]
  openModal: (item: GalleryItem) => void
  openModalScoped: (item: GalleryItem, scope: GalleryItem[]) => void
  closeModal: () => void
  navigateModal: (delta: number) => void
}

const GalleryContext = createContext<GalleryContextValue | null>(null)

const KILLCHAIN_PAGE_BG = '#f2f2f2'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeHex(color: string): string {
  const c = color.trim().toLowerCase()
  if (/^#[0-9a-f]{3}$/.test(c)) {
    return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`
  }
  if (/^#[0-9a-f]{6}$/.test(c)) return c
  return KILLCHAIN_PAGE_BG
}

function loadStoredState(): StoredState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        activeCategories: [...CATEGORIES],
        activeComplexity: null,
        backgroundColor: KILLCHAIN_PAGE_BG,
        globeArrangement: 'even',
        globeAnimation: 'drift',
        globeItemCount: DEFAULT_GLOBE_ITEM_COUNT,
        globeDisplay: { ...DEFAULT_GLOBE_DISPLAY },
        linkCluster: { ...DEFAULT_LINK_CLUSTER },
        cameraControls: { ...DEFAULT_CAMERA_CONTROLS },
        constellation: { ...DEFAULT_CONSTELLATION },
        comprehensiveMode: DEFAULT_COMPREHENSIVE_MODE,
      }
    }
    const parsed = JSON.parse(raw) as StoredState
    return {
      activeCategories: parsed.activeCategories?.length
        ? parsed.activeCategories
        : [...CATEGORIES],
      activeComplexity: parsed.activeComplexity ?? null,
      backgroundColor: normalizeHex(
        parsed.backgroundColor?.toLowerCase() === '#eeeeee'
          ? KILLCHAIN_PAGE_BG
          : (parsed.backgroundColor ?? KILLCHAIN_PAGE_BG),
      ),
      globeArrangement: parsed.globeArrangement ?? 'even',
      globeAnimation: isGlobeAnimation(parsed.globeAnimation)
        ? parsed.globeAnimation
        : 'drift',
      globeItemCount: clamp(
        Math.round(parsed.globeItemCount ?? DEFAULT_GLOBE_ITEM_COUNT),
        MIN_GLOBE_ITEM_COUNT,
        MAX_GLOBE_ITEM_COUNT,
      ),
      globeDisplay: {
        ...DEFAULT_GLOBE_DISPLAY,
        ...parsed.globeDisplay,
        imageShape:
          parsed.globeDisplay?.imageShape ?? DEFAULT_GLOBE_DISPLAY.imageShape,
        depthFade: 1,
      },
      linkCluster: {
        ...DEFAULT_LINK_CLUSTER,
        ...parsed.linkCluster,
        threadColor: normalizeHex(
          parsed.linkCluster?.threadColor ?? DEFAULT_LINK_CLUSTER.threadColor,
        ),
      },
      cameraControls: {
        ...DEFAULT_CAMERA_CONTROLS,
        ...parsed.cameraControls,
        smoothness:
          parsed.cameraControls?.smoothness ?? DEFAULT_CAMERA_CONTROLS.smoothness,
      },
      constellation: {
        ...DEFAULT_CONSTELLATION,
        ...parsed.constellation,
        lineColor: normalizeHex(
          parsed.constellation?.lineColor ?? DEFAULT_CONSTELLATION.lineColor,
        ),
        elementAnimation: isGlobeAnimation(parsed.constellation?.elementAnimation)
          ? parsed.constellation.elementAnimation
          : DEFAULT_CONSTELLATION.elementAnimation,
        elementLayout:
          parsed.constellation?.elementLayout ??
          DEFAULT_CONSTELLATION.elementLayout,
        fieldLayout:
          parsed.constellation?.fieldLayout ?? DEFAULT_CONSTELLATION.fieldLayout,
      },
      comprehensiveMode: parsed.comprehensiveMode ?? DEFAULT_COMPREHENSIVE_MODE,
    }
  } catch {
    return {
      activeCategories: [...CATEGORIES],
      activeComplexity: null,
      backgroundColor: KILLCHAIN_PAGE_BG,
      globeArrangement: 'even',
      globeAnimation: 'drift',
      globeItemCount: DEFAULT_GLOBE_ITEM_COUNT,
      globeDisplay: { ...DEFAULT_GLOBE_DISPLAY },
      linkCluster: { ...DEFAULT_LINK_CLUSTER },
      cameraControls: { ...DEFAULT_CAMERA_CONTROLS },
      constellation: { ...DEFAULT_CONSTELLATION },
      comprehensiveMode: DEFAULT_COMPREHENSIVE_MODE,
    }
  }
}

export function GalleryProvider({ children }: { children: ReactNode }) {
  const stored = loadStoredState()
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(
    () => new Set(stored.activeCategories),
  )
  const [activeComplexity, setActiveComplexityState] = useState<Complexity | null>(
    stored.activeComplexity,
  )
  const [backgroundColor, setBackgroundColorState] = useState(
    normalizeHex(stored.backgroundColor),
  )
  const [globeArrangement, setGlobeArrangement] = useState<GlobeArrangement>(
    stored.globeArrangement,
  )
  const [globeAnimation, setGlobeAnimation] = useState<GlobeAnimation>(
    stored.globeAnimation,
  )
  const [globeItemCount, setGlobeItemCountState] = useState(
    stored.globeItemCount,
  )
  const [globeDisplay, setGlobeDisplayState] = useState<GlobeDisplaySettings>(
    stored.globeDisplay,
  )
  const [linkCluster, setLinkClusterState] = useState<LinkClusterSettings>(
    stored.linkCluster,
  )
  const [cameraControls, setCameraControlsState] = useState<CameraControlSettings>(
    stored.cameraControls,
  )
  const [constellation, setConstellationState] = useState<ConstellationSettings>(
    stored.constellation,
  )
  const [comprehensiveMode, setComprehensiveModeState] = useState(
    stored.comprehensiveMode,
  )
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null)
  const [modalScope, setModalScope] = useState<GalleryItem[] | null>(null)

  useEffect(() => {
    fetch('/gallery-index.json')
      .then((r) => r.json())
      .then((data: GalleryIndex) => setItems(data.items))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeCategories: [...activeCategories],
        activeComplexity,
        backgroundColor,
        globeArrangement,
        globeAnimation,
        globeItemCount,
        globeDisplay,
        linkCluster,
        cameraControls,
        constellation,
        comprehensiveMode,
      }),
    )

  }, [
    activeCategories,
    activeComplexity,
    backgroundColor,
    globeArrangement,
    globeAnimation,
    globeItemCount,
    globeDisplay,
    linkCluster,
    cameraControls,
    constellation,
    comprehensiveMode,
  ])

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(
      CATEGORIES.map((c) => [c, 0]),
    ) as Record<Category, number>
    for (const item of items) counts[item.category]++
    return counts
  }, [items])

  const filteredItems = useMemo(
    () => items.filter((item) => activeCategories.has(item.category)),
    [items, activeCategories],
  )

  const modalItems = modalScope ?? filteredItems

  const selectedIndex = useMemo(() => {
    if (!selectedItem) return -1
    return modalItems.findIndex((item) => item.id === selectedItem.id)
  }, [selectedItem, modalItems])

  const toggleCategory = useCallback((category: Category) => {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        if (next.size === 1) return prev
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  const selectAllCategories = useCallback(() => {
    setActiveCategories(new Set(CATEGORIES))
  }, [])

  const setActiveComplexity = useCallback((complexity: Complexity | null) => {
    setActiveComplexityState(complexity)
  }, [])

  const setBackgroundColor = useCallback((color: string) => {
    setBackgroundColorState(normalizeHex(color))
  }, [])

  const setGlobeItemCount = useCallback((count: number) => {
    setGlobeItemCountState(
      clamp(Math.round(count), MIN_GLOBE_ITEM_COUNT, MAX_GLOBE_ITEM_COUNT),
    )
  }, [])

  const setGlobeDisplay = useCallback((settings: Partial<GlobeDisplaySettings>) => {
    setGlobeDisplayState((prev) => ({
      imageSize: clamp(settings.imageSize ?? prev.imageSize, 0.4, 2.5),
      aspectRatio: settings.aspectRatio ?? prev.aspectRatio,
      imageShape: settings.imageShape ?? prev.imageShape,
      cornerRadius: clamp(settings.cornerRadius ?? prev.cornerRadius, 0, 24),
      depthFade: 1,
    }))
  }, [])

  const setLinkCluster = useCallback((settings: Partial<LinkClusterSettings>) => {
    setLinkClusterState((prev) => ({
      enabled: settings.enabled ?? prev.enabled,
      threadColor: settings.threadColor
        ? normalizeHex(settings.threadColor)
        : prev.threadColor,
      threadThickness: clamp(
        settings.threadThickness ?? prev.threadThickness,
        0.5,
        4,
      ),
    }))
  }, [])

  const setCameraControls = useCallback((settings: Partial<CameraControlSettings>) => {
    setCameraControlsState((prev) => ({
      enabled: settings.enabled ?? prev.enabled,
      traverseSensitivity: clamp(
        settings.traverseSensitivity ?? prev.traverseSensitivity,
        0.25,
        2.5,
      ),
      zoomSensitivity: clamp(
        settings.zoomSensitivity ?? prev.zoomSensitivity,
        0.25,
        2.5,
      ),
      smoothness: clamp(settings.smoothness ?? prev.smoothness, 0, 1),
      showPreview: settings.showPreview ?? prev.showPreview,
    }))
  }, [])

  const setConstellation = useCallback((settings: Partial<ConstellationSettings>) => {
    setConstellationState((prev) => ({
      clusterSpread: clamp(settings.clusterSpread ?? prev.clusterSpread, 0.5, 2.5),
      elementSeparation: clamp(
        settings.elementSeparation ?? prev.elementSeparation,
        0.5,
        2.5,
      ),
      elementLayout: settings.elementLayout ?? prev.elementLayout,
      fieldLayout: settings.fieldLayout ?? prev.fieldLayout,
      elementAnimation: settings.elementAnimation ?? prev.elementAnimation,
      lineColor: settings.lineColor
        ? normalizeHex(settings.lineColor)
        : prev.lineColor,
      lineThickness: clamp(settings.lineThickness ?? prev.lineThickness, 0.25, 3),
      lineOpacity: clamp(settings.lineOpacity ?? prev.lineOpacity, 0.05, 1),
    }))
  }, [])

  const setComprehensiveMode = useCallback((enabled: boolean) => {
    setComprehensiveModeState(enabled)
  }, [])

  const openModal = useCallback((item: GalleryItem) => {
    setModalScope(null)
    setSelectedItem(item)
  }, [])

  const openModalScoped = useCallback((item: GalleryItem, scope: GalleryItem[]) => {
    setModalScope(scope)
    setSelectedItem(item)
  }, [])

  const closeModal = useCallback(() => {
    setSelectedItem(null)
    setModalScope(null)
  }, [])

  const navigateModal = useCallback(
    (delta: number) => {
      if (modalItems.length === 0) return
      const current = selectedIndex >= 0 ? selectedIndex : 0
      const next = (current + delta + modalItems.length) % modalItems.length
      setSelectedItem(modalItems[next])
    },
    [modalItems, selectedIndex],
  )

  const value: GalleryContextValue = {
    items,
    loading,
    backgroundColor,
    setBackgroundColor,
    globeArrangement,
    setGlobeArrangement,
    globeAnimation,
    setGlobeAnimation,
    globeItemCount,
    setGlobeItemCount,
    globeDisplay,
    setGlobeDisplay,
    linkCluster,
    setLinkCluster,
    cameraControls,
    setCameraControls,
    constellation,
    setConstellation,
    comprehensiveMode,
    setComprehensiveMode,
    activeCategories,
    toggleCategory,
    selectAllCategories,
    activeComplexity,
    setActiveComplexity,
    filteredItems,
    categoryCounts,
    selectedItem,
    selectedIndex,
    modalItems,
    openModal,
    openModalScoped,
    closeModal,
    navigateModal,
  }

  return (
    <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>
  )
}

export function useGallery() {
  const ctx = useContext(GalleryContext)
  if (!ctx) throw new Error('useGallery must be used within GalleryProvider')
  return ctx
}

export function useGalleryOptional() {
  return useContext(GalleryContext)
}
