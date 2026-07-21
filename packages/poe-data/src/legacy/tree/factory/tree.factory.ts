import type { PassiveTree } from '../models/passive-tree.model.js';
import type { ParsedTreeDto } from '../dto/tree.dto.js';
import { resolveNodes } from '../resolvers/node.resolver.js';
import { resolveKeystone } from '../resolvers/keystone.resolver.js';
import { resolveAllAscendancy } from '../resolvers/ascendancy.resolver.js';
import { createModifier, createModifiers } from '../../items/mod.factory.js';
import { MASTERY_EFFECTS } from '../mechanics/mastery.effects.js';

export function createPassiveTree(dto: ParsedTreeDto): PassiveTree {
  const nodes = resolveNodes(dto.nodes);

  const keystones = dto.keystones
    .map((name) => resolveKeystone(name))
    .filter((r) => r.effect !== null)
    .map((r) => r.effect!);

  const masteries = resolveMasteryChoices(dto.masteryChoices);

  const ascendancy = resolveAllAscendancy(
    dto.ascendancyNodes.map((n) => n.name),
    dto.ascendancyClassName,
  );

  const clusterJewels = dto.clusterJewels.map((cj) => ({
    socketNodeId: cj.socketNodeId,
    type: cj.type,
    nodes: nodes.filter((n) => cj.passives.includes(n.id)),
    notables: cj.notables,
  }));

  return {
    version: dto.version,
    nodes,
    keystones,
    masteries,
    ascendancy,
    clusterJewels,
  };
}

function resolveMasteryChoices(choices: Record<number, string>) {
  const modifiers = [];

  for (const [, effectName] of Object.entries(choices)) {
    const effects = MASTERY_EFFECTS[effectName];
    if (!effects) continue;

    for (const effect of effects) {
      modifiers.push(
        createModifier({
          text: `Mastery: ${effect.key}`,
          implicit: false,
          explicit: true,
          crafted: false,
          source: 'tree',
        }),
      );
    }
  }

  return modifiers;
}
