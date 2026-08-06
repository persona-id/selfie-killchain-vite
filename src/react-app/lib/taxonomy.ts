import type { Category, Complexity, GalleryItem } from '../types/gallery'

const HF_BASE =
  'https://huggingface.co/datasets/saatvikbilla1/persona-fas-preview/resolve/main'

const AR_CODE_MAP: Record<string, string> = {
  unrefined: 'AR-01',
  artifact_suppression: 'AR-02',
  color_lighting_matching: 'AR-03',
  compression_manipulation: 'AR-04',
  noise_injection: 'AR-05',
  resolution_format_matching: 'AR-06',
  source_inputs: 'AR-07',
}

const REPLICA_DL_MAP: Record<string, string> = {
  ai_generated: 'DL-01',
  id_portraits: 'DL-01',
  kyc_video: 'DL-02',
  physical_photo: 'DL-01',
  screen_replays: 'DL-02',
}

export function imageUrl(relPath: string): string {
  return `${HF_BASE}/${relPath}`
}

export const GLOBE_THUMB_WIDTH = 112
export const GLOBE_THUMB_HEIGHT = 148

type GalleryDisplayImageOptions = {
  width: number
  height: number
  quality?: number
}

export const GALLERY_DISPLAY_IMAGE = {
  modal: { width: 572, height: 572, quality: 85 },
  deconstructPanel: { width: 572, height: 564, quality: 85 },
  deconstructNode: { width: 484, height: 476, quality: 85 },
  techniqueThumb: { width: 400, height: 400, quality: 80 },
} as const satisfies Record<string, GalleryDisplayImageOptions>

export function galleryDisplayImageUrl(
  fullUrl: string | null | undefined,
  options: GalleryDisplayImageOptions,
): string | null {
  if (!fullUrl) return null
  if (fullUrl.includes('wsrv.nl/?url=')) return fullUrl

  const { width, height, quality = 85 } = options
  const encoded = encodeURIComponent(fullUrl)
  return `https://wsrv.nl/?url=${encoded}&w=${width}&h=${height}&fit=cover&q=${quality}&output=webp&n=-1`
}

export function globeThumbnailUrl(fullUrl: string): string {
  return galleryDisplayImageUrl(fullUrl, {
    width: GLOBE_THUMB_WIDTH,
    height: GLOBE_THUMB_HEIGHT,
    quality: 78,
  })!
}

export function resolveGlobeImageSrc(item: {
  imageUrl: string
  thumbnailUrl: string
}): string {
  if (item.thumbnailUrl !== item.imageUrl) return item.thumbnailUrl
  return globeThumbnailUrl(item.imageUrl)
}

export function complexityFromArCount(arCount: number): Complexity {
  if (arCount >= 3) return 'High'
  if (arCount >= 1) return 'Moderate'
  return 'Low'
}

export function tagsForPhysical(
  category: Category,
  relPath: string,
): string[] {
  const tags = new Set<string>(['TA-04'])

  if (category === 'dolls_and_mannequins' || category === 'masks') {
    tags.add('AC-02')
    tags.add('DL-01')
    return [...tags]
  }

  if (category === 'replicas') {
    const parts = relPath.split('/')
    const sub = parts[1]
    tags.add(sub === 'physical_photo' ? 'AC-02' : 'AC-01')
    if (sub && REPLICA_DL_MAP[sub]) tags.add(REPLICA_DL_MAP[sub])
    return [...tags]
  }

  return [...tags]
}

export function tagsForSynthetic(
  acTop: string,
  arSet: string[],
  relPath: string,
): string[] {
  const tags = new Set<string>(['TA-04'])

  if (acTop === 'face_swap') tags.add('AC-03')
  else if (acTop === 'full_face_synthesis') tags.add('AC-04')
  else if (acTop === 'partial_modification') tags.add('AC-06')

  for (const ar of arSet) {
    const code = AR_CODE_MAP[ar]
    if (code) tags.add(code)
  }

  for (const segment of relPath.split('/')) {
    const code = AR_CODE_MAP[segment]
    if (code) tags.add(code)
  }

  tags.add('DL-03')
  return [...tags]
}

export function categoryLabel(category: Category): string {
  return category.replace(/_/g, ' ')
}

export const FILTER_GROUP_ORDER = [
  'dolls_and_mannequins',
  'masks',
  'ai_generated',
  'id_portraits',
  'kyc_video',
  'physical_photo',
  'screen_replays',
  'face_swap',
  'partial_modification',
  'full_face_synthesis',
] as const

export type FilterGroup = (typeof FILTER_GROUP_ORDER)[number]

export function itemFilterKey(
  item: Pick<GalleryItem, 'category' | 'subcategory'>,
): string {
  return item.subcategory ?? item.category
}

export function filterGroupLabel(key: string): string {
  return key.replace(/_/g, ' ')
}

export function orderedFilterGroups(keys: Iterable<string>): string[] {
  const present = new Set(keys)
  const ordered = FILTER_GROUP_ORDER.filter((key) => present.has(key))
  const extras = [...present]
    .filter((key) => !FILTER_GROUP_ORDER.includes(key as FilterGroup))
    .sort()
  return [...ordered, ...extras]
}

export function itemMatchesFilter(
  item: Pick<GalleryItem, 'category' | 'subcategory'>,
  filter: string,
): boolean {
  return itemFilterKey(item) === filter
}

export function formatTag(tag: string): string {
  return tag
}
