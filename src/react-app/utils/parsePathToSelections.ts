import type { ObservedPath, Selections } from '../types/killchain'

export function parsePathToSelections(path: ObservedPath): Selections {
  const newSel: Selections = { TA: null, AC: null, AR: [], DL: null }
  for (const t of path.techniques) {
    if (t.startsWith('TA-')) newSel.TA = t
    else if (t.startsWith('AC-')) newSel.AC = t
    else if (t.startsWith('AR-')) newSel.AR.push(t)
    else if (t.startsWith('DL-')) newSel.DL = t
  }
  return newSel
}
