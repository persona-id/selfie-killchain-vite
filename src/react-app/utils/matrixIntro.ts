import {
  DECONSTRUCT_NODE_EASE,
  DECONSTRUCT_NODE_FADE_S,
  DECONSTRUCT_PATH_STEP_S,
} from './deconstructIntro'

export { DECONSTRUCT_NODE_EASE as MATRIX_NODE_EASE, DECONSTRUCT_NODE_FADE_S as MATRIX_NODE_FADE_S }

/** Matrix entrance runs ~1s slower than deconstruct pacing across four columns. */
const MATRIX_ENTRANCE_SLOWDOWN_S = 1
const MATRIX_PATH_STEP_S = DECONSTRUCT_PATH_STEP_S + MATRIX_ENTRANCE_SLOWDOWN_S / 6
const MATRIX_CARD_ROW_STAGGER_S = 0.07 * (MATRIX_PATH_STEP_S / DECONSTRUCT_PATH_STEP_S)

/** Column headers reveal left to right, one stage per beat. */
export function getMatrixColumnHeaderDelay(columnIndex: number) {
  return columnIndex * 2 * MATRIX_PATH_STEP_S
}

/** Cards follow their column header, with a light top-to-bottom stagger. */
export function getMatrixCardDelay(columnIndex: number, rowIndex: number) {
  return (
    getMatrixColumnHeaderDelay(columnIndex) +
    MATRIX_PATH_STEP_S +
    rowIndex * MATRIX_CARD_ROW_STAGGER_S
  )
}

/** Ms after mount until the nav should settle into selection state. */
export function getMatrixEntranceNavCompleteDelay(stageCount = 4) {
  const lastIndex = Math.max(0, stageCount - 1)
  return getMatrixColumnHeaderDelay(lastIndex) + DECONSTRUCT_NODE_FADE_S
}

/** Ms until the last card in the final column finishes its entrance animation. */
export function getMatrixContentEntranceCompleteDelay(
  columnCount: number,
  rowCountInLastColumn: number,
) {
  const lastColumn = Math.max(0, columnCount - 1)
  const lastRow = Math.max(0, rowCountInLastColumn - 1)
  return getMatrixCardDelay(lastColumn, lastRow) + DECONSTRUCT_NODE_FADE_S
}
