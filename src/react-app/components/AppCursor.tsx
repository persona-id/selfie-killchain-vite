import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useGalleryOptional } from '../context/GalleryContext'
import { isGlobeClickableTarget } from '../lib/clickableTarget'
import { CameraHandCursor } from './CameraHandCursor'

export type CameraCursorState = {
  visible: boolean
  x: number
  y: number
  pinching: boolean
  clickable: boolean
}

type AppCursorContextValue = {
  setCameraCursor: (state: CameraCursorState) => void
  setGlobeDragging: (dragging: boolean) => void
}

const AppCursorContext = createContext<AppCursorContextValue | null>(null)

export function useAppCursor() {
  const ctx = useContext(AppCursorContext)
  if (!ctx) {
    throw new Error('useAppCursor must be used within AppCursorProvider')
  }
  return ctx
}

export function AppCursorProvider({ children }: { children: ReactNode }) {
  const gallery = useGalleryOptional()
  const cameraControls = gallery?.cameraControls ?? { enabled: false }
  const [pointer, setPointer] = useState({
    visible: false,
    x: 0,
    y: 0,
    clickable: false,
  })
  const [camera, setCamera] = useState<CameraCursorState>({
    visible: false,
    x: 0,
    y: 0,
    pinching: false,
    clickable: false,
  })
  const [globeDragging, setGlobeDragging] = useState(false)

  useEffect(() => {
    const updatePointer = (e: PointerEvent) => {
      setPointer({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        clickable: isGlobeClickableTarget(
          document.elementFromPoint(e.clientX, e.clientY),
        ),
      })
    }

    window.addEventListener('pointerdown', updatePointer, { capture: true })
    window.addEventListener('pointermove', updatePointer, {
      capture: true,
      passive: true,
    })

    return () => {
      window.removeEventListener('pointerdown', updatePointer, { capture: true })
      window.removeEventListener('pointermove', updatePointer, { capture: true })
    }
  }, [])

  const useCamera = cameraControls.enabled && camera.visible
  const enlarged =
    (useCamera ? camera.clickable : pointer.clickable) || globeDragging

  return (
    <AppCursorContext.Provider value={{ setCameraCursor: setCamera, setGlobeDragging }}>
      {children}
      <CameraHandCursor
        x={useCamera ? camera.x : pointer.x}
        y={useCamera ? camera.y : pointer.y}
        pinching={useCamera ? camera.pinching : false}
        clickable={enlarged}
        visible={useCamera ? true : pointer.visible}
      />
    </AppCursorContext.Provider>
  )
}
