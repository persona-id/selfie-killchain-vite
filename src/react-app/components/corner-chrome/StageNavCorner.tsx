import { AnimatePresence, motion } from 'framer-motion'

import type { StageNavChromeConfig } from '../../context/KillchainChromeContext'
import KillchainEdgeShell from '../KillchainEdgeShell'
import StageNav from '../StageNav'
import './StageNavCorner.css'

const LEFT_BODY_VARIANTS = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const },
  },
}

interface StageNavCornerProps {
  stageNav: StageNavChromeConfig
  expanded: boolean
  body: React.ReactNode | null
}

export function StageNavCorner({ stageNav, expanded, body }: StageNavCornerProps) {
  const leftHeader = (
    <div className="killchain-edge-shell__header-inner">
      <div className="killchain-edge-shell__header-swap">
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
      </div>
    </div>
  )

  const leftBody = (
    <AnimatePresence mode="popLayout" initial={false}>
      {body ? (
        <motion.div
          key="left-body"
          className="killchain-edge-shell__body-swap"
          variants={LEFT_BODY_VARIANTS}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {body}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )

  return (
    <KillchainEdgeShell side="left" expanded={expanded} fadeIn={false} header={leftHeader}>
      {leftBody}
    </KillchainEdgeShell>
  )
}
