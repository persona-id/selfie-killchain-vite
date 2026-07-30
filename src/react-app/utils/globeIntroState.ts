const STORAGE_KEY = 'persona-fas-globe-intro-seen'

/** Set true while testing the globe intro — shows on every refresh. */
export const GLOBE_INTRO_ALWAYS_SHOW = false

export function hasGlobeIntroPlayed(): boolean {
  if (GLOBE_INTRO_ALWAYS_SHOW) return false
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function markGlobeIntroPlayed(): void {
  if (GLOBE_INTRO_ALWAYS_SHOW) return
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    /* ignore */
  }
}
