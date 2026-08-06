import * as THREE from 'three'
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
import type { FraudAxisLabelStyle } from '../types/gallery'

export function fraudAxisLabelText(
  medium: 'digital' | 'physical',
  style: FraudAxisLabelStyle,
): string | null {
  if (style === 'none') return null
  if (style === 'short') {
    return medium === 'digital' ? 'Digital' : 'Physical'
  }
  return medium === 'digital' ? 'Digital fraud' : 'Physical fraud'
}

export function createFraudAxisLabel(text: string): CSS3DObject {
  const el = document.createElement('div')
  el.className = 'globe-view__fraud-axis-label'
  el.textContent = text

  const label = new CSS3DObject(el)
  label.userData.isFraudAxisLabel = true
  return label
}

export function attachFraudAxisLabels(
  group: THREE.Group,
  radius: number,
  style: FraudAxisLabelStyle,
): void {
  const axisRadius = radius * 1.35
  const digitalText = fraudAxisLabelText('digital', style)
  const physicalText = fraudAxisLabelText('physical', style)

  if (digitalText) {
    const top = createFraudAxisLabel(digitalText)
    top.position.set(0, axisRadius, 0)
    group.add(top)
  }

  if (physicalText) {
    const bottom = createFraudAxisLabel(physicalText)
    bottom.position.set(0, -axisRadius, 0)
    group.add(bottom)
  }
}
