export function isGlobeClickableTarget(target: Element | null): boolean {
  if (!target) return false
  const el = target as HTMLElement
  if (el.closest('.globe-photo')) return true
  if (el.closest('button, a, [role="button"], label, input, select, textarea')) {
    return true
  }
  return false
}
