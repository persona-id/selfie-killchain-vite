import * as THREE from 'three'
import type { GlobeAnimation } from '../types/gallery'
import { ANIMATION_PRESETS } from './globe'

const _offset = new THREE.Vector3()
const _animated = new THREE.Vector3()
const _yAxis = new THREE.Vector3(0, 1, 0)
const _xAxis = new THREE.Vector3(1, 0, 0)

function hashPhase(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return (hash % 628) / 100
}

export function imageFlutterOffset(
  id: string,
  time: number,
  intensity: number,
  animation: GlobeAnimation,
): THREE.Vector3 {
  if (intensity <= 0) return _offset.set(0, 0, 0)

  const preset = ANIMATION_PRESETS[animation]
  const phase = hashPhase(id)
  const amp = 5.5 * intensity * (preset.wobble ? (preset.wobbleAmplitude ?? 0.15) : 0.12)
  const speed = preset.wobbleSpeed ?? 0.0012
  const spin = preset.autoRotateY * 400

  return _offset.set(
    Math.sin(time * speed + phase) * amp + Math.cos(time * speed * 0.45 + phase) * amp * 0.35,
    Math.cos(time * speed * 0.85 + phase * 1.4) * amp * 0.75,
    Math.sin(time * speed * 0.62 + phase * 0.8 + spin) * amp * 0.45,
  )
}

export function animateClusterImageLocal(
  baseLocal: THREE.Vector3,
  itemId: string,
  timeMs: number,
  animation: GlobeAnimation,
  flutterIntensity: number,
  clusterIndex = 0,
  speed = 1,
): THREE.Vector3 {
  const preset = ANIMATION_PRESETS[animation]
  const phase = hashPhase(itemId)
  const hubPhase = clusterIndex * 0.85
  const t = timeMs * 0.001 * Math.max(speed, 0)
  const radius = Math.max(baseLocal.length(), 1)

  let spinY = 0
  let tiltX = 0

  if (animation !== 'static') {
    spinY = t * (preset.autoRotateY * 28 + 0.12) + hubPhase
    if (preset.wobble) {
      const amp = preset.wobbleAmplitude ?? 0.15
      const wobbleSpeed = (preset.wobbleSpeed ?? 0.0008) * 1400
      tiltX = Math.sin(t * wobbleSpeed + phase) * amp * 0.55
    } else {
      tiltX = Math.sin(t * 0.85 + phase) * preset.autoRotateX * 22
    }
  }

  _animated.copy(baseLocal)
  _animated.applyAxisAngle(_yAxis, spinY)
  _animated.applyAxisAngle(_xAxis, tiltX)

  if (flutterIntensity > 0) {
    const flutter = imageFlutterOffset(itemId, t * 48, flutterIntensity, animation)
    _animated.x += flutter.x * radius * 0.06
    _animated.y += flutter.y * radius * 0.06
    _animated.z += flutter.z * radius * 0.045
  }

  return _animated.clone()
}

/** @deprecated Use animateClusterImageLocal */
export const animateChainImageLocal = animateClusterImageLocal
