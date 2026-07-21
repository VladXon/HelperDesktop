import type { PassiveNode } from '../models/passive-node.model.js';
import type { PassiveNodeDto } from '../dto/node.dto.js';

export function resolveMastery(dto: PassiveNodeDto): PassiveNode {
  return {
    id: dto.id,
    name: dto.name,
    type: 'mastery',
    stats: [],
    allocated: dto.isAllocated,
  };
}
