import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision'
import type { CameraControlSettings } from '../types/gallery'
import type { GlobeInteractionState } from './globeInteraction'
import { MIN_CAMERA_Z, MAX_CAMERA_Z } from './globe'

const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

const WRIST = 0
const THUMB_TIP = 4
const INDEX_TIP = 8
const MIDDLE_TIP = 12

const PINCH_SELECT_THRESHOLD = 0.055
const SELECT_COOLDOWN_MS = 550
const DOUBLE_PINCH_WINDOW_MS = 900
const DEPTH_ZOOM_GAIN = 9000

export type CameraPipelineStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'tracking'
  | 'error'

export type CameraGestureFrame = {
  cursorX: number
  cursorY: number
  pinching: boolean
  tracking: boolean
}

type PipelineOptions = {
  video: HTMLVideoElement
  state: GlobeInteractionState
  getSettings: () => CameraControlSettings
  getViewport: () => DOMRect
  onStatus?: (status: CameraPipelineStatus) => void
  onFrame?: (frame: CameraGestureFrame) => void
  onPinchSelect?: (x: number, y: number) => void
  onDoublePinch?: () => void
}

type Landmark = { x: number; y: number; z: number }

function lerp(current: number, target: number, alpha: number): number {
  return current + (target - current) * alpha
}

function smoothAlpha(smoothness: number): number {
  return Math.max(0.06, 1 - smoothness * 0.94)
}

type SmoothedGestureState = {
  cursorX: number
  cursorY: number
  deltaRotX: number
  deltaRotY: number
  cameraZ: number
}

function createSmoothedState(state: GlobeInteractionState): SmoothedGestureState {
  return {
    cursorX: 0,
    cursorY: 0,
    deltaRotX: 0,
    deltaRotY: 0,
    cameraZ: state.cameraDistance,
  }
}

function landmarkDistance(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function handSpan(landmarks: Landmark[]): number {
  const span2d = landmarkDistance(landmarks[WRIST], landmarks[MIDDLE_TIP])
  const index = landmarks[INDEX_TIP]
  return span2d - index.z * 0.35
}

function landmarkToScreen(
  landmark: Landmark,
  viewport: DOMRect,
): { x: number; y: number } {
  return {
    x: viewport.left + (1 - landmark.x) * viewport.width,
    y: viewport.top + landmark.y * viewport.height,
  }
}

function applyHandFrame(
  result: HandLandmarkerResult,
  state: GlobeInteractionState,
  settings: CameraControlSettings,
  viewport: DOMRect,
  depthBaseline: { span: number; cameraZ: number },
  pinchState: {
    wasPinching: boolean
    lastSelectAt: number
    lastPinchAt: number
    pinchCount: number
  },
  smoothed: SmoothedGestureState,
  onFrame?: (frame: CameraGestureFrame) => void,
  onPinchSelect?: (x: number, y: number) => void,
  onDoublePinch?: () => void,
): boolean {
  const landmarks = result.landmarks[0]
  if (!landmarks) return false

  const index = landmarks[INDEX_TIP]
  const thumb = landmarks[THUMB_TIP]
  const cursor = landmarkToScreen(index, viewport)
  const pinchDistance = landmarkDistance(thumb, index)
  const pinching = pinchDistance < PINCH_SELECT_THRESHOLD
  const pinchingJustStarted = pinching && !pinchState.wasPinching
  const alpha = smoothAlpha(settings.smoothness)

  smoothed.cursorX = lerp(smoothed.cursorX, cursor.x, alpha)
  smoothed.cursorY = lerp(smoothed.cursorY, cursor.y, alpha)

  onFrame?.({
    cursorX: smoothed.cursorX,
    cursorY: smoothed.cursorY,
    pinching,
    tracking: true,
  })

  if (pinchingJustStarted && onPinchSelect) {
    const now = performance.now()
    if (now - pinchState.lastSelectAt >= SELECT_COOLDOWN_MS) {
      onPinchSelect(smoothed.cursorX, smoothed.cursorY)
      pinchState.lastSelectAt = now
    }
  }

  if (!pinching && pinchState.wasPinching) {
    const now = performance.now()
    if (now - pinchState.lastPinchAt <= DOUBLE_PINCH_WINDOW_MS) {
      pinchState.pinchCount += 1
    } else {
      pinchState.pinchCount = 1
    }
    pinchState.lastPinchAt = now
    if (pinchState.pinchCount >= 2) {
      onDoublePinch?.()
      pinchState.pinchCount = 0
    }
  }

  pinchState.wasPinching = pinching

  if (!pinching) {
    const traverse = settings.traverseSensitivity
    const offsetX = (0.5 - index.x) * 2
    const offsetY = (index.y - 0.5) * 2

    const rawDeltaRotY = offsetX * 0.018 * traverse
    const rawDeltaRotX = offsetY * 0.014 * traverse

    smoothed.deltaRotY = lerp(smoothed.deltaRotY, rawDeltaRotY, alpha)
    smoothed.deltaRotX = lerp(smoothed.deltaRotX, rawDeltaRotX, alpha)

    state.rotationY += smoothed.deltaRotY
    state.rotationX = Math.max(
      -0.9,
      Math.min(0.9, state.rotationX + smoothed.deltaRotX),
    )
    state.velocityX = smoothed.deltaRotX * 0.3
    state.velocityY = smoothed.deltaRotY * 0.3

    const span = handSpan(landmarks)
    if (depthBaseline.span < 0) {
      depthBaseline.span = span
      depthBaseline.cameraZ = state.cameraDistance
      smoothed.cameraZ = state.cameraDistance
    } else {
      const spanDelta = span - depthBaseline.span
      const zoom = settings.zoomSensitivity
      const targetZ = Math.max(
        MIN_CAMERA_Z,
        Math.min(
          MAX_CAMERA_Z,
          depthBaseline.cameraZ - spanDelta * DEPTH_ZOOM_GAIN * zoom,
        ),
      )
      smoothed.cameraZ = lerp(smoothed.cameraZ, targetZ, alpha)
      state.targetCameraDistance = smoothed.cameraZ
    }
  }

  return true
}

export async function startCameraGesturePipeline(
  options: PipelineOptions,
): Promise<() => void> {
  const {
    video,
    state,
    getSettings,
    getViewport,
    onStatus,
    onFrame,
    onPinchSelect,
    onDoublePinch,
  } = options
  let running = true
  let landmarker: HandLandmarker | null = null
  let stream: MediaStream | null = null
  let rafId = 0
  const depthBaseline = { span: -1, cameraZ: state.cameraDistance }
  const pinchState = {
    wasPinching: false,
    lastSelectAt: 0,
    lastPinchAt: 0,
    pinchCount: 0,
  }
  const smoothed = createSmoothedState(state)

  onStatus?.('loading')

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    })
    video.srcObject = stream
    await video.play()

    const vision = await FilesetResolver.forVisionTasks(WASM_CDN)
    landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 1,
    })

    onStatus?.('ready')

    const tick = () => {
      if (!running || !landmarker || video.readyState < 2) {
        if (running) rafId = requestAnimationFrame(tick)
        return
      }

      const result = landmarker.detectForVideo(video, performance.now())
      const tracking = applyHandFrame(
        result,
        state,
        getSettings(),
        getViewport(),
        depthBaseline,
        pinchState,
        smoothed,
        onFrame,
        onPinchSelect,
        onDoublePinch,
      )

      if (tracking) {
        onStatus?.('tracking')
      } else {
        depthBaseline.span = -1
        pinchState.wasPinching = false
        pinchState.pinchCount = 0
        smoothed.deltaRotX = 0
        smoothed.deltaRotY = 0
        onFrame?.({ cursorX: 0, cursorY: 0, pinching: false, tracking: false })
        onStatus?.('ready')
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
  } catch {
    onStatus?.('error')
    running = false
  }

  return () => {
    running = false
    cancelAnimationFrame(rafId)
    landmarker?.close()
    if (stream) {
      for (const track of stream.getTracks()) track.stop()
    }
    video.srcObject = null
    onFrame?.({ cursorX: 0, cursorY: 0, pinching: false, tracking: false })
    onStatus?.('idle')
  }
}
