import { useEffect, useState } from 'react'

const CHAR_DELAY_MS = 24

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function useSequentialTypewriter(lines: readonly string[], active: boolean) {
  const [values, setValues] = useState<string[]>(() => lines.map(() => ''))
  const [lineIndex, setLineIndex] = useState(0)
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    if (!active) {
      setValues(lines.map(() => ''))
      setLineIndex(0)
      setComplete(false)
      return
    }

    if (prefersReducedMotion()) {
      setValues([...lines])
      setLineIndex(lines.length)
      setComplete(true)
      return
    }

    setValues(lines.map(() => ''))
    setLineIndex(0)
    setComplete(false)

    let currentLine = 0
    let charIndex = 0

    const timer = window.setInterval(() => {
      const line = lines[currentLine]
      if (!line) {
        window.clearInterval(timer)
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
        if (currentLine >= lines.length) {
          window.clearInterval(timer)
          setLineIndex(lines.length)
          setComplete(true)
        }
      }
    }, CHAR_DELAY_MS)

    return () => window.clearInterval(timer)
  }, [active, lines])

  return { values, lineIndex, complete }
}
