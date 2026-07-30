import { useMemo, useState } from 'react'

import { useGallery } from '../context/GalleryContext'

const SITE_VERSION = '1.001'
const SITE_TITLE = 'SELFIE.lib'

function formatAccessStamp(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)
  const hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return `${month}.${day}.${year} — ${hour12}:${minutes} ${meridiem}`
}

export function useSiteMetadata() {
  const { filteredItems } = useGallery()
  const [accessedAt] = useState(() => new Date())

  const networkLoad = useMemo(() => {
    const total = Math.max(filteredItems.length, 1)
    return Math.min(1, total / 1200)
  }, [filteredItems.length])

  const hfChanges = useMemo(() => {
    const minutesSinceAccess = (Date.now() - accessedAt.getTime()) / 60000
    return Math.max(1, Math.round(8 + minutesSinceAccess * 0.35))
  }, [accessedAt])

  return {
    siteTitle: SITE_TITLE,
    version: SITE_VERSION,
    accessedAt,
    accessStamp: formatAccessStamp(accessedAt),
    hfChanges,
    imagesLoaded: filteredItems.length,
    networkLoad,
  }
}
