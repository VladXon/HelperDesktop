import type { Modifier } from '../modifiers/modifier.js';
import type { StatKey } from '../registry/stat-key.js';
import type { ModifierSource, ModifierType } from '../modifiers/modifier-types.js';
import type { ModifierFilter, ModDBStats } from './modifier-query.js';
import type { ModifierSnapshot } from './modifier-snapshot.js';
import { createSnapshot } from './modifier-snapshot.js';

type IdSet = Set<string>;

export class ModDB {
  private _store = new Map<string, Modifier>();
  private _byStat = new Map<string, IdSet>();
  private _bySource = new Map<string, IdSet>();
  private _byType = new Map<string, IdSet>();

  get size(): number {
    return this._store.size;
  }

  add(modifier: Modifier): void {
    const prev = this._store.get(modifier.id);
    if (prev) {
      this._removeFromIndex(this._byStat, prev.stat.id, prev.id);
      this._removeFromIndex(this._bySource, prev.source, prev.id);
      this._removeFromIndex(this._byType, prev.type, prev.id);
    }

    this._store.set(modifier.id, modifier);
    this._addToIndex(this._byStat, modifier.stat.id, modifier.id);
    this._addToIndex(this._bySource, modifier.source, modifier.id);
    this._addToIndex(this._byType, modifier.type, modifier.id);
  }

  addMany(modifiers: readonly Modifier[]): void {
    for (const mod of modifiers) {
      this.add(mod);
    }
  }

  remove(id: string): boolean {
    const mod = this._store.get(id);
    if (!mod) return false;

    this._removeFromIndex(this._byStat, mod.stat.id, id);
    this._removeFromIndex(this._bySource, mod.source, id);
    this._removeFromIndex(this._byType, mod.type, id);
    this._store.delete(id);
    return true;
  }

  removeMany(ids: readonly string[]): number {
    let count = 0;
    for (const id of ids) {
      if (this.remove(id)) count++;
    }
    return count;
  }

  clear(): void {
    this._store.clear();
    this._byStat.clear();
    this._bySource.clear();
    this._byType.clear();
  }

  get(id: string): Modifier | undefined {
    return this._store.get(id);
  }

  has(id: string): boolean {
    return this._store.has(id);
  }

  query(filter: ModifierFilter = {}): readonly Modifier[] {
    const candidateIds = this._resolveCandidates(filter);
    const results: Modifier[] = [];

    for (const id of candidateIds) {
      const mod = this._store.get(id);
      if (!mod) continue;
      if (filter.idPattern && !mod.id.includes(filter.idPattern)) continue;
      results.push(mod);
    }

    return results;
  }

  byStat(stat: StatKey): readonly Modifier[] {
    const ids = this._byStat.get(stat.id);
    if (!ids) return [];
    return this._resolveModifiers(ids);
  }

  bySource(source: ModifierSource): readonly Modifier[] {
    const ids = this._bySource.get(source);
    if (!ids) return [];
    return this._resolveModifiers(ids);
  }

  byType(type: ModifierType): readonly Modifier[] {
    const ids = this._byType.get(type);
    if (!ids) return [];
    return this._resolveModifiers(ids);
  }

  all(): readonly Modifier[] {
    return [...this._store.values()];
  }

  snapshot(): ModifierSnapshot {
    return createSnapshot(this.all());
  }

  stats(): ModDBStats {
    const bySource: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const mod of this._store.values()) {
      bySource[mod.source] = (bySource[mod.source] ?? 0) + 1;
      byType[mod.type] = (byType[mod.type] ?? 0) + 1;
    }

    return {
      totalModifiers: this._store.size,
      uniqueStats: this._byStat.size,
      bySource,
      byType,
    };
  }

  private _addToIndex(
    index: Map<string, IdSet>,
    key: string,
    id: string,
  ): void {
    let set = index.get(key);
    if (!set) {
      set = new Set();
      index.set(key, set);
    }
    set.add(id);
  }

  private _removeFromIndex(
    index: Map<string, IdSet>,
    key: string,
    id: string,
  ): void {
    const set = index.get(key);
    if (!set) return;
    set.delete(id);
    if (set.size === 0) index.delete(key);
  }

  private _resolveCandidates(filter: ModifierFilter): IdSet {
    const sets: IdSet[] = [];

    if (filter.stat) {
      const s = this._byStat.get(filter.stat.id);
      if (!s) return new Set();
      sets.push(s);
    }

    if (filter.source) {
      const src = filter.source;
      if (Array.isArray(src)) {
        const union = new Set<string>();
        for (const s of src) {
          const ids = this._bySource.get(s);
          if (ids) for (const id of ids) union.add(id);
        }
        if (union.size === 0) return new Set();
        sets.push(union);
      } else {
        const ids = this._bySource.get(src as string);
        if (!ids) return new Set();
        sets.push(ids);
      }
    }

    if (filter.type) {
      const typ = filter.type;
      if (Array.isArray(typ)) {
        const union = new Set<string>();
        for (const t of typ) {
          const ids = this._byType.get(t);
          if (ids) for (const id of ids) union.add(id);
        }
        if (union.size === 0) return new Set();
        sets.push(union);
      } else {
        const ids = this._byType.get(typ as string);
        if (!ids) return new Set();
        sets.push(ids);
      }
    }

    if (sets.length === 0) {
      return new Set(this._store.keys());
    }

    if (sets.length === 1) {
      return sets[0]!;
    }

    const smallest = sets.reduce((a, b) => (a.size < b.size ? a : b));
    const result = new Set<string>();
    for (const id of smallest) {
      if (sets.every((s) => s.has(id))) {
        result.add(id);
      }
    }
    return result;
  }

  private _resolveModifiers(ids: IdSet): Modifier[] {
    const result: Modifier[] = [];
    for (const id of ids) {
      const mod = this._store.get(id);
      if (mod) result.push(mod);
    }
    return result;
  }
}

export function createModDB(): ModDB {
  return new ModDB();
}
