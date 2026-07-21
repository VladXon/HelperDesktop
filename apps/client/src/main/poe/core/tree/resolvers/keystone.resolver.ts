import type { KeystoneEffect } from '../models/passive-tree.model.js';
import { KEYSTONES } from '../mechanics/keystone.effects.js';
import { createModifier } from '../../items/mod.factory.js';
import type { Modifier } from '../../items/modifier.model.js';

export function resolveKeystone(name: string): { effect: KeystoneEffect | null; modifiers: Modifier[] } {
  const effect = KEYSTONES[name] ?? null;

  if (!effect) {
    return { effect: null, modifiers: [] };
  }

  const modifier = createModifier({
    text: `Keystone: ${name}`,
    implicit: false,
    explicit: true,
    crafted: false,
    source: 'tree',
  });

  modifier.tags = [...effect.tags];

  return { effect, modifiers: [modifier] };
}

export function hasKeystoneEffect(name: string, effectId: string): boolean {
  const keystone = KEYSTONES[name];
  if (!keystone) return false;
  return keystone.effects.includes(effectId);
}
