let lastIntroSessionKey: string | null = null

export function hasDeconstructIntroPlayed(sessionKey: string) {
  return lastIntroSessionKey === sessionKey
}

export function markDeconstructIntroPlayed(sessionKey: string) {
  lastIntroSessionKey = sessionKey
}
