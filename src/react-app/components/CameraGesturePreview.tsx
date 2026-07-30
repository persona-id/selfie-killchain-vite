import type { RefObject } from 'react'
import type { CameraPipelineStatus } from '../lib/cameraGesturePipeline'

const STATUS_LABEL: Record<CameraPipelineStatus, string> = {
  idle: 'Off',
  loading: 'Starting camera…',
  ready: 'Hand ready',
  tracking: 'Tracking hand',
  error: 'Camera unavailable',
}

type CameraGesturePreviewProps = {
  videoRef: RefObject<HTMLVideoElement | null>
  status: CameraPipelineStatus
  visible: boolean
}

export function CameraGesturePreview({
  videoRef,
  status,
  visible,
}: CameraGesturePreviewProps) {
  if (!visible) return null

  return (
    <div className="pointer-events-none fixed right-5 bottom-20 z-40 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-900/90 shadow-xl">
      <video
        ref={videoRef}
        className="block h-28 w-40 -scale-x-100 object-cover"
        playsInline
        muted
        aria-hidden
      />
      <p className="px-2 py-1.5 text-center text-[10px] text-neutral-300">
        {STATUS_LABEL[status]}
      </p>
    </div>
  )
}
