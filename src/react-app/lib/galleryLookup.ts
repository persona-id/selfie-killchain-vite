import type { Complexity, GalleryItem } from '../types/gallery'
import type { ObservedPath, Sophistication } from '../types/killchain'

let cache: GalleryItem[] | null = null

async function loadItems(): Promise<GalleryItem[]> {
  if (cache) return cache
  const res = await fetch('/gallery-index.json')
  const data = await res.json()
  cache = data.items as GalleryItem[]
  return cache
}

function sophisticationToComplexity(sophistication: Sophistication): Complexity {
  if (sophistication === 'Medium') return 'Moderate'
  if (sophistication === 'Low' || sophistication === 'High') return sophistication
  return 'Moderate'
}

export function buildResultGalleryItem(
  imageUrl: string,
  path: ObservedPath,
): GalleryItem {
  return {
    id: `path-${path.id}`,
    category: 'replicas',
    imageUrl,
    thumbnailUrl: imageUrl,
    complexity: sophisticationToComplexity(path.sophistication),
    description: path.desc,
    tags: path.techniques,
  }
}

function lookupGalleryItem(
  items: GalleryItem[],
  imageUrl: string | null,
  tags: string[],
): GalleryItem | null {
  if (imageUrl) {
    const byImage = items.find((item) => item.imageUrl === imageUrl)
    if (byImage) return byImage
  }
  if (tags.length === 0) return null
  const tagSet = new Set(tags)
  return (
    items.find((item) => tags.every((tag) => item.tags.includes(tag))) ??
    items.find((item) => item.tags.some((tag) => tagSet.has(tag))) ??
    null
  )
}

export async function findGalleryItem(
  imageUrl: string | null,
  tags: string[],
): Promise<GalleryItem | null> {
  const items = await loadItems()
  return lookupGalleryItem(items, imageUrl, tags)
}

export async function resolveResultGalleryItem(
  imageUrl: string,
  path: ObservedPath,
): Promise<GalleryItem> {
  const fromIndex = await findGalleryItem(imageUrl, path.techniques)
  return fromIndex ?? buildResultGalleryItem(imageUrl, path)
}
