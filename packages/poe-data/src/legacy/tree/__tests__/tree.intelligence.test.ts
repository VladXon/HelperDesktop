import { describe, it, expect } from 'vitest';
import { resolveNode, resolveNodes } from '../resolvers/node.resolver.js';
import { resolveKeystone, hasKeystoneEffect } from '../resolvers/keystone.resolver.js';
import { resolveAscendancy, resolveAllAscendancy, getAscendancyEffects } from '../resolvers/ascendancy.resolver.js';
import { createPassiveTree } from '../factory/tree.factory.js';
import type { PassiveNodeDto } from '../dto/node.dto.js';
import type { ParsedTreeDto } from '../dto/tree.dto.js';

describe('node resolver', () => {
  it('resolves a small passive node', () => {
    const dto: PassiveNodeDto = {
      id: 1001,
      name: '+10 to Strength',
      type: 'small',
      stats: ['+10 to Strength'],
      isAllocated: true,
    };
    const node = resolveNode(dto);
    expect(node.id).toBe(1001);
    expect(node.type).toBe('small');
    expect(node.allocated).toBe(true);
    expect(node.stats.length).toBeGreaterThan(0);
  });

  it('resolves a notable passive node', () => {
    const dto: PassiveNodeDto = {
      id: 2001,
      name: 'Constitution',
      type: 'notable',
      stats: ['+60 to maximum life', '8% increased maximum life'],
      isAllocated: true,
    };
    const node = resolveNode(dto);
    expect(node.type).toBe('notable');
    expect(node.name).toBe('Constitution');
  });

  it('resolves a keystone node', () => {
    const dto: PassiveNodeDto = {
      id: 3001,
      name: 'Chaos Inoculation',
      type: 'keystone',
      stats: [],
      isAllocated: true,
    };
    const node = resolveNode(dto);
    expect(node.type).toBe('keystone');
    expect(node.allocated).toBe(true);
  });

  it('handles unallocated node', () => {
    const dto: PassiveNodeDto = {
      id: 4001,
      name: 'Unallocated',
      type: 'small',
      stats: ['+5 to dexterity'],
      isAllocated: false,
    };
    const node = resolveNode(dto);
    expect(node.allocated).toBe(false);
  });

  it('resolves multiple nodes at once', () => {
    const dtos: PassiveNodeDto[] = [
      { id: 1, name: 'Node 1', type: 'small', stats: [], isAllocated: true },
      { id: 2, name: 'Node 2', type: 'small', stats: [], isAllocated: true },
      { id: 3, name: 'Node 3', type: 'notable', stats: ['+20 to strength'], isAllocated: true },
    ];
    const nodes = resolveNodes(dtos);
    expect(nodes.length).toBe(3);
    expect(nodes[2]!.type).toBe('notable');
  });

  it('handles node with no stats', () => {
    const dto: PassiveNodeDto = {
      id: 5001,
      name: 'Empty Node',
      type: 'small',
      stats: [],
      isAllocated: true,
    };
    const node = resolveNode(dto);
    expect(node.stats).toEqual([]);
  });
});

describe('keystone resolver', () => {
  it('resolves Chaos Inoculation', () => {
    const result = resolveKeystone('Chaos Inoculation');
    expect(result.effect).not.toBeNull();
    expect(result.effect!.effects).toContain('life_set_to_one');
    expect(result.effect!.effects).toContain('immune_chaos');
    expect(result.effect!.tags).toContain('defense');
    expect(result.modifiers.length).toBe(1);
  });

  it('resolves Mind Over Matter', () => {
    const result = resolveKeystone('Mind Over Matter');
    expect(result.effect).not.toBeNull();
    expect(result.effect!.effects).toContain('mana_absorbs_damage');
  });

  it('resolves Eldritch Battery', () => {
    const result = resolveKeystone('Eldritch Battery');
    expect(result.effect).not.toBeNull();
    expect(result.effect!.effects).toContain('energy_shield_protects_mana');
  });

  it('resolves Resolute Technique', () => {
    const result = resolveKeystone('Resolute Technique');
    expect(result.effect).not.toBeNull();
    expect(result.effect!.effects).toContain('cannot_crit');
    expect(result.effect!.effects).toContain('always_hit');
  });

  it('returns null for unknown keystone', () => {
    const result = resolveKeystone('Unknown Keystone');
    expect(result.effect).toBeNull();
    expect(result.modifiers).toEqual([]);
  });

  it('checks keystone effects correctly', () => {
    expect(hasKeystoneEffect('Chaos Inoculation', 'immune_chaos')).toBe(true);
    expect(hasKeystoneEffect('Chaos Inoculation', 'extra_life')).toBe(false);
    expect(hasKeystoneEffect('Unknown', 'anything')).toBe(false);
  });
});

describe('ascendancy resolver', () => {
  it('resolves Elementalist ascendancy node', () => {
    const node = resolveAscendancy('Shaper of Flames', 'Elementalist');
    expect(node).not.toBeNull();
    expect(node!.effects).toContain('all_damage_can_ignite');
  });

  it('resolves Berserker ascendancy node', () => {
    const node = resolveAscendancy('Aspect of Carnage', 'Berserker');
    expect(node).not.toBeNull();
    expect(node!.effects).toContain('more_damage');
  });

  it('handles unknown ascendancy', () => {
    const node = resolveAscendancy('Unknown Node', 'Elementalist');
    expect(node).not.toBeNull();
    expect(node!.effects).toEqual([]);
  });

  it('resolves multiple ascendancy nodes', () => {
    const nodes = resolveAllAscendancy(
      ['Shaper of Flames', 'Shaper of Storms'],
      'Elementalist',
    );
    expect(nodes.length).toBe(2);
    expect(nodes[0]!.effects).toContain('all_damage_can_ignite');
    expect(nodes[1]!.effects).toContain('all_damage_can_shock');
  });

  it('returns empty for unknown ascendancy class', () => {
    const nodes = resolveAllAscendancy(['Some Node'], 'UnknownClass');
    expect(nodes.length).toBe(1);
    expect(nodes[0]!.effects).toEqual([]);
  });

  it('gets all effects for a class', () => {
    const effects = getAscendancyEffects('Elementalist');
    expect(effects.length).toBeGreaterThan(0);
    expect(effects).toContain('all_damage_can_ignite');
    expect(effects).toContain('increased_aoe');
  });
});

describe('passive tree factory', () => {
  const emptyTreeDto: ParsedTreeDto = {
    version: '3.25',
    nodes: [],
    masteryChoices: {},
    keystones: [],
    ascendancyNodes: [],
    ascendancyClassName: '',
    clusterJewels: [],
  };

  it('creates a passive tree from DTO', () => {
    const dto: ParsedTreeDto = {
      ...emptyTreeDto,
      nodes: [
        { id: 1, name: '+10 Str', type: 'small', stats: ['+10 to strength'], isAllocated: true },
        { id: 2, name: '+10 Int', type: 'small', stats: ['+10 to intelligence'], isAllocated: true },
        { id: 3, name: 'CI', type: 'keystone', stats: [], isAllocated: true },
      ],
      keystones: ['Chaos Inoculation'],
    };
    const tree = createPassiveTree(dto);
    expect(tree.nodes.length).toBe(3);
    expect(tree.keystones.length).toBe(1);
    expect(tree.keystones[0]!.effects).toContain('immune_chaos');
  });

  it('handles empty tree gracefully', () => {
    const tree = createPassiveTree(emptyTreeDto);
    expect(tree.nodes).toEqual([]);
    expect(tree.keystones).toEqual([]);
    expect(tree.masteries).toEqual([]);
    expect(tree.ascendancy).toEqual([]);
    expect(tree.clusterJewels).toEqual([]);
    expect(tree.version).toBe('3.25');
  });

  it('includes ascendancy data', () => {
    const dto: ParsedTreeDto = {
      ...emptyTreeDto,
      ascendancyNodes: [
        { name: 'Shaper of Flames', effects: [] },
        { name: 'Shaper of Storms', effects: [] },
      ],
      ascendancyClassName: 'Elementalist',
    };
    const tree = createPassiveTree(dto);
    expect(tree.ascendancy.length).toBe(2);
    expect(tree.ascendancy[0]!.effects).toContain('all_damage_can_ignite');
  });

  it('includes mastery choices', () => {
    const dto: ParsedTreeDto = {
      ...emptyTreeDto,
      masteryChoices: {
        1: 'Life Mastery',
      },
    };
    const tree = createPassiveTree(dto);
    expect(tree.masteries.length).toBeGreaterThan(0);
  });

  it('includes cluster jewel data', () => {
    const dto: ParsedTreeDto = {
      ...emptyTreeDto,
      clusterJewels: [{
        socketNodeId: 999,
        type: 'large' as const,
        passives: [],
        notables: ['Notable 1', 'Notable 2'],
      }],
    };
    const tree = createPassiveTree(dto);
    expect(tree.clusterJewels.length).toBe(1);
    expect(tree.clusterJewels[0]!.type).toBe('large');
    expect(tree.clusterJewels[0]!.notables).toContain('Notable 1');
    expect(tree.clusterJewels[0]!.notables).toContain('Notable 2');
  });

  it('returns empty ascendancy when class is empty', () => {
    const dto: ParsedTreeDto = {
      ...emptyTreeDto,
      ascendancyNodes: [{ name: 'Node', effects: [] }],
      ascendancyClassName: '',
    };
    const tree = createPassiveTree(dto);
    expect(tree.ascendancy[0]!.effects).toEqual([]);
  });
});
