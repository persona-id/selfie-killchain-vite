import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'

import { runSequentialTypewriter } from './sequentialTypewriter'
import { toSentenceCase } from './taxonomy'

export type ClusterFocusPlaqueEntranceOptions = {
  blur?: boolean
  typewriter?: boolean
}

export function createClusterFocusPlaque(label: string, count: number): CSS3DObject {
  const displayLabel = toSentenceCase(label)
  const el = document.createElement('div')
  el.className = 'cluster-focus-plaque'
  el.setAttribute('aria-hidden', 'true')
  el.dataset.plaqueLabel = displayLabel

  const title = document.createElement('span')
  title.className = 'cluster-focus-plaque__title'
  title.textContent = displayLabel

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

function cancelPlaqueTypewriter(plaque: CSS3DObject): void {
  const cancel = plaque.userData.cancelPlaqueTypewriter as (() => void) | undefined
  cancel?.()
  plaque.userData.cancelPlaqueTypewriter = undefined
}

function revealPlaqueMeta(plaque: CSS3DObject): void {
  const el = plaque.element as HTMLDivElement
  const meta = el.querySelector('.cluster-focus-plaque__meta')
  const dot = el.querySelector('.cluster-focus-plaque__dot')
  meta?.classList.remove('cluster-focus-plaque__meta--hidden')
  dot?.classList.remove('cluster-focus-plaque__dot--hidden')
  dot?.classList.add('cluster-focus-plaque__dot--revealed')
}

function showPlaqueImmediately(plaque: CSS3DObject): void {
  const el = plaque.element as HTMLDivElement
  const title = el.querySelector('.cluster-focus-plaque__title')
  const fullTitle = el.dataset.plaqueLabel ?? title?.textContent ?? ''
  if (title) title.textContent = fullTitle
  revealPlaqueMeta(plaque)
}

function startPlaqueTypewriter(plaque: CSS3DObject): void {
  const el = plaque.element as HTMLDivElement
  const title = el.querySelector('.cluster-focus-plaque__title')
  const fullTitle = el.dataset.plaqueLabel ?? title?.textContent ?? ''
  const meta = el.querySelector('.cluster-focus-plaque__meta')
  const dot = el.querySelector('.cluster-focus-plaque__dot')

  if (title) title.textContent = ''
  meta?.classList.add('cluster-focus-plaque__meta--hidden')
  dot?.classList.remove('cluster-focus-plaque__dot--revealed')
  dot?.classList.add('cluster-focus-plaque__dot--hidden')

  cancelPlaqueTypewriter(plaque)

  if (!fullTitle) {
    revealPlaqueMeta(plaque)
    return
  }

  plaque.userData.cancelPlaqueTypewriter = runSequentialTypewriter(
    [fullTitle],
    (_lineIndex, value) => {
      if (title) title.textContent = value
    },
    () => {
      plaque.userData.cancelPlaqueTypewriter = undefined
      revealPlaqueMeta(plaque)
    },
  )
}

export function playClusterFocusPlaqueEntrance(
  plaque: CSS3DObject,
  options: ClusterFocusPlaqueEntranceOptions | boolean = true,
): void {
  const resolved =
    typeof options === 'boolean'
      ? { blur: options, typewriter: options }
      : {
          blur: options.blur ?? true,
          typewriter: options.typewriter ?? true,
        }

  const el = plaque.element as HTMLDivElement
  el.classList.remove('cluster-focus-plaque--exit')
  cancelPlaqueTypewriter(plaque)

  if (!resolved.blur && !resolved.typewriter) {
    el.classList.remove('cluster-focus-plaque--entering')
    el.classList.add('cluster-focus-plaque--visible')
    showPlaqueImmediately(plaque)
    return
  }

  if (!resolved.typewriter) {
    showPlaqueImmediately(plaque)
  } else {
    startPlaqueTypewriter(plaque)
  }

  if (!resolved.blur) {
    el.classList.remove('cluster-focus-plaque--entering')
    el.classList.add('cluster-focus-plaque--visible')
    return
  }

  el.classList.remove('cluster-focus-plaque--visible')
  el.classList.add('cluster-focus-plaque--entering')

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.classList.add('cluster-focus-plaque--visible')
    })
  })
}

export function updateClusterFocusPlaque(
  plaque: CSS3DObject,
  label: string,
  count: number,
): void {
  const el = plaque.element as HTMLDivElement
  el.dataset.plaqueLabel = toSentenceCase(label)
  const title = el.querySelector('.cluster-focus-plaque__title')
  const countEl = el.querySelector('.cluster-focus-plaque__count')
  if (title) title.textContent = toSentenceCase(label)
  if (countEl) countEl.textContent = String(count)
}
