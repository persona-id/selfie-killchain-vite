import type { StageId } from '../types/killchain'

export const MATRIX_STAGE_ORDER: StageId[] = ['TA', 'AC', 'AR', 'DL']
export const DECONSTRUCT_STAGE_ORDER: StageId[] = [...MATRIX_STAGE_ORDER]

export function getStageIdFromTechnique(techniqueId: string): StageId | null {
  if (techniqueId.startsWith('TA-')) return 'TA'
  if (techniqueId.startsWith('AC-')) return 'AC'
  if (techniqueId.startsWith('AR-')) return 'AR'
  if (techniqueId.startsWith('DL-')) return 'DL'
  return null
}
