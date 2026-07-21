import type { StatKey } from '../registry/stat-key.js';
import type { ModifierSource, ModifierType } from '../modifiers/modifier-types.js';

export interface ModifierFilter {
  readonly stat?: StatKey;
  readonly source?: ModifierSource | readonly ModifierSource[];
  readonly type?: ModifierType | readonly ModifierType[];
  readonly idPattern?: string;
}

export interface ModDBStats {
  readonly totalModifiers: number;
  readonly uniqueStats: number;
  readonly bySource: Record<string, number>;
  readonly byType: Record<string, number>;
}
