export const SEQUENTIAL_TYPEWRITER_CHAR_DELAY_MS = 22

export function runSequentialTypewriter(
  lines: readonly string[],
  onUpdate: (lineIndex: number, value: string) => void,
  onComplete?: () => void,
): () => void {
  let currentLine = 0
  let charIndex = 0
  let cancelled = false
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const tick = () => {
    if (cancelled) return

    const line = lines[currentLine]
    if (!line) {
      onComplete?.()
      return
    }

    charIndex += 1
    onUpdate(currentLine, line.slice(0, charIndex))

    if (charIndex >= line.length) {
      currentLine += 1
      charIndex = 0
      if (currentLine >= lines.length) {
        onComplete?.()
        return
      }
    }

    timeoutId = window.setTimeout(tick, SEQUENTIAL_TYPEWRITER_CHAR_DELAY_MS)
  }

  timeoutId = window.setTimeout(tick, SEQUENTIAL_TYPEWRITER_CHAR_DELAY_MS)

  return () => {
    cancelled = true
    if (timeoutId !== null) window.clearTimeout(timeoutId)
  }
}
