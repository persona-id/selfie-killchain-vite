import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { IMAGE_BLUR_IN_MIN_MS } from '../lib/imageBlurIn'

type BlurInImageProps = {
  src?: string | null
  alt: string
  className?: string
  loading?: 'eager' | 'lazy'
  fetchPriority?: 'high' | 'low' | 'auto'
  minBlurMs?: number
}

function isImageAvailable(img: HTMLImageElement | null): boolean {
  return Boolean(img?.complete && img.naturalWidth > 0)
}

export function BlurInImage({
  src,
  alt,
  className = '',
  loading = 'lazy',
  fetchPriority = 'auto',
  minBlurMs,
}: BlurInImageProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const createdAtRef = useRef(performance.now())
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)

  useLayoutEffect(() => {
    if (!src) {
      setIsLoading(true)
      setIsReady(false)
      return
    }

    if (isImageAvailable(imgRef.current)) {
      setIsReady(true)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setIsReady(false)
  }, [src])

  useEffect(() => {
    if (!src) return

    const img = imgRef.current
    if (!img || isImageAvailable(img)) return

    createdAtRef.current = performance.now()
    let timeoutId = 0

    const onAvailable = () => {
      setIsReady(true)
      const blurBudget = minBlurMs ?? IMAGE_BLUR_IN_MIN_MS
      const elapsed = performance.now() - createdAtRef.current
      const wait = Math.max(0, blurBudget - elapsed)
      timeoutId = window.setTimeout(() => setIsLoading(false), wait)
    }

    img.addEventListener('load', onAvailable, { once: true })
    img.addEventListener('error', onAvailable, { once: true })

    return () => {
      img.removeEventListener('load', onAvailable)
      img.removeEventListener('error', onAvailable)
      window.clearTimeout(timeoutId)
    }
  }, [minBlurMs, src])

  return (
    <span className={['blur-in-img-frame', className].filter(Boolean).join(' ')}>
      {src ? (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          draggable={false}
          {...(fetchPriority !== 'auto' ? { fetchPriority } : {})}
          className={[
            'blur-in-img',
            isLoading ? 'is-loading' : '',
            isReady ? 'is-ready' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      ) : null}
    </span>
  )
}
