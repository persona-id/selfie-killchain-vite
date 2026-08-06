import * as THREE from 'three'
import type { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
import { MINI_GLOBE_RADIUS } from './clusterLayout'

const _worldPos = new THREE.Vector3()
const _camSpace = new THREE.Vector3()

function fibonacciSphereDirections(count: number): THREE.Vector3[] {
  if (count === 0) return []
  if (count === 1) return [new THREE.Vector3(0, 1, 0)]

  const phi = Math.PI * (3 - Math.sqrt(5))
  const dirs: THREE.Vector3[] = []

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const ring = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = phi * i
    dirs.push(
      new THREE.Vector3(
        Math.cos(theta) * ring,
        y,
        Math.sin(theta) * ring,
      ).normalize(),
    )
  }

  return dirs
}

export function orbitSphereFocusPositions(
  count: number,
  spacing: number,
): THREE.Vector3[] {
  const radius = MINI_GLOBE_RADIUS * 2.35 * spacing
  return fibonacciSphereDirections(count).map((dir) =>
    dir.clone().multiplyScalar(radius),
  )
}

export function focusOrbitDepthOpacity(
  objectWorldPos: THREE.Vector3,
  camera: THREE.PerspectiveCamera,
  minOpacity = 0.28,
): number {
  const objDist = objectWorldPos.distanceTo(camera.position)
  const centerDist = camera.position.distanceTo(new THREE.Vector3(0, 0, 0))
  if (objDist <= centerDist) return 1

  const fade = Math.min(1, (objDist - centerDist) / Math.max(centerDist * 0.38, 40))
  return 1 - fade * (1 - minOpacity)
}

export function focusPresentationZIndex(
  object: CSS3DObject,
  camera: THREE.PerspectiveCamera,
): number {
  _worldPos.setFromMatrixPosition(object.matrixWorld)
  _camSpace.copy(_worldPos).applyMatrix4(camera.matrixWorldInverse)
  return Math.round(1200 + _camSpace.z * 1.8)
}
