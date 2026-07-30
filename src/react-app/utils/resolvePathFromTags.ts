import { observedPaths } from '../data/taxonomyData'
import type { ObservedPath, Selections } from '../types/killchain'
import { pathMatches } from './taxonomyHelpers'

export function tagsToSelections(tags: string[]): Selections {
  const selections: Selections = { TA: null, AC: null, AR: [], DL: null }

  for (const tag of tags) {
    if (tag.startsWith('TA-')) selections.TA = tag
    else if (tag.startsWith('AC-')) selections.AC = tag
    else if (tag.startsWith('AR-')) selections.AR.push(tag)
    else if (tag.startsWith('DL-')) selections.DL = tag
  }

  return selections
}

export function findExactPathForTags(tags: string[]): ObservedPath | null {
  const selections = tagsToSelections(tags)
  return (
    observedPaths.find((path) => !path.signalOnly && pathMatches(path, selections)) ?? null
  )
}

export function findBestPathForTags(tags: string[]): ObservedPath | null {
  const exact = findExactPathForTags(tags)
  if (exact) return exact

  const tagSet = new Set(tags)
  const candidates = observedPaths
    .filter((path) => !path.signalOnly)
    .map((path) => ({
      path,
      score: path.techniques.filter((tech) => tagSet.has(tech)).length,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  return candidates[0]?.path ?? null
}

export function selectionsToObservedPath(
  selections: Selections,
  id = 'preset',
): ObservedPath {
  const techniques: string[] = []
  if (selections.DL) techniques.push(selections.DL)
  for (const arId of selections.AR ?? []) techniques.push(arId)
  if (selections.AC) techniques.push(selections.AC)
  if (selections.TA) techniques.push(selections.TA)

  return {
    id,
    techniques,
    desc: 'Preset from gallery tags',
    sophistication: '—',
  }
}

export function resolveDeconstructPath(
  tags: string[],
  pathId?: string | null,
): ObservedPath | null {
  if (tags.length > 0) {
    const selections = tagsToSelections(tags)

    if (pathId) {
      const fromUrl = observedPaths.find((path) => path.id === pathId)
      if (fromUrl && pathMatches(fromUrl, selections)) return fromUrl
    }

    const exact = findExactPathForTags(tags)
    if (exact) return exact

    return selectionsToObservedPath(selections)
  }

  if (pathId) {
    return observedPaths.find((path) => path.id === pathId) ?? null
  }

  return observedPaths.find((path) => !path.signalOnly) ?? null
}

export function resolvePathFromTags(tags: string[]): ObservedPath | null {
  return resolveDeconstructPath(tags)
}
