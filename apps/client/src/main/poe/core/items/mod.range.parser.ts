import type { ModifierStat } from './modifier.model.js';
import { MOD_PATTERNS } from './patterns/mod.patterns.js';

const PATTERNS_SORTED = [...MOD_PATTERNS].sort((a, b) => b.priority - a.priority);

export function parseModRange(text: string): ModifierStat[] {
  for (const entry of PATTERNS_SORTED) {
    const match = entry.pattern.exec(text);
    if (match) {
      return entry.parser(match);
    }
  }
  return [{ stat: 'unknown', value: 0, type: 'flat' }];
}
