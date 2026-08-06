import { useEffect, useState } from 'react'

const CHAR_DELAY_MS = 28

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function useSequentialTypewriter(lines: readonly string[], active: boolean) {
  const linesKey = lines.join('\u0000')
  const [values, setValues] = useState<string[]>(() => lines.map(() => ''))
  const [lineIndex, setLineIndex] = useState(0)
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    const lineTexts = linesKey.split('\u0000')

    if (!active) {
      setValues(lineTexts.map(() => ''))
      setLineIndex(0)
      setComplete(false)
      return
    }

    if (prefersReducedMotion()) {
      setValues([...lineTexts])
      setLineIndex(lineTexts.length)
      setComplete(true)
      return
    }

    setValues(lineTexts.map(() => ''))
    setLineIndex(0)
    setComplete(false)

    let currentLine = 0
    let charIndex = 0
    let cancelled = false

    const tick = () => {
      if (cancelled) return

      const line = lineTexts[currentLine]
      if (!line) {
        setComplete(true)
        return
      }

      charIndex += 1
      const nextValue = line.slice(0, charIndex)
      setValues((prev) => {
        const next = [...prev]
        next[currentLine] = nextValue
        return next
      })
      setLineIndex(currentLine)

      if (charIndex >= line.length) {
        currentLine += 1
        charIndex = 0
        if (currentLine >= lineTexts.length) {
          setLineIndex(lineTexts.length)
          setComplete(true)
          return
        }
      }

      window.setTimeout(tick, CHAR_DELAY_MS)
    }

    const starter = window.setTimeout(tick, CHAR_DELAY_MS)
    return () => {
      cancelled = true
      window.clearTimeout(starter)
    }
  }, [active, linesKey])

  return { values, lineIndex, complete }
}
