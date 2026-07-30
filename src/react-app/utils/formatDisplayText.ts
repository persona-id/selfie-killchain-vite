export function ensureTrailingPeriod(text: string): string {
  const trimmed = text.trimEnd()
  if (!trimmed) return trimmed
  if (/[.!?]$/.test(trimmed)) return trimmed
  return `${trimmed}.`
}

export function formatDisplayDescription(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''

  const withPeriod = `${trimmed.replace(/[.!?]+$/, '').trimEnd()}.`
  const words = withPeriod.split(/\s+/)
  if (words.length < 2) return withPeriod

  const last = words.pop()!
  const secondLast = words.pop()!
  words.push(`${secondLast}\u00A0${last}`)
  return words.join(' ')
}
