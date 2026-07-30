export type StageId = 'TA' | 'AC' | 'AR' | 'DL'

export type Sophistication = 'Low' | 'Medium' | 'High' | '—'

export interface Technique {
  name: string
  id: string
  desc: string
  descShort: string
  subtechniques: string[]
}

export interface Stage {
  stage: string
  id: StageId
  color: string
  description: string
  techniques: Technique[]
}

export interface ObservedPath {
  id: string
  techniques: string[]
  desc: string
  sophistication: Sophistication
  signalOnly?: boolean
}

export interface Selections {
  TA: string | null
  AC: string | null
  AR: string[]
  DL: string | null
}

export interface GalleryImage {
  id: string
  pathId: string
  imageUrl: string | null
  complexity: Sophistication
  description: string
  techniques: string[]
  x: number
  y: number
}

export type ViewMode = 'globe' | 'matrix' | 'deconstruct'

export interface DeconstructNode {
  id: string
  techniqueId: string
  name: string
  x: number
  y: number
  width: number
  height: number
  isResult?: boolean
  imageUrl?: string | null
}

export interface DeconstructEdge {
  from: string
  to: string
}
