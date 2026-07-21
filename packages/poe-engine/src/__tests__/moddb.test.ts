import { describe, it, expect } from 'vitest';
import {
  createModDB,
  createModifier,
  createSnapshot,
  resolveModifiers,
  aggregateModifiers,
  defaultConditionState,
  S,
} from '../index.js';
import type { ModDB } from '../moddb/moddb.js';

function makeLifeFlat(value: number, source: string = 'item') {
  return createModifier({
    source: source as 'item',
    type: 'flat',
    stat: S['defense.life'],
    value,
    meta: { name: `Life +${value}` },
  });
}

function makeLifeInc(value: number) {
  return createModifier({
    source: 'passiveTree',
    type: 'increased',
    stat: S['defense.life'],
    value,
    meta: { name: `${value}% inc life` },
  });
}

function makeFireDamage(value: number) {
  return createModifier({
    source: 'passiveTree',
    type: 'increased',
    stat: S['offense.fireDamage'],
    value,
    meta: { name: `${value}% fire` },
  });
}

function makeCI() {
  return createModifier({
    source: 'keystone',
    type: 'override',
    stat: S['mechanic.keystone_ci'],
    value: 1,
    meta: { name: 'Chaos Inoculation' },
  });
}

// ─── CREATION & BASIC OPERATIONS ──────────────────────────

describe('ModDB — creation', () => {
  it('starts empty', () => {
    const db = createModDB();
    expect(db.size).toBe(0);
    expect(db.all()).toEqual([]);
  });

  it('can add a single modifier', () => {
    const db = createModDB();
    const mod = makeLifeFlat(50);
    db.add(mod);
    expect(db.size).toBe(1);
    expect(db.get(mod.id)).toBe(mod);
    expect(db.has(mod.id)).toBe(true);
  });

  it('can add many modifiers', () => {
    const db = createModDB();
    const mods = [makeLifeFlat(50), makeLifeFlat(70), makeFireDamage(20)];
    db.addMany(mods);
    expect(db.size).toBe(3);
  });

  it('duplicate id overwrites', () => {
    const db = createModDB();
    const first = createModifier({
      source: 'item',
      type: 'flat',
      stat: S['defense.life'],
      value: 50,
      meta: { name: 'First' },
      id: 'test-mod',
    });
    const second = createModifier({
      source: 'item',
      type: 'flat',
      stat: S['defense.life'],
      value: 99,
      meta: { name: 'Second' },
      id: 'test-mod',
    });

    db.add(first);
    db.add(second);
    expect(db.size).toBe(1);
    expect(db.get('test-mod')!.value).toBe(99);
    expect(db.get('test-mod')!.meta.name).toBe('Second');
  });
});

// ─── REMOVAL ──────────────────────────────────────────────

describe('ModDB — removal', () => {
  it('removes by id', () => {
    const db = createModDB();
    const mod = makeLifeFlat(50);
    db.add(mod);
    const removed = db.remove(mod.id);
    expect(removed).toBe(true);
    expect(db.size).toBe(0);
  });

  it('remove nonexistent returns false', () => {
    const db = createModDB();
    expect(db.remove('nonexistent')).toBe(false);
  });

  it('removeMany returns correct count', () => {
    const db = createModDB();
    const mods = [makeLifeFlat(50), makeLifeFlat(70), makeFireDamage(20)];
    db.addMany(mods);

    const count = db.removeMany([mods[0].id, 'nonexistent', mods[2].id]);
    expect(count).toBe(2);
    expect(db.size).toBe(1);
  });

  it('clear empties everything', () => {
    const db = createModDB();
    db.addMany([makeLifeFlat(50), makeFireDamage(20)]);
    expect(db.size).toBe(2);

    db.clear();
    expect(db.size).toBe(0);
    expect(db.all()).toEqual([]);
  });

  it('removal cleans up indices', () => {
    const db = createModDB();
    const mod = makeLifeFlat(50);
    db.add(mod);
    db.remove(mod.id);

    expect(db.byStat(S['defense.life'])).toEqual([]);
    expect(db.bySource('item')).toEqual([]);
    expect(db.byType('flat')).toEqual([]);
  });
});

// ─── QUERIES — byStat ─────────────────────────────────────

describe('ModDB — query by stat', () => {
  it('finds all modifiers for a stat', () => {
    const db = createModDB();
    const m1 = makeLifeFlat(50);
    const m2 = makeLifeInc(10);
    const m3 = makeFireDamage(20);

    db.addMany([m1, m2, m3]);

    const life = db.query({ stat: S['defense.life'] });
    expect(life).toHaveLength(2);
    expect(life.map((m) => m.id).sort()).toEqual([m1.id, m2.id].sort());
  });

  it('returns empty for unmodified stat', () => {
    const db = createModDB();
    db.add(makeLifeFlat(50));

    expect(db.query({ stat: S['offense.fireDamage'] })).toEqual([]);
  });

  it('byStat convenience method works', () => {
    const db = createModDB();
    const m = makeLifeFlat(50);
    db.add(m);

    expect(db.byStat(S['defense.life'])).toEqual([m]);
  });
});

// ─── QUERIES — bySource ───────────────────────────────────

describe('ModDB — query by source', () => {
  it('filters single source', () => {
    const db = createModDB();
    const lifePassive = createModifier({
      source: 'passiveTree',
      type: 'increased',
      stat: S['defense.life'],
      value: 10,
      meta: { name: 'Life passive' },
    });
    const lifeItem = makeLifeFlat(50);
    const keystone = makeCI();

    db.addMany([lifePassive, lifeItem, keystone]);

    const passive = db.query({ source: 'passiveTree' });
    expect(passive).toHaveLength(1);
    expect(passive[0].id).toBe(lifePassive.id);
  });

  it('filters multiple sources (union)', () => {
    const db = createModDB();
    const lifePassive = createModifier({
      source: 'passiveTree',
      type: 'increased',
      stat: S['defense.life'],
      value: 10,
      meta: { name: 'Life passive' },
    });
    const lifeItem = makeLifeFlat(50);
    const keystone = makeCI();

    db.addMany([lifePassive, lifeItem, keystone]);

    const result = db.query({ source: ['passiveTree', 'keystone'] });
    expect(result).toHaveLength(2);
  });

  it('bySource convenience method works', () => {
    const db = createModDB();
    const m = makeLifeFlat(50);
    db.add(m);

    expect(db.bySource('item')).toEqual([m]);
  });
});

// ─── QUERIES — byType ─────────────────────────────────────

describe('ModDB — query by type', () => {
  it('filters single type', () => {
    const db = createModDB();
    const flat = makeLifeFlat(50);
    const inc = makeLifeInc(10);
    const more = createModifier({
      source: 'supportGem',
      type: 'more',
      stat: S['defense.life'],
      value: 20,
      meta: { name: 'More' },
    });

    db.addMany([flat, inc, more]);

    expect(db.query({ type: 'flat' })).toHaveLength(1);
    expect(db.query({ type: 'increased' })).toHaveLength(1);
    expect(db.query({ type: 'more' })).toHaveLength(1);
  });

  it('filters multiple types (union)', () => {
    const db = createModDB();
    db.addMany([makeLifeFlat(50), makeLifeInc(10)]);

    const result = db.query({ type: ['flat', 'increased'] });
    expect(result).toHaveLength(2);
  });

  it('byType convenience method works', () => {
    const db = createModDB();
    const m = makeLifeFlat(50);
    db.add(m);

    expect(db.byType('flat')).toEqual([m]);
  });
});

// ─── QUERIES — combined ───────────────────────────────────

describe('ModDB — combined queries', () => {
  it('stat + source intersection', () => {
    const db = createModDB();
    const lifeTree = createModifier({
      source: 'passiveTree',
      type: 'increased',
      stat: S['defense.life'],
      value: 10,
      meta: { name: 'Life from tree' },
    });
    const lifeItem = makeLifeFlat(50);
    const fireTree = makeFireDamage(20);

    db.addMany([lifeTree, lifeItem, fireTree]);

    const result = db.query({
      stat: S['defense.life'],
      source: 'passiveTree',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(lifeTree.id);
  });

  it('stat + type intersection', () => {
    const db = createModDB();
    const flat = makeLifeFlat(50);
    const inc = makeLifeInc(10);
    const fireInc = makeFireDamage(20);

    db.addMany([flat, inc, fireInc]);

    const result = db.query({
      stat: S['defense.life'],
      type: 'increased',
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(inc);
  });

  it('source + type intersection', () => {
    const db = createModDB();
    const lifePassive = makeLifeInc(10);
    const firePassive = makeFireDamage(20);

    db.addMany([lifePassive, firePassive, makeLifeFlat(50)]);

    const result = db.query({
      source: 'passiveTree',
      type: 'increased',
    });
    expect(result).toHaveLength(2);
  });

  it('all three: stat + source + type', () => {
    const db = createModDB();
    db.addMany([makeLifeInc(10), makeLifeInc(20), makeFireDamage(30), makeCI()]);

    const result = db.query({
      stat: S['defense.life'],
      source: 'passiveTree',
      type: 'increased',
    });
    expect(result).toHaveLength(2);
    expect(result.every((m) => m.stat.id === 'defense.life')).toBe(true);
    expect(result.every((m) => m.source === 'passiveTree')).toBe(true);
    expect(result.every((m) => m.type === 'increased')).toBe(true);
  });

  it('idPattern filter', () => {
    const db = createModDB();
    db.addMany([makeLifeFlat(50), makeLifeInc(10), makeFireDamage(20)]);

    const result = db.query({ idPattern: 'passiveTree.increased' });
    expect(result).toHaveLength(2);
    expect(result.every((m) => m.type === 'increased')).toBe(true);
  });

  it('combined: stat + idPattern', () => {
    const db = createModDB();
    db.addMany([makeLifeFlat(50), makeLifeInc(10), makeFireDamage(20)]);

    const result = db.query({ stat: S['defense.life'], idPattern: 'inc' });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('increased');
  });

  it('empty query returns all', () => {
    const db = createModDB();
    const mods = [makeLifeFlat(50), makeFireDamage(20)];
    db.addMany(mods);

    expect(db.query()).toHaveLength(2);
  });
});

// ─── SNAPSHOTS ────────────────────────────────────────────

describe('ModDB — snapshots', () => {
  it('creates immutable snapshot', () => {
    const db = createModDB();
    db.add(makeLifeFlat(50));

    const snap = db.snapshot();
    expect(snap.size).toBe(1);
    expect(snap.modifiers).toHaveLength(1);
    expect(snap.timestamp).toBeGreaterThan(0);

    expect(() => {
      (snap as Record<string, unknown>).modifiers = [];
    }).toThrow();
  });

  it('snapshot captures point-in-time state', () => {
    const db = createModDB();
    db.add(makeLifeFlat(50));
    const snap = db.snapshot();

    db.add(makeLifeFlat(100));

    expect(snap.size).toBe(1);
    expect(db.size).toBe(2);
  });

  it('createSnapshot standalone works', () => {
    const mods = [makeLifeFlat(50), makeFireDamage(20)];
    const snap = createSnapshot(mods, 1000);

    expect(snap.size).toBe(2);
    expect(snap.timestamp).toBe(1000);
    expect(snap.modifiers[0]).toBe(mods[0]);
  });
});

// ─── STATS ────────────────────────────────────────────────

describe('ModDB — stats', () => {
  it('reports correct statistics', () => {
    const db = createModDB();
    db.addMany([
      makeLifeFlat(50),
      makeLifeInc(10),
      makeFireDamage(20),
      makeCI(),
    ]);

    const s = db.stats();
    expect(s.totalModifiers).toBe(4);
    expect(s.uniqueStats).toBe(3);
    expect(s.bySource['item']).toBe(1);
    expect(s.bySource['passiveTree']).toBe(2);
    expect(s.bySource['keystone']).toBe(1);
    expect(s.byType['flat']).toBe(1);
    expect(s.byType['increased']).toBe(2);
    expect(s.byType['override']).toBe(1);
  });

  it('stats for empty db', () => {
    const db = createModDB();
    const s = db.stats();
    expect(s.totalModifiers).toBe(0);
    expect(s.uniqueStats).toBe(0);
    expect(s.bySource).toEqual({});
    expect(s.byType).toEqual({});
  });
});

// ─── INTEGRATION WITH PIPELINE ────────────────────────────

describe('ModDB — pipeline integration', () => {
  it('db.all() feeds into resolveModifiers + aggregateModifiers', () => {
    const db = createModDB();
    db.addMany([
      makeLifeFlat(1000),
      makeLifeInc(20),
    ]);

    const all = db.all();
    const resolved = resolveModifiers(all, defaultConditionState());
    const result = aggregateModifiers(resolved);

    expect(result['defense.life']).toBe(1000 * (1 + 20 / 100));
  });

  it('db.query(stat) feeds specific stat into pipeline', () => {
    const db = createModDB();
    db.addMany([
      makeLifeFlat(1000),
      makeLifeInc(30),
      makeFireDamage(50),
    ]);

    const lifeMods = db.byStat(S['defense.life']);
    const resolved = resolveModifiers(lifeMods, defaultConditionState());
    const result = aggregateModifiers(resolved);

    expect(result['defense.life']).toBe(1000 * (1 + 30 / 100));
    expect(result['offense.fireDamage']).toBeUndefined();
  });

  it('snapshot is immutable and streamable to pipeline', () => {
    const db = createModDB();
    db.add(makeLifeFlat(500));

    const snap = db.snapshot();

    db.add(makeLifeFlat(999));

    const resolved = resolveModifiers(snap.modifiers, defaultConditionState());
    const result = aggregateModifiers(resolved);

    expect(result['defense.life']).toBe(500);
  });
});
