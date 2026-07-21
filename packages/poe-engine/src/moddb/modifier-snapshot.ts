import type { Modifier } from '../modifiers/modifier.js';

export interface ModifierSnapshot {
  readonly modifiers: readonly Modifier[];
  readonly timestamp: number;
  readonly size: number;
}

export function createSnapshot(
  modifiers: readonly Modifier[],
  timestamp?: number,
): ModifierSnapshot {
  return Object.freeze({
    modifiers: Object.freeze([...modifiers]),
    timestamp: timestamp ?? Date.now(),
    size: modifiers.length,
  });
}
