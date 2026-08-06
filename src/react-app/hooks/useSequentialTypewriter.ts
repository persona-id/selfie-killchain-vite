import { useEffect, useState } from 'react'

const CHAR_DELAY_MS = 22

export function useSequentialTypewriter(lines: readonly string[], active: boolean) {
  const linesKey = lines.join('\u0000')
  const [values, setValues] = useState<string[]>(() => lines.map(() => ''))

  useEffect(() => {
    const lineTexts = linesKey.split('\u0000')

    if (!active) {
      setValues(lineTexts.map(() => ''))
      return
    }

    setValues(lineTexts.map(() => ''))

    let currentLine = 0
    let charIndex = 0
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const tick = () => {
      if (cancelled) return

      const line = lineTexts[currentLine]
      if (!line) return

      charIndex += 1
      const nextValue = line.slice(0, charIndex)
      setValues((prev) => {
        const next = [...prev]
        next[currentLine] = nextValue
        return next
      })

      if (charIndex >= line.length) {
        currentLine += 1
        charIndex = 0
        if (currentLine >= lineTexts.length) return
      }

      timeoutId = window.setTimeout(tick, CHAR_DELAY_MS)
    }

    timeoutId = window.setTimeout(tick, CHAR_DELAY_MS)

    return () => {
      cancelled = true
      if (timeoutId !== null) window.clearTimeout(timeoutId)
    }
  }, [active, linesKey])

  return values
}
