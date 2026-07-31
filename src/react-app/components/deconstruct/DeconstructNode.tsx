import { motion, useReducedMotion } from 'framer-motion'

import type { DeconstructNode } from '../../types/killchain'
import {
  DECONSTRUCT_NODE_EASE,
  DECONSTRUCT_NODE_FADE_S,
} from '../../utils/deconstructIntro'
import { BlurInImage } from '../BlurInImage'
import { ViewEndNodeNavIcon } from '../UtilityNavIcons'
import { GALLERY_DISPLAY_IMAGE, galleryDisplayImageUrl } from '../../lib/taxonomy'

import './DeconstructNode.css'

const nodeEntranceVariants = {
  hidden: {
    opacity: 0,
    x: -20,
    scale: 0.985,
    pointerEvents: 'none' as const,
  },
  visible: (delay: number) => ({
    opacity: 1,
    x: 0,
    scale: 1,
    pointerEvents: 'auto' as const,
    transition: {
      delay,
      duration: DECONSTRUCT_NODE_FADE_S,
      ease: DECONSTRUCT_NODE_EASE,
    },
  }),
}

const CANVAS_ICON_ANIMATION_SRC = '/animations/canvas-icon-test.mp4'

function TechniqueIcon() {
  return (
    <div className="deconstruct-node__icon deconstruct-node__icon--video" aria-hidden>
      <div className="deconstruct-node__icon-video-clip">
        <video
          className="deconstruct-node__icon-video"
          src={CANVAS_ICON_ANIMATION_SRC}
          autoPlay
          loop
          muted
          playsInline
        />
      </div>
    </div>
  )
}

interface DeconstructNodeCardProps {
  node: DeconstructNode
  selected?: boolean
  entranceDelay?: number
  entranceActive?: boolean
  skipEntrance?: boolean
  onSelect?: (node: DeconstructNode) => void
  onHoverStart?: (node: DeconstructNode) => void
  onHoverEnd?: (node: DeconstructNode) => void
}

export default function DeconstructNodeCard({
  node,
  selected = false,
  entranceDelay = 0,
  entranceActive = true,
  skipEntrance = false,
  onSelect,
  onHoverStart,
  onHoverEnd,
}: DeconstructNodeCardProps) {
  const reduceMotion = useReducedMotion()
  const entranceMotion =
    !reduceMotion && !skipEntrance
      ? {
          variants: nodeEntranceVariants,
          custom: entranceDelay,
          initial: 'hidden' as const,
          animate: entranceActive ? ('visible' as const) : ('hidden' as const),
        }
      : {}

  const handleClick = () => {
    if (node.isResult && !node.imageUrl) return
    onSelect?.(node)
  }

  const hoverHandlers = {
    onPointerEnter: () => onHoverStart?.(node),
    onPointerLeave: () => onHoverEnd?.(node),
  }

  if (node.isResult) {
    const hasImage = Boolean(node.imageUrl)
    return (
      <motion.button
        type="button"
        className={`deconstruct-node deconstruct-node--result${selected ? ' deconstruct-node--selected' : ''}${hasImage ? '' : ' deconstruct-node--result-empty'}`}
        style={{
          left: node.x,
          top: node.y,
          width: node.width,
          height: node.height,
        }}
        onClick={handleClick}
        aria-pressed={selected}
        {...hoverHandlers}
        {...entranceMotion}
      >
        <div className="deconstruct-node__result-image-wrap">
          <BlurInImage
            src={galleryDisplayImageUrl(
              node.imageUrl,
              GALLERY_DISPLAY_IMAGE.deconstructNode,
            )}
            alt=""
            className="deconstruct-node__result-image"
            loading="eager"
          />
        </div>
        <div className="deconstruct-node__result-label">
          <ViewEndNodeNavIcon active />
          <span className="deconstruct-node__result-label-text">RESULT</span>
        </div>
      </motion.button>
    )
  }

  return (
    <motion.button
      type="button"
      className={`deconstruct-node${selected ? ' deconstruct-node--selected' : ''}`}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
      }}
      onClick={handleClick}
      aria-pressed={selected}
      {...hoverHandlers}
      {...entranceMotion}
    >
      <div className="deconstruct-node__content">
        <span className="deconstruct-node__id">{node.techniqueId}</span>
        <span className="deconstruct-node__name">{node.name}</span>
      </div>
      <TechniqueIcon />
    </motion.button>
  )
}
