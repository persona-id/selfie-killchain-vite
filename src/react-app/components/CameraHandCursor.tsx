type CameraHandCursorProps = {
  x: number
  y: number
  pinching?: boolean
  clickable?: boolean
  visible: boolean
}

export function CameraHandCursor({
  x,
  y,
  pinching = false,
  clickable = false,
  visible,
}: CameraHandCursorProps) {
  if (!visible) return null

  const size = pinching ? 7 : 11
  const scale = clickable ? 1.6 : 1

  return (
    <div
      className="pointer-events-none fixed z-[10000] rounded-full bg-white transition-transform duration-300 ease-in-out"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        transform: `translate(-50%, -50%) scale(${scale})`,
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.216)',
      }}
      aria-hidden
    />
  )
}
