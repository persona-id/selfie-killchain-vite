import { useEffect, useState } from 'react'

import { CHROME_ENTRANCE_DELAY_S } from '../constants/shellMotion'

function chromeEntranceDelayMs(resetKey: string): number {
  if (resetKey.startsWith('reveal-') || resetKey.startsWith('post-intro-')) {
    return 0
  }
  return CHROME_ENTRANCE_DELAY_S * 1000
}

export function useChromeEntranceReady(resetKey = 'default') {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(false)
    const timer = window.setTimeout(
      () => setReady(true),
      chromeEntranceDelayMs(resetKey),
    )
    return () => window.clearTimeout(timer)
  }, [resetKey])

  return ready
}
