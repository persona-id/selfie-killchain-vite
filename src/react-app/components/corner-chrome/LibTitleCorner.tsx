import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'

import { SHELL_ENTRANCE_LEFT } from '../../constants/shellMotion'
import { useSiteMetadata } from '../../hooks/useSiteMetadata'
import type { StageNavChromeConfig } from '../../context/KillchainChromeContext'
import StageNav from '../StageNav'
import { NetworkDotOrb } from './NetworkDotOrb'
import './LibTitleCorner.css'

const INFO_TRANSITION = {
  duration: 0.32,
  ease: [0.33, 1, 0.68, 1] as const,
}

const STAGE_TRANSITION = {
  duration: 0.42,
  ease: [0.33, 1, 0.68, 1] as const,
}

interface LibTitleCornerProps {
  stageNav: StageNavChromeConfig | null
  expanded: boolean
  body: React.ReactNode | null
  entranceReady?: boolean
  fadeIn?: boolean
}

export function LibTitleCorner({
  stageNav,
  expanded,
  body,
  entranceReady = true,
  fadeIn = true,
}: LibTitleCornerProps) {
  const [hovered, setHovered] = useState(false)
  const { siteTitle, version, accessStamp, hfChanges, imagesLoaded, networkLoad } =
    useSiteMetadata()
  const showInfo = hovered && !expanded

  const shell = (
    <div className="lib-title-corner">
      <div className="lib-title-corner__row">
        <div
          className="lib-title-corner__cluster"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="lib-title-corner__title glass-surface">
            <span className="lib-title-corner__title-text">.LIB</span>
          </div>

          <AnimatePresence>
            {showInfo ? (
              <motion.div
                className="lib-title-corner__info glass-surface"
                initial={{ opacity: 0, x: -12, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -8, scale: 0.98 }}
                transition={INFO_TRANSITION}
              >
                <div className="lib-title-corner__info-grid">
                  <div className="lib-title-corner__info-copy">
                    <p className="lib-title-corner__info-primary">
                      {siteTitle}
                      <span className="lib-title-corner__info-muted">
                        {'\n'}Ver. {version}
                        {'\n\n'}
                        <span className="lib-title-corner__info-brackets">
                          [
                          <span className="lib-title-corner__online-dot" aria-hidden />
                          ]
                        </span>
                      </span>
                      <span className="lib-title-corner__info-status">
                        {'\n'}Initialized — ONline
                      </span>
                      <span className="lib-title-corner__info-muted">
                        {'\n'}
                        {accessStamp}
                        {'\n\n'}
                      </span>
                    </p>
                    <p className="lib-title-corner__info-status">
                      <span>{hfChanges}+ Changes</span>
                      <span className="lib-title-corner__info-muted"> (last 30 mins)</span>
                      <span className="lib-title-corner__info-muted">{'\n'}</span>
                      <span>{imagesLoaded.toLocaleString()}</span>
                      <span className="lib-title-corner__info-muted"> Images loaded</span>
                    </p>
                  </div>
                  <NetworkDotOrb load={networkLoad} />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {stageNav ? (
            <motion.div
              key="stage-nav"
              className="lib-title-corner__stages glass-surface"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={STAGE_TRANSITION}
            >
              <StageNav
                className="killchain-top-bar__stages"
                selections={stageNav.selections}
                activeStage={stageNav.activeStage}
                activeStages={stageNav.activeStages}
                skippedStages={stageNav.skippedStages}
                stageOrder={stageNav.stageOrder}
                slidingIndicator={stageNav.slidingIndicator}
                indicatorVisible={stageNav.indicatorVisible}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {expanded && body ? (
          <motion.div
            key="lib-body"
            className="lib-title-corner__body glass-surface"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={STAGE_TRANSITION}
          >
            {body}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )

  if (!fadeIn) return shell

  return (
    <motion.div
      initial={SHELL_ENTRANCE_LEFT.initial}
      animate={entranceReady ? SHELL_ENTRANCE_LEFT.animate : { opacity: 0 }}
      transition={SHELL_ENTRANCE_LEFT.transition}
    >
      {shell}
    </motion.div>
  )
}
