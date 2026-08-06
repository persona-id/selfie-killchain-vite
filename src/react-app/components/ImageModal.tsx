import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useGallery } from '../context/GalleryContext'
import type { GalleryItem } from '../types/gallery'
import { ComplexityBadge } from './ComplexityBadge'
import ta04TagIcon from '../assets/icons/ta-04-tag.png'
import { BlurInImage } from './BlurInImage'
import { findExactPathForTags } from '../utils/resolvePathFromTags'
import { formatDisplayDescription } from '../utils/formatDisplayText'
import { GALLERY_DISPLAY_IMAGE, galleryDisplayImageUrl } from '../lib/taxonomy'
import './ImageModal.css'

const MODAL_FADE_MS = 380
const MODAL_EASE = [0.4, 0, 0.2, 1] as const

const MODAL_TRANSITION = {
  duration: MODAL_FADE_MS / 1000,
  ease: MODAL_EASE,
} as const

const modalRootVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0, delayChildren: 0 },
  },
  exit: {
    transition: { staggerChildren: 0, when: 'afterChildren' as const },
  },
}

const modalScrimVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: MODAL_TRANSITION },
  exit: { opacity: 0, transition: { ...MODAL_TRANSITION, duration: 0.28 } },
}

const modalScrimExitVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: MODAL_TRANSITION },
  exit: { opacity: 0, transition: { duration: 0 } },
}

const modalPanelVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: MODAL_TRANSITION },
  exit: { opacity: 0, y: 8, transition: { ...MODAL_TRANSITION, duration: 0.26 } },
}

function ArrowIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path
        d="M7 11h8M13 7l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function chunkTags<T>(tags: T[], size: number): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < tags.length; i += size) {
    rows.push(tags.slice(i, i + size))
  }
  return rows
}

function ModalTagIcon() {
  return (
    <img
      src={ta04TagIcon}
      alt=""
      className="image-modal__tag-icon image-modal__tag-icon--ta-04"
      aria-hidden
    />
  )
}

export function ImageModal() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    selectedItem,
    closeModal,
    navigateModal,
    modalItems,
  } = useGallery()

  const [presentedItem, setPresentedItem] = useState<GalleryItem | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [navigatingAway, setNavigatingAway] = useState(false)
  const isClosingRef = useRef(false)
  const navigatedAwayRef = useRef(false)

  useLayoutEffect(() => {
    if (!selectedItem || location.pathname !== '/' || isClosingRef.current) return
    isClosingRef.current = false
    navigatedAwayRef.current = false
    setNavigatingAway(false)
    setPresentedItem(selectedItem)
    setIsVisible(true)
  }, [location.pathname, selectedItem])

  useEffect(() => {
    if (location.pathname !== '/deconstruct' && location.pathname !== '/matrix') return
    isClosingRef.current = false
  }, [location.pathname])

  const startExit = useCallback(() => {
    isClosingRef.current = true
    setIsVisible(false)
  }, [])

  const handleExitComplete = useCallback(() => {
    if (!isClosingRef.current) return

    setPresentedItem(null)

    if (!navigatedAwayRef.current) {
      closeModal()

      if (location.pathname === '/' && location.search) {
        navigate('/', { replace: true })
      }
    }

    setNavigatingAway(false)
    isClosingRef.current = false
  }, [closeModal, location.pathname, location.search, navigate])

  const dismissModal = useCallback(() => {
    navigatedAwayRef.current = false
    setNavigatingAway(false)
    if (location.pathname === '/' && location.search) {
      navigate('/', { replace: true })
    }
    startExit()
  }, [location.pathname, location.search, navigate, startExit])

  const handleClose = useCallback(() => {
    dismissModal()
  }, [dismissModal])

  useEffect(() => {
    if (!isVisible || !presentedItem) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissModal()
      if (e.key === 'ArrowLeft') navigateModal(-1)
      if (e.key === 'ArrowRight') navigateModal(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismissModal, isVisible, navigateModal, presentedItem])

  const goToView = (view: 'matrix' | 'deconstruct') => {
    if (!presentedItem) return
    if (isClosingRef.current && navigatedAwayRef.current) return

    const path = findExactPathForTags(presentedItem.tags)
    const params = new URLSearchParams()
    params.set('tags', presentedItem.tags.join(','))
    if (path) params.set('path', path.id)
    params.set('image', presentedItem.imageUrl)

    const target = `/${view}?${params.toString()}`
    navigatedAwayRef.current = true
    setNavigatingAway(true)
    navigate(target, {
      state: { fromGlobeModal: true },
    })
    requestAnimationFrame(() => {
      startExit()
    })
  }

  const scrimVariants = navigatingAway ? modalScrimExitVariants : modalScrimVariants

  return createPortal(
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isVisible && presentedItem ? (
        <motion.div
          key="image-modal"
          className="font-monument image-modal fixed inset-0 flex cursor-none"
          style={{ padding: 'var(--modal-pad, 1.5rem)' }}
          variants={modalRootVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleClose}
        >
          <motion.div className="image-modal__scrim" aria-hidden variants={scrimVariants} />

          <motion.div
            className="image-modal__panel-host relative cursor-none select-none"
            variants={modalPanelVariants}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="image-modal__panel">
              <ComplexityBadge complexity={presentedItem.complexity} />

              <div className="image-modal__body">
                <p className="image-modal__description">
                  {formatDisplayDescription(presentedItem.description)}
                </p>

                <div className="image-modal__core">
                  <div className="image-modal__image-box">
                    <BlurInImage
                      src={galleryDisplayImageUrl(
                        presentedItem.imageUrl,
                        GALLERY_DISPLAY_IMAGE.modal,
                      )}
                      alt=""
                      className="object-cover object-center"
                      loading="eager"
                      fetchPriority="high"
                    />
                  </div>

                  <div className="image-modal__tags">
                    {chunkTags(presentedItem.tags, 3).map((row, rowIndex) => (
                      <div key={rowIndex} className="image-modal__tag-row">
                        {row.map((tag) => (
                          <span key={tag} className="image-modal__tag">
                            <ModalTagIcon />
                            {tag}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="image-modal__footer">
                <div className="image-modal__nav">
                  <button
                    type="button"
                    onClick={() => navigateModal(-1)}
                    disabled={modalItems.length <= 1}
                    className="image-modal__nav-btn"
                    aria-label="Previous"
                  >
                    <span className="inline-flex items-center justify-center rotate-180">
                      <ArrowIcon />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateModal(1)}
                    disabled={modalItems.length <= 1}
                    className="image-modal__nav-btn"
                    aria-label="Next"
                  >
                    <span className="inline-flex items-center justify-center">
                      <ArrowIcon />
                    </span>
                  </button>
                </div>

                <div className="image-modal__views">
                  <button
                    type="button"
                    onClick={() => goToView('matrix')}
                    className="image-modal__view-btn image-modal__view-btn--matrix"
                  >
                    Show tampering Layers
                    <ArrowIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToView('deconstruct')}
                    className="image-modal__view-btn image-modal__view-btn--deconstruct"
                  >
                    Deconstruct
                    <ArrowIcon />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
