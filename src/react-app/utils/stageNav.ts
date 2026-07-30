import { STAGE_ORDER } from '../data/taxonomyData'
import type { Selections, StageId } from '../types/killchain'

export function getCurrentStageId(selections: Selections): StageId {
  if (!selections.TA) return 'TA'
  if (!selections.AC) return 'AC'
  if (!selections.DL) return 'AR'
  return 'DL'
}

export type StageNavStatus = 'upcoming' | 'current' | 'complete'

export function getStageNavStatus(stageId: StageId, selections: Selections): StageNavStatus {
  const current = getCurrentStageId(selections)
  const complete = {
    TA: !!selections.TA,
    AC: !!selections.AC,
    AR: (selections.AR || []).length > 0,
    DL: !!selections.DL,
  }

  if (selections.DL && complete[stageId]) return 'complete'
  if (stageId === current) return 'current'
  if (complete[stageId]) return 'complete'
  return 'upcoming'
}

export function stageIndex(stageId: StageId): number {
  return STAGE_ORDER.indexOf(stageId)
}

export function getSelectedStages(
  selections: Selections,
  order: StageId[] = STAGE_ORDER,
): StageId[] {
  const selected = new Set<StageId>()
  if (selections.TA) selected.add('TA')
  if (selections.AC) selected.add('AC')
  if ((selections.AR ?? []).length > 0) selected.add('AR')
  if (selections.DL) selected.add('DL')
  return order.filter((stageId) => selected.has(stageId))
}

function stageHasSelection(stageId: StageId, selections: Selections): boolean {
  if (stageId === 'AR') return (selections.AR ?? []).length > 0
  return Boolean(selections[stageId as keyof Selections])
}

/** Stages with selections vs stages skipped when later stages are present. */
export function getMatrixStageNavStages(
  selections: Selections,
  order: StageId[] = STAGE_ORDER,
): { activeStages: StageId[]; skippedStages: StageId[] } {
  const hasStage = (stageId: StageId) => stageHasSelection(stageId, selections)

  const activeStages: StageId[] = []
  const skippedStages: StageId[] = []

  order.forEach((stageId, index) => {
    if (hasStage(stageId)) {
      activeStages.push(stageId)
      return
    }

    const hasLaterStage = order.slice(index + 1).some((laterId) => hasStage(laterId))
    if (hasLaterStage) {
      skippedStages.push(stageId)
    }
  })

  return { activeStages, skippedStages }
}
