import type { PassiveNode } from '../models/passive-node.model.js';
import type { PassiveNodeDto } from '../dto/node.dto.js';
import { createModifier } from '../../items/mod.factory.js';

export function resolveNode(dto: PassiveNodeDto): PassiveNode {
  const modifier = createModifier({
    text: dto.stats.join('; '),
    implicit: false,
    explicit: true,
    crafted: false,
    source: 'tree',
  });

  return {
    id: dto.id,
    name: dto.name,
    type: dto.type,
    stats: dto.stats.length > 0 ? [modifier] : [],
    allocated: dto.isAllocated,
  };
}

export function resolveNodes(dtos: PassiveNodeDto[]): PassiveNode[] {
  return dtos.map(resolveNode);
}
