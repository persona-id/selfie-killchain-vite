import { taxonomy } from '../data/taxonomyData'
import type { DeconstructNode } from '../types/killchain'

export function getDeconstructNodeDescriptor(node: DeconstructNode): string {
  if (node.isResult) {
    return 'Observed attack outcome'
  }

  for (const stage of taxonomy) {
    const technique = stage.techniques.find((tech) => tech.id === node.techniqueId)
    if (technique) {
      return technique.descShort
    }
  }

  return node.name
}
