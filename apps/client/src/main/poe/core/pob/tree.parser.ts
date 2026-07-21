import type { PoBTree } from '../dto/pob-xml.dto.js';
import type { ParsedTreeDto } from './dto/tree.dto.js';

export function parsePoBTree(tree: PoBTree): ParsedTreeDto {
  return {
    version: tree.treeVersion,
    allocatedNodes: tree.nodes,
    masteryChoices: tree.masteryEffects,
    keystones: tree.keystones,
    ascendancyNodes: tree.ascendancyNodes,
  };
}
