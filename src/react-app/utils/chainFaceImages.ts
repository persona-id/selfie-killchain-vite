import { taxonomy } from '../data/taxonomyData'
import type { Selections } from '../types/killchain'
import {
  imageAssetKey,
  pickUniqueTechniqueImageUrl,
  techniqueImageUrl,
} from '../data/techniqueImages'
import { MATRIX_STAGE_ORDER } from './techniqueStage'

export function selectedTechniqueIds(selections: Selections): string[] {
  const ids: string[] = []
  if (selections.TA) ids.push(selections.TA)
  if (selections.AC) ids.push(selections.AC)
  if (selections.AR?.length) ids.push(...selections.AR)
  if (selections.DL) ids.push(selections.DL)
  return ids
}

function matrixTechniqueIdsInColumnOrder(): string[] {
  const ids: string[] = []

  for (const stageId of MATRIX_STAGE_ORDER) {
    const stage = taxonomy.find((entry) => entry.id === stageId)
    if (!stage) continue

    for (const technique of stage.techniques) {
      ids.push(technique.id)
    }
  }

  return ids
}

function assignUniqueTechniqueImage(
  techId: string,
  usedAssetKeys: Set<string>,
  overrides: Partial<Record<string, string>>,
  preferredUrl?: string | null,
): string | null {
  const url = pickUniqueTechniqueImageUrl(techId, usedAssetKeys, preferredUrl)
  if (!url) return null

  overrides[techId] = url
  usedAssetKeys.add(imageAssetKey(url))
  return url
}

/**
 * Assign unique preview images across the full matrix once on load.
 * Selection changes must not reshuffle thumbnails.
 */
export function buildMatrixImageOverrides(
  galleryImageUrl?: string | null,
  galleryTechniqueIds: string[] = [],
): Partial<Record<string, string>> {
  const usedAssetKeys = new Set<string>()
  const overrides: Partial<Record<string, string>> = {}
  let galleryAssigned = false

  for (const techId of galleryTechniqueIds) {
    const preferredUrl = galleryImageUrl && !galleryAssigned ? galleryImageUrl : undefined
    const url = assignUniqueTechniqueImage(techId, usedAssetKeys, overrides, preferredUrl)
    if (galleryImageUrl && url === galleryImageUrl) {
      galleryAssigned = true
    }
  }

  for (const techId of matrixTechniqueIdsInColumnOrder()) {
    if (overrides[techId]) continue

    const defaultUrl = techniqueImageUrl(techId)
    if (defaultUrl && !usedAssetKeys.has(imageAssetKey(defaultUrl))) {
      assignUniqueTechniqueImage(techId, usedAssetKeys, overrides, defaultUrl)
      continue
    }

    assignUniqueTechniqueImage(techId, usedAssetKeys, overrides)
  }

  return overrides
}

/** @deprecated Use buildMatrixImageOverrides — kept for existing imports. */
export function buildChainFaceImageOverrides(
  _selections: unknown,
  galleryImageUrl?: string | null,
  galleryTechniqueIds: string[] = [],
): Partial<Record<string, string>> | undefined {
  const overrides = buildMatrixImageOverrides(galleryImageUrl, galleryTechniqueIds)
  return Object.keys(overrides).length > 0 ? overrides : undefined
}

export function resolveSequenceTechniqueImageUrl(
  techniqueId: string,
  overrides?: Partial<Record<string, string>> | null,
): string | null {
  return overrides?.[techniqueId] ?? techniqueImageUrl(techniqueId)
}
