import { observedPaths, STAGE_ORDER, taxonomy } from '../data/taxonomyData'
import type { ObservedPath, Selections } from '../types/killchain'

export type MatrixCardKey = `${string}:${string}`

export function matrixCardKey(stageId: string, techId: string): MatrixCardKey {
  return `${stageId}:${techId}`
}

export function pathTechAt(path: ObservedPath, stageId: string): string | string[] | null {
  if (stageId === 'AR') return path.techniques.filter((t) => t.startsWith('AR-'))
  return path.techniques.find((t) => t.startsWith(`${stageId}-`)) ?? null
}

export function pathMatches(path: ObservedPath, selections: Selections): boolean {
  for (const stage of STAGE_ORDER) {
    if (stage === 'AR') {
      const sel = selections.AR || []
      if (sel.length === 0) continue
      const pAR = pathTechAt(path, 'AR') as string[]
      if (!sel.every((t) => pAR.includes(t))) return false
    } else {
      const sel = selections[stage]
      if (!sel) continue
      if (pathTechAt(path, stage) !== sel) return false
    }
  }
  return true
}

export function stageIsActive(stageId: string, selections: Selections): boolean {
  if (stageId === 'TA') return true
  if (stageId === 'AC') return selections.TA != null
  return selections.AC != null
}

function cloneSelections(selections: Selections): Selections {
  return { ...selections, AR: [...(selections.AR || [])] }
}

function isReachable(
  techId: string,
  stageId: string,
  selections: Selections,
  matchingPaths: ObservedPath[],
): boolean {
  if (stageId === 'AR' && (selections.AR || []).includes(techId)) return false
  if (stageId !== 'AR' && selections[stageId as keyof Selections] === techId) return false

  if (stageId === 'AR') {
    const trialAR = [...(selections.AR || []), techId]
    return matchingPaths.some((path) => {
      const pathAR = pathTechAt(path, 'AR') as string[]
      return trialAR.every((id) => pathAR.includes(id))
    })
  }

  return matchingPaths.some((path) => pathTechAt(path, stageId) === techId)
}

function isAlternative(techId: string, stageId: string, selections: Selections): boolean {
  const trial = cloneSelections(selections)
  ;(trial as unknown as Record<string, string | null>)[stageId] = techId
  return observedPaths.some((path) => pathMatches(path, trial))
}

export type TechniqueState =
  | 'locked'
  | 'unavailable'
  | 'available'
  | 'alternative'
  | 'selected'

export interface MatrixCardModel {
  matchingPaths: ObservedPath[]
  states: Map<MatrixCardKey, TechniqueState>
  orderIdx: Map<MatrixCardKey, number>
}

export function buildMatrixCardModel(selections: Selections): MatrixCardModel {
  const matchingPaths = observedPaths.filter((path) => pathMatches(path, selections))
  const states = new Map<MatrixCardKey, TechniqueState>()
  const orderIdx = new Map<MatrixCardKey, number>()
  const singlePath = matchingPaths.length === 1 ? matchingPaths[0] : null

  for (const stage of taxonomy) {
    for (const tech of stage.techniques) {
      const key = matrixCardKey(stage.id, tech.id)
      let state: TechniqueState

      if (stage.id === 'AR' && (selections.AR || []).includes(tech.id)) {
        state = 'selected'
      } else if (stage.id !== 'AR' && selections[stage.id as keyof Selections] === tech.id) {
        state = 'selected'
      } else if (!stageIsActive(stage.id, selections)) {
        state = 'locked'
      } else if (stage.id !== 'AR' && selections[stage.id as keyof Selections] != null) {
        state = isAlternative(tech.id, stage.id, selections) ? 'alternative' : 'unavailable'
      } else {
        state = isReachable(tech.id, stage.id, selections, matchingPaths)
          ? 'available'
          : 'unavailable'
      }

      states.set(key, state)

      if (singlePath && state === 'selected') {
        const idx = singlePath.techniques.indexOf(tech.id)
        if (idx !== -1) orderIdx.set(key, idx + 1)
      }
    }
  }

  return { matchingPaths, states, orderIdx }
}

export function techniqueAvailable(
  techId: string,
  stageId: string,
  selections: Selections,
): boolean {
  const matchingPaths = observedPaths.filter((path) => pathMatches(path, selections))
  return isReachable(techId, stageId, selections, matchingPaths)
}

export function techniqueState(
  techId: string,
  stageId: string,
  selections: Selections,
): TechniqueState {
  return buildMatrixCardModel(selections).states.get(matrixCardKey(stageId, techId)) ?? 'locked'
}

export function techniqueOrderInUniquePath(
  techId: string,
  stageId: string,
  selections: Selections,
  matchingPaths: ObservedPath[],
): number | null {
  if (matchingPaths.length !== 1) return null
  const isSelected =
    stageId === 'AR'
      ? (selections.AR || []).includes(techId)
      : selections[stageId as keyof Selections] === techId
  if (!isSelected) return null
  const idx = matchingPaths[0].techniques.indexOf(techId)
  return idx === -1 ? null : idx + 1
}
