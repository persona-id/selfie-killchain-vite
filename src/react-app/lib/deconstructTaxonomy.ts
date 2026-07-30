import { taxonomy } from '../data/taxonomyData'
import { techniqueImageUrl } from '../data/techniqueImages'
import type { StageId, Technique } from '../types/killchain'

export type TechniqueWithStage = Technique & {
  stageId: StageId
  stageName: string
  stageDescription: string
}

export function getTechniqueById(techniqueId: string): TechniqueWithStage | null {
  for (const stage of taxonomy) {
    const tech = stage.techniques.find((t) => t.id === techniqueId)
    if (tech) {
      return {
        ...tech,
        stageId: stage.id,
        stageName: stage.stage,
        stageDescription: stage.description,
      }
    }
  }
  return null
}

export function getStageTechniques(stageId: StageId): TechniqueWithStage[] {
  const stage = taxonomy.find((s) => s.id === stageId)
  if (!stage) return []
  return stage.techniques.map((tech) => ({
    ...tech,
    stageId: stage.id,
    stageName: stage.stage,
    stageDescription: stage.description,
  }))
}

export function techniquePreviewUrl(techniqueId: string): string | null {
  return techniqueImageUrl(techniqueId)
}
