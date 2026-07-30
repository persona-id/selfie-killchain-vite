import type { GalleryItem } from '../types/gallery'

export function similarityScore(a: GalleryItem, b: GalleryItem): number {
  if (a.id === b.id) return -1

  let score = 0
  if (a.category === b.category) score += 2
  if (a.subcategory && a.subcategory === b.subcategory) score += 4

  for (const tag of a.tags) {
    if (b.tags.includes(tag)) score += 1
  }

  if (a.complexity === b.complexity) score += 1
  return score
}

export function findSimilarItems(
  anchor: GalleryItem,
  pool: GalleryItem[],
  max = 6,
): GalleryItem[] {
  const scored = pool
    .map((item) => ({ item, score: similarityScore(anchor, item) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)

  return scored.map((entry) => entry.item)
}
