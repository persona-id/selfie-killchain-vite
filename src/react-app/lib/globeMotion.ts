import * as THREE from 'three'
import type { GlobeAnimation } from '../types/gallery'
import { ANIMATION_PRESETS } from './globe'

const _offset = new THREE.Vector3()

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
