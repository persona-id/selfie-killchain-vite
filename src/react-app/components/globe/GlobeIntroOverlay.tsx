import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import {
  GLOBE_INTRO_AUTO_DURATION_MS,
  clamp01,
  easeInOutCubic,
  easeOutCubic,
  globeIntroLine1InProgress,
  globeIntroLine1OutProgress,
  globeIntroLine2InProgress,
  globeIntroLine2OutProgress,
  introZoomTimelineComplete,
} from '../../utils/globeIntro'
import { CHROME_MENU_REVEAL_MS } from '../../constants/shellMotion'

import './GlobeIntro.css'

const LINE1 = 'This model represents real time fraud'
const LINE2 =
  'This taxonomy is built to showcase the ways in which attackers fraudulently bypass verification'

type GlobeIntroOverlayProps = {
  onProgress: (progress: number) => void
  onComplete: () => void
  onSkip: () => void
  onGlobeReady?: () => void
  introGlobeReadyRef?: React.MutableRefObject<boolean>
}

function lineStrength(inP: number, outP: number): number {
  const visible = easeOutCubic(clamp01(inP))
  const hidden = easeInOutCubic(clamp01(outP))
  return visible * (1 - hidden)
}

function applyLineStyle(el: HTMLElement | null, strength: number) {
  if (!el) return
  const t = clamp01(strength)
  const motion = 1 - t
  el.style.opacity = String(t)
  el.style.filter = `blur(${9 * motion}px)`
  el.style.transform = `translate3d(0, ${12 * motion}px, 0)`
}

export function GlobeIntroOverlay({
  onProgress,
  onComplete,
  onSkip,
  onGlobeReady,
  introGlobeReadyRef,
}: GlobeIntroOverlayProps) {
  const [chromeRevealing, setChromeRevealing] = useState(false)
  const [completed, setCompleted] = useState(false)
  const progressRef = useRef(0)
  const completedRef = useRef(false)
  const chromeRevealStartedRef = useRef(false)
  const completeTimeoutRef = useRef<number | null>(null)
  const autoStartRef = useRef(performance.now())
  const line1Ref = useRef<HTMLParagraphElement>(null)
  const line2Ref = useRef<HTMLParagraphElement>(null)

  const updateIntroLines = useCallback((introProgress: number) => {
    const line1 = lineStrength(
      globeIntroLine1InProgress(introProgress),
      globeIntroLine1OutProgress(introProgress),
    )
    const line2 = lineStrength(
      globeIntroLine2InProgress(introProgress),
      globeIntroLine2OutProgress(introProgress),
    )
    applyLineStyle(line1Ref.current, line1)
    applyLineStyle(line2Ref.current, line2)
  }, [])

  const reportProgress = useCallback(
    (next: number) => {
      const clamped = clamp01(next)
      progressRef.current = clamped
      updateIntroLines(clamped)
      onProgress(clamped)
    },
    [onProgress, updateIntroLines],
  )

  const tryCompleteIntro = useCallback(() => {
    if (completedRef.current) return
    const zoomReady = introZoomTimelineComplete(progressRef.current)
    const globeReady = introGlobeReadyRef?.current ?? false
    if (!zoomReady || !globeReady) return

    if (!chromeRevealStartedRef.current) {
      chromeRevealStartedRef.current = true
      setChromeRevealing(true)
      onGlobeReady?.()
      completeTimeoutRef.current = window.setTimeout(() => {
        completedRef.current = true
        setCompleted(true)
        onProgress(1)
        updateIntroLines(1)
        onComplete()
      }, CHROME_MENU_REVEAL_MS)
    }
  }, [introGlobeReadyRef, onComplete, onGlobeReady, onProgress, updateIntroLines])

  useEffect(
    () => () => {
      if (completeTimeoutRef.current !== null) {
        window.clearTimeout(completeTimeoutRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    let frameId = 0
    const tick = () => {
      updateIntroLines(progressRef.current)
      tryCompleteIntro()
      frameId = window.requestAnimationFrame(tick)
    }
    frameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameId)
  }, [tryCompleteIntro, updateIntroLines])

  useEffect(() => {
    updateIntroLines(0)
  }, [updateIntroLines])

  useEffect(() => {
    autoStartRef.current = performance.now()
    let frameId = 0

    const tick = (now: number) => {
      const autoProgress = clamp01(
        (now - autoStartRef.current) / GLOBE_INTRO_AUTO_DURATION_MS,
      )
      if (autoProgress > progressRef.current) {
        reportProgress(autoProgress)
      }
      if (progressRef.current < 1) {
        frameId = window.requestAnimationFrame(tick)
      }
    }

    frameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameId)
  }, [reportProgress])

  const overlay = (
    <div
      className="globe-intro"
      style={{
        pointerEvents: completed ? 'none' : 'auto',
        opacity: chromeRevealing ? 0 : 1,
        transition: 'opacity 0.85s ease',
      }}
      aria-hidden={completed}
    >
      <div className="globe-intro__copy">
        <p ref={line1Ref} className="globe-intro__line">
          {LINE1}
        </p>
        <p ref={line2Ref} className="globe-intro__line globe-intro__line--second">
          {LINE2}
        </p>
      </div>

      <button type="button" className="globe-intro__skip" onClick={onSkip}>
        Skip intro
      </button>
    </div>
  )

  return createPortal(overlay, document.body)
}
