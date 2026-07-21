import type { StatValue } from '../models/stat.model.js';
import type { PassiveTree } from '../../tree/models/passive-tree.model.js';

export function collectTreeStats(tree: PassiveTree): StatValue[] {
  const result: StatValue[] = [];

  for (const node of tree.nodes) {
    if (!node.allocated) continue;
    for (const mod of node.stats) {
      for (const s of mod.stats) {
        result.push({
          name: s.stat,
          value: s.value,
          source: 'tree',
          type: statTypeToValueType(s.type),
          scope: 'global',
          modifierName: `tree: ${node.name}`,
        });
      }
    }
  }

  for (const mastery of tree.masteries) {
    for (const s of mastery.stats) {
      result.push({
        name: s.stat,
        value: s.value,
        source: 'mastery',
        type: statTypeToValueType(s.type),
        scope: 'global',
        modifierName: `mastery: ${mastery.text}`,
      });
    }
  }

  for (const keystone of tree.keystones) {
    result.push({
      name: keystone.name,
      value: 1,
      source: 'keystone',
      type: 'flat',
      scope: 'global',
      modifierName: `keystone: ${keystone.name}`,
    });
  }

  for (const asc of tree.ascendancy) {
    for (const effect of asc.effects) {
      result.push({
        name: effect,
        value: 1,
        source: 'ascendancy',
        type: 'flat',
        scope: 'global',
        modifierName: `ascendancy: ${asc.name}`,
      });
    }
  }

  return result;
}

function statTypeToValueType(type: string): StatValue['type'] {
  if (type === 'increased' || type === 'more' || type === 'conversion') return type;
  return 'flat';
}
