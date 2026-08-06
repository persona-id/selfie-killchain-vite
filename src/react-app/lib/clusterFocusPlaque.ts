import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'

export function createClusterFocusPlaque(label: string, count: number): CSS3DObject {
  const el = document.createElement('div')
  el.className = 'cluster-focus-plaque'
  el.setAttribute('aria-hidden', 'true')

  const title = document.createElement('span')
  title.className = 'cluster-focus-plaque__title'
  title.textContent = label.toUpperCase()

  const meta = document.createElement('span')
  meta.className = 'cluster-focus-plaque__meta'

  const countEl = document.createElement('span')
  countEl.className = 'cluster-focus-plaque__count'
  countEl.textContent = String(count)

  const dot = document.createElement('span')
  dot.className = 'cluster-focus-plaque__dot'
  dot.setAttribute('aria-hidden', 'true')

  meta.append(countEl, dot)
  el.append(title, meta)

  const plaque = new CSS3DObject(el)
  plaque.position.set(0, 0, 0)
  plaque.userData.isClusterFocusPlaque = true
  return plaque
}

export function updateClusterFocusPlaque(
  plaque: CSS3DObject,
  label: string,
  count: number,
): void {
  const el = plaque.element as HTMLDivElement
  const title = el.querySelector('.cluster-focus-plaque__title')
  const countEl = el.querySelector('.cluster-focus-plaque__count')
  if (title) title.textContent = label.toUpperCase()
  if (countEl) countEl.textContent = String(count)
}
