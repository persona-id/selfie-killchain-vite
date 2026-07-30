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
}

export const ASPECT_RATIO_OPTIONS: { id: GlobeAspectRatio; label: string }[] = [
  { id: 'portrait', label: '3:4' },
  { id: 'square', label: '1:1' },
  { id: 'landscape', label: '4:3' },
  { id: 'wide', label: '16:9' },
]

export const DEFAULT_GLOBE_DISPLAY: GlobeDisplaySettings = {
  imageSize: 0.5,
  aspectRatio: 'square',
  imageShape: 'circle',
  cornerRadius: 3,
  depthFade: 1,
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
