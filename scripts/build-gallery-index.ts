import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Category, GalleryItem } from '../src/react-app/types/gallery'
import {
  complexityFromArCount,
  imageUrl,
  tagsForPhysical,
  tagsForSynthetic,
} from '../src/react-app/lib/taxonomy'
import {
  descriptionForPhysical,
  descriptionForSynthetic,
} from '../src/react-app/lib/descriptions'

const HF_API = 'https://huggingface.co/api/datasets/saatvikbilla1/persona-fas-preview'
const MANIFEST_URL =
  'https://huggingface.co/datasets/saatvikbilla1/persona-fas-preview/raw/main/synthetic/_manifest.csv'

const PHYSICAL_CATEGORIES: Category[] = [
  'dolls_and_mannequins',
  'masks',
  'replicas',
]

type TreeEntry = { type: string; path: string }

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = join(__dirname, '../public/gallery-index.json')

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`)
  return res.json() as Promise<T>
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`)
  return res.text()
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  result.push(current.trim())
  return result
}

function isImage(path: string): boolean {
  return /\.(png|jpe?g|webp)$/i.test(path)
}

async function listImagesInCategory(category: Category): Promise<GalleryItem[]> {
  const url = `${HF_API}/tree/main/${category}?recursive=true`
  const entries = await fetchJson<TreeEntry[]>(url)
  const items: GalleryItem[] = []

  for (const entry of entries) {
    if (entry.type !== 'file' || !isImage(entry.path)) continue

    const relPath = entry.path
    const subcategory = category === 'replicas' ? relPath.split('/')[1] : undefined

    items.push({
      id: relPath,
      category,
      subcategory,
      imageUrl: imageUrl(relPath),
      thumbnailUrl: imageUrl(relPath),
      complexity: 'Low',
      description: descriptionForPhysical(category, relPath),
      tags: tagsForPhysical(category, relPath),
    })
  }

  return items
}

async function listSyntheticImages(): Promise<GalleryItem[]> {
  const csv = await fetchText(MANIFEST_URL)
  const lines = csv.trim().split('\n')
  const headers = parseCsvLine(lines[0])
  const items: GalleryItem[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? ''
    })

    const destinationPath = row.destination_path
    if (!destinationPath || !isImage(destinationPath)) continue

    const relPath = `synthetic/${destinationPath}`
    const arSet = row.ar_set
      ? row.ar_set.split('+').map((s) => s.trim()).filter(Boolean)
      : []
    const arCount = Number(row.ar_count) || arSet.length

    items.push({
      id: relPath,
      category: 'synthetic',
      subcategory: row.ac_top,
      imageUrl: imageUrl(relPath),
      thumbnailUrl: imageUrl(relPath),
      complexity: complexityFromArCount(arCount),
      description: descriptionForSynthetic(row.ac_top, row.ac_subtype, arSet),
      tags: tagsForSynthetic(row.ac_top, arSet, destinationPath),
      arSet,
      arCount,
    })
  }

  return items
}

async function main() {
  console.log('Building gallery index from Hugging Face...')

  const physical = (
    await Promise.all(PHYSICAL_CATEGORIES.map((c) => listImagesInCategory(c)))
  ).flat()
  const synthetic = await listSyntheticImages()
  const items = [...physical, ...synthetic]

  const index = {
    generatedAt: new Date().toISOString(),
    total: items.length,
    items,
  }

  await mkdir(dirname(OUT_PATH), { recursive: true })
  await writeFile(OUT_PATH, JSON.stringify(index))

  const counts = items.reduce(
    (acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  console.log(`Wrote ${items.length} items to public/gallery-index.json`)
  console.log('Counts:', counts)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
