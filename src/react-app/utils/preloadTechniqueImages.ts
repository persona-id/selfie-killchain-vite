import { TECHNIQUE_HF_PATHS, techniqueImageUrl } from '../data/techniqueImages'

const preloaded = new Set<string>()

export function preloadImageUrl(url: string | null | undefined) {
  if (!url || preloaded.has(url)) return
  preloaded.add(url)

  const img = new Image()
  img.decoding = 'async'
  img.src = url
  void img.decode?.().catch(() => undefined)
}

export function preloadTechniqueImages(extraUrls?: Iterable<string | null | undefined>) {
  for (const techniqueId of Object.keys(TECHNIQUE_HF_PATHS)) {
    preloadImageUrl(techniqueImageUrl(techniqueId))
  }

  for (const url of extraUrls ?? []) {
    preloadImageUrl(url)
  }
}

export function ensureHuggingFacePreconnect() {
  const href = 'https://huggingface.co'
  if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) return

  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = href
  link.crossOrigin = 'anonymous'
  document.head.append(link)
}
