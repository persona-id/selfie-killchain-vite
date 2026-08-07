import { useEffect, useState } from 'react'

import {
  runSequentialTypewriter,
  SEQUENTIAL_TYPEWRITER_CHAR_DELAY_MS,
} from '../lib/sequentialTypewriter'

const CHAR_DELAY_MS = SEQUENTIAL_TYPEWRITER_CHAR_DELAY_MS

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

    const cancel = runSequentialTypewriter(lineTexts, (lineIndex, value) => {
      setValues((prev) => {
        const next = [...prev]
        next[lineIndex] = value
        return next
      })
    })

    return cancel
  }, [active, linesKey])

  return values
}

export { CHAR_DELAY_MS }
