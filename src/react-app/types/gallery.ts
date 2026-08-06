export const CATEGORIES = [
  'dolls_and_mannequins',
  'masks',
  'replicas',
  'synthetic',
] as const

export type Category = (typeof CATEGORIES)[number]

export type GlobeArrangement = 'even' | 'rings' | 'helix' | 'cloud' | 'clusters'

export type GlobeAnimation =
  | 'drift'
  | 'calm'
  | 'orbit'
  | 'sway'
  | 'static'
  | 'pulse'
  | 'bloom'
  | 'surge'
  | 'tide'
  | 'dolly'

export type GlobeAspectRatio = 'portrait' | 'square' | 'landscape' | 'wide'

export type GlobeImageShape = 'circle' | 'rounded'

export type GlobeDisplaySettings = {
  imageSize: number
  aspectRatio: GlobeAspectRatio
  imageShape: GlobeImageShape
  cornerRadius: number
  depthFade: number
  depthVisibility: number
  depthFadeRange: number
}

export const ASPECT_RATIO_OPTIONS: { id: GlobeAspectRatio; label: string }[] = [
  { id: 'portrait', label: '3:4' },
  { id: 'square', label: '1:1' },
  { id: 'landscape', label: '4:3' },
  { id: 'wide', label: '16:9' },
]

export const MIN_GLOBE_IMAGE_SIZE = 0.15
export const MAX_GLOBE_IMAGE_SIZE = 2.5
export const MIN_DEPTH_FADE = 0
export const MAX_DEPTH_FADE = 2
export const MIN_DEPTH_VISIBILITY = 20
export const MAX_DEPTH_VISIBILITY = 500
export const MIN_DEPTH_FADE_RANGE = 0.25
export const MAX_DEPTH_FADE_RANGE = 2.5

export const DEFAULT_GLOBE_DISPLAY: GlobeDisplaySettings = {
  imageSize: 0.3,
  aspectRatio: 'square',
  imageShape: 'circle',
  cornerRadius: 3,
  depthFade: 1.15,
  depthVisibility: 80,
  depthFadeRange: 1,
}

export type LinkClusterSettings = {
  enabled: boolean
  threadColor: string
  threadThickness: number
}

export const DEFAULT_LINK_CLUSTER: LinkClusterSettings = {
  enabled: false,
  threadColor: '#d1d5db',
  threadThickness: 1,
}

export type CameraControlSettings = {
  enabled: boolean
  traverseSensitivity: number
  zoomSensitivity: number
  smoothness: number
  showPreview: boolean
}

export const DEFAULT_CAMERA_CONTROLS: CameraControlSettings = {
  enabled: false,
  traverseSensitivity: 1,
  zoomSensitivity: 1,
  smoothness: 0.4,
  showPreview: true,
}

export type ClusterElementLayout =
  | 'globe'
  | 'ring'
  | 'disc'
  | 'helix'
  | 'burst'
  | 'orbit'

export type ClusterFieldLayout = 'scattered' | 'shell' | 'belt' | 'helix'

export type ConstellationSettings = {
  clusterSpread: number
  elementSeparation: number
  elementLayout: ClusterElementLayout
  fieldLayout: ClusterFieldLayout
  elementAnimation: GlobeAnimation
  lineColor: string
  lineThickness: number
  lineOpacity: number
}

export const DEFAULT_GLOBE_ARRANGEMENT: GlobeArrangement = 'cloud'

export const DEFAULT_CONSTELLATION: ConstellationSettings = {
  clusterSpread: 1,
  elementSeparation: 1,
  elementLayout: 'globe',
  fieldLayout: 'scattered',
  elementAnimation: 'orbit',
  lineColor: '#94a3b8',
  lineThickness: 0.65,
  lineOpacity: 0.55,
}

export type GlobeCategoryMode = 'globe' | 'chain'

export const CATEGORY_MODE_OPTIONS: {
  id: GlobeCategoryMode
  label: string
  hint: string
}[] = [
  { id: 'globe', label: 'Globe', hint: 'Classic sphere layout' },
  { id: 'chain', label: 'Sphere chain', hint: 'Linear interconnected spheres' },
]

export type ChainLineConnect = 'bridges' | 'hub-spokes' | 'member-mesh' | 'all'

export const CHAIN_LINE_CONNECT_OPTIONS: {
  id: ChainLineConnect
  label: string
}[] = [
  { id: 'bridges', label: 'Hub bridges' },
  { id: 'hub-spokes', label: 'Hub to images' },
  { id: 'member-mesh', label: 'Image mesh' },
  { id: 'all', label: 'All' },
]

export type CategoryViewSettings = {
  showConnectionLines: boolean
  showCategoryLabels: boolean
  chainSpacing: number
  lineOpacity: number
  lineColor: string
  lineThickness: number
  bridgeLineThickness: number
  chainLineConnect: ChainLineConnect
  memberLinesPerHub: number
  clusterShape: ClusterElementLayout
  clusterSpacing: number
  groupSpread: number
  clusterAnimation: GlobeAnimation
  imageFlutter: number
  motionSpeed: number
}

export const DEFAULT_CATEGORY_MODE: GlobeCategoryMode = 'globe'

export const DEFAULT_CATEGORY_VIEW: CategoryViewSettings = {
  showConnectionLines: true,
  showCategoryLabels: true,
  chainSpacing: 1,
  lineOpacity: 0.55,
  lineColor: '#b8b8b8',
  lineThickness: 0.65,
  bridgeLineThickness: 0.9,
  chainLineConnect: 'all',
  memberLinesPerHub: 0,
  clusterShape: 'globe',
  clusterSpacing: 1,
  groupSpread: 1,
  clusterAnimation: 'sway',
  imageFlutter: 0.35,
  motionSpeed: 1,
}

export type Complexity = 'Low' | 'Moderate' | 'High'

export type GalleryItem = {
  id: string
  category: Category
  subcategory?: string
  imageUrl: string
  thumbnailUrl: string
  complexity: Complexity
  description: string
  tags: string[]
  arSet?: string[]
  arCount?: number
}

export type GalleryIndex = {
  generatedAt: string
  total: number
  items: GalleryItem[]
}
