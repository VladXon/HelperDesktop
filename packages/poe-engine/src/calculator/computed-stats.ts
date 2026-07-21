import type { StatKey } from '../registry/stat-key.js';
import { STAT_REGISTRY } from '../registry/stat-registry.js';

export class ComputedStats {
  private readonly _values: Readonly<Record<string, number>>;

  constructor(values: Readonly<Record<string, number>>) {
    this._values = Object.freeze({ ...values });
  }

  get(stat: StatKey): number {
    if (stat.id in this._values) {
      return this._values[stat.id]!;
    }
    return stat.defaultBase ?? 0;
  }

  has(stat: StatKey): boolean {
    return stat.id in this._values;
  }

  all(): Readonly<Record<string, number>> {
    return this._values;
  }

  get size(): number {
    return Object.keys(this._values).length;
  }
}
