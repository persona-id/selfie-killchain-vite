import { useMemo } from 'react'
import { LayoutGroup, motion } from 'framer-motion'

import { taxonomy } from '../data/taxonomyData'
import { getStageNavStatus } from '../utils/stageNav'
import type { Selections, StageId } from '../types/killchain'
import './StageNav.css'

const FILL_TRANSITION = {
  layout: { duration: 0.42, ease: [0.33, 1, 0.68, 1] as const },
  opacity: { duration: 0.42, ease: [0.33, 1, 0.68, 1] as const },
}

interface StageNavProps {
  selections?: Selections
  activeStage?: StageId | null
  activeStages?: Iterable<StageId>
  skippedStages?: Iterable<StageId>
  stageOrder?: StageId[]
  className?: string
  slidingIndicator?: boolean
  indicatorVisible?: boolean
}

export default function StageNav({
  selections,
  activeStage,
  activeStages,
  skippedStages,
  stageOrder,
  className,
  slidingIndicator = false,
  indicatorVisible = true,
}: StageNavProps) {
  const activeStageSet = activeStages ? new Set(activeStages) : null
  const skippedStageSet = skippedStages ? new Set(skippedStages) : null
  const order = stageOrder ?? taxonomy.map((s) => s.id)
  const stages = order.map((id) => taxonomy.find((s) => s.id === id)).filter(Boolean)

  const useSlidingFill = slidingIndicator && Boolean(activeStageSet || activeStage !== undefined)
  const emphasizeAllStages = Boolean(
    activeStageSet &&
      (activeStageSet.size > 1 || (skippedStageSet && skippedStageSet.size > 0)),
  )

  const getStatus = (stageId: StageId) => {
    if (skippedStageSet?.has(stageId)) return 'skipped'

    if (useSlidingFill) {
      if (activeStageSet) {
        return activeStageSet.has(stageId) ? 'active' : 'inactive'
      }
      return activeStage === stageId ? 'active' : 'inactive'
    }
    if (activeStageSet) {
      return activeStageSet.has(stageId) ? 'active' : 'inactive'
    }
    if (activeStage) {
      return activeStage === stageId ? 'active' : 'inactive'
    }
    if (selections) {
      return getStageNavStatus(stageId, selections)
    }
    return 'upcoming'
  }

  const showFill = useSlidingFill && indicatorVisible

  const navClassName = useMemo(
    () =>
      [
        'stage-nav',
        className,
        useSlidingFill ? 'stage-nav--sliding' : '',
        showFill ? 'stage-nav--indicator-visible' : '',
      ]
        .filter(Boolean)
        .join(' '),
    [className, showFill, useSlidingFill],
  )

  return (
    <LayoutGroup id="stage-nav-fill">
      <nav className={navClassName} aria-label="Kill chain stages">
        <div className="stage-nav__track">
          {stages.map((stage, i) => {
            if (!stage) return null

            const status = getStatus(stage.id)
            const nextStage = stages[i + 1]
            const nextStatus = nextStage ? getStatus(nextStage.id) : null
            const connectorActive =
              status === 'active' && nextStatus === 'active'
            const pillActive = status === 'active'

            return (
              <div key={stage.id} className="stage-nav__segment">
                <div
                  className={`stage-nav__pill stage-nav__pill--${status}`}
                  aria-current={status === 'active' || status === 'current' ? 'step' : undefined}
                >
                  {showFill && pillActive && (
                    <motion.span
                      layoutId={
                        emphasizeAllStages ? `stage-nav-fill-${stage.id}` : 'stage-nav-fill'
                      }
                      className="stage-nav__pill-fill"
                      aria-hidden
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={FILL_TRANSITION}
                    />
                  )}
                  <span className="stage-nav__pill-label">{stage.id}</span>
                </div>
                {i < stages.length - 1 && (
                  <span
                    className={`stage-nav__connector${
                      connectorActive ? ' stage-nav__connector--active' : ''
                    }`}
                    aria-hidden
                  />
                )}
              </div>
            )
          })}
        </div>
      </nav>
    </LayoutGroup>
  )
}
