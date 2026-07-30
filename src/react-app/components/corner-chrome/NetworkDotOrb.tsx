import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import * as THREE from 'three'

import { ANIMATION_PRESETS } from '../../lib/globe'

const ORB_PX = 50
const SPHERE_RADIUS = 1
const DOT_PX = 2.7
const ICOSPHERE_DETAIL = 1
const DIM_OPACITY = 0.2
const WAVE_BAND = 0.24

function geodesicSpherePositions(radius: number, detail: number): THREE.Vector3[] {
  const geometry = new THREE.IcosahedronGeometry(radius, detail)
  const attr = geometry.attributes.position as THREE.BufferAttribute
  const unique = new Map<string, THREE.Vector3>()

  for (let i = 0; i < attr.count; i += 1) {
    const point = new THREE.Vector3(attr.getX(i), attr.getY(i), attr.getZ(i))
    const key = [
      point.x.toFixed(4),
      point.y.toFixed(4),
      point.z.toFixed(4),
    ].join(':')
    unique.set(key, point)
  }

  geometry.dispose()
  return Array.from(unique.values())
}

function waveOpacity(projection: number, waveTime: number): number {
  const offset = (waveTime - projection + 1) % 1
  if (offset >= WAVE_BAND) return DIM_OPACITY
  const lead = 1 - offset / WAVE_BAND
  return DIM_OPACITY + lead * (1 - DIM_OPACITY)
}

export function NetworkDotOrb({ load }: { load: number }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 12)
    camera.position.set(0, 0, 3.35)

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    })
    renderer.setPixelRatio(dpr)
    renderer.setSize(ORB_PX, ORB_PX, false)
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.className = 'network-dot-orb__canvas'
    host.appendChild(renderer.domElement)

    const spherePoints = geodesicSpherePositions(SPHERE_RADIUS, ICOSPHERE_DETAIL)
    const dotCount = spherePoints.length
    const positions = new Float32Array(dotCount * 3)
    const opacities = new Float32Array(dotCount)

    spherePoints.forEach((point, index) => {
      positions[index * 3] = point.x
      positions[index * 3 + 1] = point.y
      positions[index * 3 + 2] = point.z
      opacities[index] = DIM_OPACITY
    })

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1))

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uSize: { value: DOT_PX * dpr },
        uColor: { value: new THREE.Color(0x0e0e0e) },
      },
      vertexShader: `
        attribute float opacity;
        varying float vOpacity;
        uniform float uSize;
        void main() {
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = uSize;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vOpacity;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.2, dist) * vOpacity;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    })

    const orb = new THREE.Points(geometry, material)
    scene.add(orb)

    const drift = ANIMATION_PRESETS.drift
    const rotation = new THREE.Euler(0.22, 0.48, 0)
    const rotatedPoint = new THREE.Vector3()
    let waveTime = 0
    let lastFrame = performance.now()

    let frameId = 0
    const tick = (now: number) => {
      frameId = window.requestAnimationFrame(tick)
      const dt = Math.min((now - lastFrame) / 16.667, 2.5)
      lastFrame = now

      if (!reduceMotion) {
        rotation.y += drift.autoRotateY * dt
        rotation.x += drift.autoRotateX * dt
        waveTime += 0.007 + load * 0.003
      }

      orb.rotation.set(rotation.x, rotation.y, rotation.z)

      const opacityAttr = geometry.getAttribute('opacity') as THREE.BufferAttribute
      for (let i = 0; i < dotCount; i += 1) {
        rotatedPoint.set(
          positions[i * 3],
          positions[i * 3 + 1],
          positions[i * 3 + 2],
        )
        rotatedPoint.applyEuler(rotation)
        const projection = (rotatedPoint.x + SPHERE_RADIUS) / (SPHERE_RADIUS * 2)
        opacityAttr.setX(i, waveOpacity(projection, waveTime))
      }
      opacityAttr.needsUpdate = true

      renderer.render(scene, camera)
    }

    tick(performance.now())

    return () => {
      window.cancelAnimationFrame(frameId)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [load, reduceMotion])

  return <div ref={hostRef} className="network-dot-orb" aria-hidden />
}
