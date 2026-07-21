import type { StatKey } from './stat-key.js';
import { SEED_STATS } from '../../seeds/domain-stats.js';

export const STAT_REGISTRY: Readonly<Record<string, StatKey>> = Object.freeze(
  Object.fromEntries(SEED_STATS.map((s) => [s.id, s])),
);
