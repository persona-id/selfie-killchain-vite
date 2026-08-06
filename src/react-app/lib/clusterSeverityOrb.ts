import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
import type { Complexity, SeverityOrbAnimation } from '../types/gallery'
import type { GalleryItem } from '../types/gallery'

const COMPLEXITY_RANK: Record<Complexity, number> = {
  Low: 0,
  Moderate: 1,
  High: 2,
}

export function dominantClusterComplexity(items: GalleryItem[]): Complexity {
  if (items.length === 0) return 'Low'

  let dominant: Complexity = items[0].complexity
  for (let i = 1; i < items.length; i++) {
    if (COMPLEXITY_RANK[items[i].complexity] > COMPLEXITY_RANK[dominant]) {
      dominant = items[i].complexity
    }
  }
  return dominant
}

export function createSeverityOrb(
  complexity: Complexity,
  animation: SeverityOrbAnimation,
): CSS3DObject {
  const el = document.createElement('div')
  el.className = `cluster-severity-orb cluster-severity-orb--${complexity.toLowerCase()} cluster-severity-orb--${animation}`
  el.setAttribute('aria-hidden', 'true')

  const orb = new CSS3DObject(el)
  orb.position.set(0, 0, 0)
  orb.userData.isSeverityOrb = true
  orb.userData.complexity = complexity
  orb.userData.animation = animation
  return orb
}

export function updateSeverityOrb(
  orb: CSS3DObject,
  timeMs: number,
  animation: SeverityOrbAnimation,
  speed: number,
): void {
  const el = orb.element as HTMLDivElement
  const t = timeMs * 0.001 * Math.max(speed, 0)
  const phase = (orb.userData.orbPhase as number) ?? 0

  let scale = 1
  let opacity = 0.82

  switch (animation) {
    case 'pulse':
      scale = 0.9 + Math.sin(t * 2.4 + phase) * 0.12
      opacity = 0.75 + Math.sin(t * 2.4 + phase) * 0.18
      break
    case 'breathe':
      scale = 0.92 + Math.sin(t * 1.1 + phase) * 0.08
      opacity = 0.8 + Math.sin(t * 1.1 + phase) * 0.1
      break
    case 'glow':
      scale = 1
      opacity = 0.72 + Math.sin(t * 1.8 + phase) * 0.22
      break
    case 'static':
      scale = 1
      opacity = 0.88
      break
  }

  el.style.filter = 'none'

  orb.scale.setScalar(scale)
  el.style.opacity = String(opacity)
}
