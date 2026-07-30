import { observedPaths } from '../data/taxonomyData'
import type { GalleryItem } from '../types/gallery'
import type { Selections } from '../types/killchain'
import { pathMatches } from './taxonomyHelpers'
import { findExactPathForTags, resolveDeconstructPath } from './resolvePathFromTags'

export function selectionsToTags(selections: Selections): string[] {
  const tags: string[] = []
  if (selections.TA) tags.push(selections.TA)
  if (selections.AC) tags.push(selections.AC)
  if (selections.AR) tags.push(...selections.AR)
  if (selections.DL) tags.push(selections.DL)
  return tags
}

export function hasGlobeFraudPathSelection(options: {
  selectedItem: GalleryItem | null
  search: string
}): boolean {
  if (options.selectedItem) return true
  const params = new URLSearchParams(options.search)
  return Boolean(params.get('image') || params.get('tags'))
}

export function hasMatrixBuiltPath(selections: Selections | null): boolean {
  if (!selections?.TA || !selections.AC || !selections.DL) return false
  return observedPaths.some((path) => pathMatches(path, selections))
}

export function hasDeconstructPathFromSearch(search: string): boolean {
  const params = new URLSearchParams(search)
  const pathId = params.get('path')
  const tags = params.get('tags')?.split(',').filter(Boolean) ?? []

  if (tags.length > 0) {
    return Boolean(resolveDeconstructPath(tags, pathId))
  }

  if (pathId) {
    return Boolean(observedPaths.find((path) => path.id === pathId))
  }

  return false
}

export function canAccessDeconstruct(options: {
  pathname: string
  search: string
  selectedItem: GalleryItem | null
  matrixSelections: Selections | null
}): boolean {
  if (options.pathname === '/') {
    if (!hasGlobeFraudPathSelection(options)) return false
    const params = new URLSearchParams(options.search)
    const tags =
      params.get('tags')?.split(',').filter(Boolean) ??
      options.selectedItem?.tags ??
      []
    const pathId = params.get('path')
    if (tags.length > 0 || pathId) {
      return hasDeconstructPathFromSearch(options.search) || Boolean(findExactPathForTags(tags))
    }
    return Boolean(options.selectedItem && findExactPathForTags(options.selectedItem.tags))
  }

  if (options.pathname === '/matrix') {
    if (hasDeconstructPathFromSearch(options.search)) return true
    return hasMatrixBuiltPath(options.matrixSelections)
  }

  return true
}

export function getDeconstructDisabledReason(options: {
  pathname: string
  search: string
  selectedItem: GalleryItem | null
  matrixSelections: Selections | null
}): string | null {
  if (canAccessDeconstruct(options)) return null

  if (options.pathname === '/') {
    return 'Please choose a path on the globe to access Deconstruct.'
  }

  if (options.pathname === '/matrix') {
    return 'Please choose or create a path in the Matrix to view Deconstruct.'
  }

  return null
}

export function buildDeconstructSearch(
  selections: Selections,
  existingSearch = '',
): string {
  const tags = selectionsToTags(selections)
  const params = new URLSearchParams()
  if (tags.length > 0) params.set('tags', tags.join(','))

  const path = findExactPathForTags(tags)
  if (path) params.set('path', path.id)

  const image = new URLSearchParams(existingSearch).get('image')
  if (image) params.set('image', image)

  const query = params.toString()
  return query ? `?${query}` : ''
}

export function buildGlobePresetSearch(
  selectedItem: GalleryItem | null,
  existingSearch = '',
  matrixSelections: Selections | null = null,
): string {
  const normalizedExisting = existingSearch
    ? existingSearch.startsWith('?')
      ? existingSearch
      : `?${existingSearch}`
    : ''

  if (normalizedExisting) {
    const params = new URLSearchParams(normalizedExisting.slice(1))
    if (params.get('image') || params.get('tags')) {
      return normalizedExisting
    }
  }

  if (selectedItem) {
    const params = new URLSearchParams()
    params.set('tags', selectedItem.tags.join(','))
    const path = findExactPathForTags(selectedItem.tags)
    if (path) params.set('path', path.id)
    params.set('image', selectedItem.imageUrl)

    const query = params.toString()
    return query ? `?${query}` : ''
  }

  if (matrixSelections) {
    const tags = selectionsToTags(matrixSelections)
    if (tags.length === 0) return normalizedExisting || ''

    const params = new URLSearchParams()
    params.set('tags', tags.join(','))
    const path = findExactPathForTags(tags)
    if (path) params.set('path', path.id)

    const image = normalizedExisting
      ? new URLSearchParams(normalizedExisting.slice(1)).get('image')
      : null
    if (image) params.set('image', image)

    const query = params.toString()
    return query ? `?${query}` : ''
  }

  return normalizedExisting || ''
}
