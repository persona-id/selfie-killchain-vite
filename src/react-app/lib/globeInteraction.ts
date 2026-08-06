import { MIN_CAMERA_Z, MAX_CAMERA_Z } from './globe'

export type GlobeInteractionState = {
  rotationX: number
  rotationY: number
  rotationZ: number
  cameraDistance: number
  targetCameraDistance: number
  velocityX: number
  velocityY: number
  dragActive: boolean
}

export function createGlobeInteractionState(
  defaultCameraZ: number,
  initialRotationX = -0.12,
): GlobeInteractionState {
  return {
    rotationX: initialRotationX,
    rotationY: 0,
    rotationZ: 0,
    cameraDistance: defaultCameraZ,
    targetCameraDistance: defaultCameraZ,
    velocityX: 0,
    velocityY: 0,
    dragActive: false,
  }
}

type InteractionConfig = {
  getDragSensitivity: () => number
  minCameraZ?: number
  maxCameraZ?: number
  getZoomLimits?: () => { min: number; max: number }
  wheelZoomDirection?: 1 | -1
  onBackgroundPointerDown?: () => void
  onDragChange?: (active: boolean) => void
}

function pinchDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

export function attachGlobeInteraction(
  element: HTMLElement,
  state: GlobeInteractionState,
  config: InteractionConfig,
): () => void {
  element.style.touchAction = 'none'
  element.style.cursor = 'none'

  const pointers = new Map<number, { x: number; y: number }>()
  let pinchStartDistance = 0
  let pinchStartCameraZ = state.cameraDistance
  let singleDragPointerId: number | null = null
  let lastX = 0
  let lastY = 0

  const setDragActive = (active: boolean) => {
    if (state.dragActive === active) return
    state.dragActive = active
    config.onDragChange?.(active)
  }

  const applySinglePointerDrag = (clientX: number, clientY: number) => {
    const sensitivity = config.getDragSensitivity()
    const dx = clientX - lastX
    const dy = clientY - lastY
    state.velocityY = dx * sensitivity
    state.velocityX = dy * sensitivity
    state.rotationY += dx * sensitivity
    state.rotationX = Math.max(-0.9, Math.min(0.9, state.rotationX + dy * sensitivity))
    lastX = clientX
    lastY = clientY
  }

  const onPointerDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('.globe-photo')) return

    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    config.onBackgroundPointerDown?.()

    if (pointers.size === 1) {
      singleDragPointerId = e.pointerId
      setDragActive(true)
      lastX = e.clientX
      lastY = e.clientY
      state.velocityX = 0
      state.velocityY = 0
      element.setPointerCapture(e.pointerId)
    } else if (pointers.size === 2) {
      setDragActive(false)
      singleDragPointerId = null
      const pts = [...pointers.values()]
      pinchStartDistance = pinchDistance(pts[0], pts[1])
      pinchStartCameraZ = state.cameraDistance
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.size >= 2) {
      const pts = [...pointers.values()]
      const distance = pinchDistance(pts[0], pts[1])
      if (pinchStartDistance > 0) {
        const { min, max } = getZoomLimits()
        const scale = pinchStartDistance / distance
        const nextZ = Math.max(
          min,
          Math.min(max, pinchStartCameraZ * scale),
        )
        state.cameraDistance = nextZ
        state.targetCameraDistance = nextZ
      }
      return
    }

    if (state.dragActive && e.pointerId === singleDragPointerId) {
      applySinglePointerDrag(e.clientX, e.clientY)
    }
  }

  const endPointer = (e: PointerEvent) => {
    pointers.delete(e.pointerId)
    if (element.hasPointerCapture(e.pointerId)) {
      element.releasePointerCapture(e.pointerId)
    }

    if (pointers.size < 2) {
      pinchStartDistance = 0
    }

    if (pointers.size === 1) {
      const remaining = pointers.entries().next().value as [number, { x: number; y: number }]
      singleDragPointerId = remaining[0]
      setDragActive(true)
      lastX = remaining[1].x
      lastY = remaining[1].y
      element.setPointerCapture(singleDragPointerId)
    } else {
      singleDragPointerId = null
      setDragActive(false)
    }
  }

  const minCameraZ = config.minCameraZ ?? MIN_CAMERA_Z
  const maxCameraZ = config.maxCameraZ ?? MAX_CAMERA_Z
  const getZoomLimits = () => config.getZoomLimits?.() ?? { min: minCameraZ, max: maxCameraZ }
  const wheelZoomDirection = config.wheelZoomDirection ?? 1

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const { min, max } = getZoomLimits()
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
    state.targetCameraDistance = Math.max(
      min,
      Math.min(max, state.targetCameraDistance + delta * 0.65 * wheelZoomDirection),
    )
    state.cameraDistance = state.targetCameraDistance
  }

  element.addEventListener('wheel', onWheel, { passive: false })
  element.addEventListener('pointerdown', onPointerDown)
  element.addEventListener('pointermove', onPointerMove)
  element.addEventListener('pointerup', endPointer)
  element.addEventListener('pointercancel', endPointer)
  element.addEventListener('pointerleave', endPointer)

  return () => {
    setDragActive(false)
    element.removeEventListener('wheel', onWheel)
    element.removeEventListener('pointerdown', onPointerDown)
    element.removeEventListener('pointermove', onPointerMove)
    element.removeEventListener('pointerup', endPointer)
    element.removeEventListener('pointercancel', endPointer)
    element.removeEventListener('pointerleave', endPointer)
    element.style.cursor = 'none'
    element.style.touchAction = ''
  }
}
