import { describe, it, expect } from 'vitest';
import {
  explainBuild,
  explainStat,
  explainAllStats,
  explainModifier,
  explainAllModifiers,
  createModifier,
  createSnapshot,
  calculateBuild,
  ComputedStats,
  ModDB,
  createModDB,
  S,
  defaultConditionState,
  state as condState,
  chargeScale,
} from '../index.js';
import type { ConditionState, AIProvider, AIRequest, AIResponse, AIMessage, AIUsage } from '../index.js';
import {
  buildAnalysisSystemPrompt,
  buildAnalysisUserPrompt,
} from '../explanation/prompts/build-analysis.js';
import {
  upgradeAdviceSystemPrompt,
  upgradeAdviceUserPrompt,
} from '../explanation/prompts/upgrade-advice.js';
import {
  defenseAnalysisSystemPrompt,
  defenseAnalysisUserPrompt,
} from '../explanation/prompts/defense-analysis.js';
import {
  damageAnalysisSystemPrompt,
  damageAnalysisUserPrompt,
} from '../explanation/prompts/damage-analysis.js';
import {
  comparisonSystemPrompt,
  comparisonUserPrompt,
} from '../explanation/prompts/comparison.js';

function makeState(overrides: Partial<ConditionState> = {}): ConditionState {
  return { ...defaultConditionState(), ...overrides };
}

// ─── STAT EXPLAINER ──────────────────────────────────────

describe('explainStat', () => {
  it('explains a simple flat modifier', () => {
    const mod = createModifier({
      source: 'item',
      type: 'flat',
      stat: S['defense.life'],
      value: 500,
      meta: { name: 'Body Armour' },
    });

    const snapshot = createSnapshot([mod]);
    const computed = new ComputedStats({ 'defense.life': 1500 });

    const exp = explainStat(S['defense.life'], snapshot, makeState(), computed);

    expect(exp.stat.id).toBe('defense.life');
    expect(exp.value).toBe(1500);
    expect(exp.breakdown.base).toBe(0);
    expect(exp.breakdown.flatContributions).toHaveLength(1);
    expect(exp.breakdown.flatContributions[0]!.label).toBe('Body Armour');
    expect(exp.breakdown.flatContributions[0]!.value).toBe(500);
    expect(exp.breakdown.flatContributions[0]!.source).toBe('item');
    expect(exp.breakdown.increasedContributions).toHaveLength(0);
    expect(exp.breakdown.moreContributions).toHaveLength(0);
    expect(exp.breakdown.lessContributions).toHaveLength(0);
    expect(exp.breakdown.overrideContributions).toHaveLength(0);
    expect(exp.breakdown.formula).toContain('+500');
    expect(exp.explanation).toContain('Body Armour');
    expect(exp.explanation).toContain('Maximum Life');
  });

  it('explains with increased modifier', () => {
    const flatMod = createModifier({
      source: 'item',
      type: 'flat',
      stat: S['defense.life'],
      value: 100,
      meta: { name: 'Gear' },
    });
    const incMod = createModifier({
      source: 'passiveTree',
      type: 'increased',
      stat: S['defense.life'],
      value: 80,
      meta: { name: 'Life Wheel' },
    });

    const snapshot = createSnapshot([flatMod, incMod]);
    const computed = new ComputedStats({ 'defense.life': 180 });

    const exp = explainStat(S['defense.life'], snapshot, makeState(), computed);

    expect(exp.breakdown.flatContributions).toHaveLength(1);
    expect(exp.breakdown.increasedContributions).toHaveLength(1);
    expect(exp.breakdown.increasedContributions[0]!.value).toBe(80);
    expect(exp.breakdown.formula).toContain('+80%');
    expect(exp.explanation).toContain('increased');
  });

  it('explains more and less modifiers', () => {
    const flatMod = createModifier({
      source: 'item',
      type: 'flat',
      stat: S['defense.life'],
      value: 200,
      meta: { name: 'Gear' },
    });
    const moreMod = createModifier({
      source: 'supportGem',
      type: 'more',
      stat: S['offense.spellDamage'],
      value: 30,
      meta: { name: 'Pain Attunement' },
    });
    const lessMod = createModifier({
      source: 'supportGem',
      type: 'less',
      stat: S['offense.spellDamage'],
      value: 20,
      meta: { name: 'Spell Echo' },
    });

    const snapshot = createSnapshot([flatMod, moreMod, lessMod]);
    const computed = new ComputedStats({ 'defense.life': 200, 'offense.spellDamage': 104 });

    const lifeExp = explainStat(S['defense.life'], snapshot, makeState(), computed);
    expect(lifeExp.breakdown.moreContributions).toHaveLength(0);

    const dmgExp = explainStat(S['offense.spellDamage'], snapshot, makeState(), computed);
    expect(dmgExp.breakdown.moreContributions).toHaveLength(1);
    expect(dmgExp.breakdown.moreContributions[0]!.value).toBe(30);
    expect(dmgExp.breakdown.lessContributions).toHaveLength(1);
    expect(dmgExp.breakdown.lessContributions[0]!.value).toBe(20);
    expect(dmgExp.breakdown.formula).toContain('+30%');
    expect(dmgExp.breakdown.formula).toContain('-20%');
  });

  it('explains override modifier', () => {
    const mod = createModifier({
      source: 'keystone',
      type: 'override',
      stat: S['defense.life'],
      value: 1,
      meta: { name: 'Chaos Inoculation' },
    });

    const snapshot = createSnapshot([mod]);
    const computed = new ComputedStats({ 'defense.life': 1 });

    const exp = explainStat(S['defense.life'], snapshot, makeState(), computed);

    expect(exp.breakdown.overrideContributions).toHaveLength(1);
    expect(exp.breakdown.formula).toContain('override');
    expect(exp.explanation).toContain('overridden');
  });

  it('handles conditional modifier', () => {
    const mod = createModifier({
      source: 'keystone',
      type: 'more',
      stat: S['offense.spellDamage'],
      value: 30,
      condition: condState('LowLife'),
      meta: { name: 'Pain Attunement' },
    });

    const snapshot = createSnapshot([mod]);

    const activeState = makeState({ playerStates: new Map([['LowLife', true]]) });
    const inactiveState = makeState({ playerStates: new Map([['LowLife', false]]) });

    const activeExp = explainStat(
      S['offense.spellDamage'],
      snapshot,
      activeState,
      new ComputedStats({ 'offense.spellDamage': 130 }),
    );
    expect(activeExp.breakdown.moreContributions).toHaveLength(1);
    expect(activeExp.breakdown.moreContributions[0]!.value).toBe(30);

    const inactiveExp = explainStat(
      S['offense.spellDamage'],
      snapshot,
      inactiveState,
      new ComputedStats({ 'offense.spellDamage': 100 }),
    );
    expect(inactiveExp.breakdown.moreContributions).toHaveLength(0);
  });

  it('handles scaled modifier with charges', () => {
    const mod = createModifier({
      source: 'charge',
      type: 'increased',
      stat: S['offense.attackSpeed'],
      value: 4,
      scale: chargeScale('frenzy', 1),
      meta: { name: 'Frenzy Charges' },
    });

    const snapshot = createSnapshot([mod]);
    const cState = makeState({ charges: new Map([['frenzy', 3]]) });
    const computed = new ComputedStats({ 'offense.attackSpeed': 112 });

    const exp = explainStat(S['offense.attackSpeed'], snapshot, cState, computed);

    expect(exp.breakdown.increasedContributions).toHaveLength(1);
    expect(exp.breakdown.increasedContributions[0]!.value).toBe(12);
  });

  it('handles stat with no modifiers gracefully', () => {
    const snapshot = createSnapshot([]);
    const computed = new ComputedStats({});

    const exp = explainStat(S['defense.life'], snapshot, makeState(), computed);

    expect(exp.value).toBe(0);
    expect(exp.breakdown.base).toBe(0);
    expect(exp.breakdown.flatContributions).toHaveLength(0);
    expect(exp.explanation).toContain('no modifiers');
  });

  it('handles product aggregation stat', () => {
    const mod = createModifier({
      source: 'buff',
      type: 'increased',
      stat: S['offense.actionSpeed'],
      value: 10,
      meta: { name: 'Tailwind' },
    });

    const snapshot = createSnapshot([mod]);
    const computed = new ComputedStats({ 'offense.actionSpeed': 1.1 });

    const exp = explainStat(S['offense.actionSpeed'], snapshot, makeState(), computed);

    expect(exp.breakdown.base).toBe(1);
    expect(exp.breakdown.increasedContributions).toHaveLength(1);
  });
});

// ─── EXPLAIN ALL STATS ──────────────────────────────────

describe('explainAllStats', () => {
  it('explains multiple stats across categories', () => {
    const lifeMod = createModifier({
      source: 'item',
      type: 'flat',
      stat: S['defense.life'],
      value: 200,
      meta: { name: 'Helmet' },
    });
    const fireMod = createModifier({
      source: 'passiveTree',
      type: 'flat',
      stat: S['resistance.fire'],
      value: 30,
      meta: { name: 'Fire Walker' },
    });

    const snapshot = createSnapshot([lifeMod, fireMod]);
    const computed = new ComputedStats({ 'defense.life': 200, 'resistance.fire': 30 });

    const explanations = explainAllStats(snapshot, makeState(), computed);

    expect(explanations).toHaveLength(2);
    const ids = explanations.map((e) => e.stat.id);
    expect(ids).toContain('defense.life');
    expect(ids).toContain('resistance.fire');
  });

  it('returns empty array for empty snapshot', () => {
    const snapshot = createSnapshot([]);
    const computed = new ComputedStats({});

    const explanations = explainAllStats(snapshot, makeState(), computed);

    expect(explanations).toHaveLength(0);
  });
});

// ─── MODIFIER EXPLAINER ─────────────────────────────────

describe('explainModifier', () => {
  it('explains always-active modifier', () => {
    const mod = createModifier({
      source: 'item',
      type: 'flat',
      stat: S['defense.life'],
      value: 100,
      meta: { name: 'Ring' },
    });

    const exp = explainModifier(mod, makeState());

    expect(exp.active).toBe(true);
    expect(exp.effectiveValue).toBe(100);
    expect(exp.reason).toContain('always active');
    expect(exp.reason).toContain('Ring');
  });

  it('explains active conditional modifier', () => {
    const mod = createModifier({
      source: 'keystone',
      type: 'more',
      stat: S['offense.spellDamage'],
      value: 30,
      condition: condState('LowLife'),
      meta: { name: 'Pain Attunement' },
    });

    const cState = makeState({ playerStates: new Map([['LowLife', true]]) });
    const exp = explainModifier(mod, cState);

    expect(exp.active).toBe(true);
    expect(exp.effectiveValue).toBe(30);
    expect(exp.reason).toContain('active');
    expect(exp.reason).toContain('LowLife');
  });

  it('explains inactive conditional modifier', () => {
    const mod = createModifier({
      source: 'keystone',
      type: 'more',
      stat: S['offense.spellDamage'],
      value: 30,
      condition: condState('LowLife'),
      meta: { name: 'Pain Attunement' },
    });

    const cState = makeState({ playerStates: new Map([['LowLife', false]]) });
    const exp = explainModifier(mod, cState);

    expect(exp.active).toBe(false);
    expect(exp.effectiveValue).toBe(0);
    expect(exp.reason).toContain('inactive');
    expect(exp.reason).toContain('not met');
  });

  it('explains scaled modifier', () => {
    const mod = createModifier({
      source: 'charge',
      type: 'increased',
      stat: S['offense.attackSpeed'],
      value: 4,
      scale: chargeScale('frenzy', 1),
      meta: { name: 'Frenzy Charges' },
    });

    const cState = makeState({ charges: new Map([['frenzy', 3]]) });
    const exp = explainModifier(mod, cState);

    expect(exp.active).toBe(true);
    expect(exp.effectiveValue).toBe(12);
    expect(exp.reason).toContain('scaled');
  });
});

// ─── EXPLAIN ALL MODIFIERS ──────────────────────────────

describe('explainAllModifiers', () => {
  it('explains a list of modifiers', () => {
    const mods = [
      createModifier({
        source: 'item',
        type: 'flat',
        stat: S['defense.life'],
        value: 100,
        meta: { name: 'Ring' },
      }),
      createModifier({
        source: 'item',
        type: 'flat',
        stat: S['defense.energyShield'],
        value: 50,
        meta: { name: 'Amulet' },
      }),
    ];

    const explanations = explainAllModifiers(mods, makeState());

    expect(explanations).toHaveLength(2);
    expect(explanations[0]!.active).toBe(true);
    expect(explanations[1]!.active).toBe(true);
  });
});

// ─── BUILD EXPLAINER ────────────────────────────────────

describe('explainBuild', () => {
  it('produces a complete explanation result', () => {
    const mod = createModifier({
      source: 'item',
      type: 'flat',
      stat: S['defense.life'],
      value: 500,
      meta: { name: 'Body Armour' },
    });

    const db = createModDB();
    db.add(mod);

    const result = calculateBuild({
      baseStats: { 'defense.life': 1000 },
      modSnapshot: db.snapshot(),
      conditionState: makeState(),
    });

    const explanation = explainBuild({
      stats: result.stats,
      layers: result.layers,
      modifiers: db.snapshot(),
      conditionState: makeState(),
    });

    expect(explanation.summary).toBeTruthy();
    expect(explanation.summary).toContain('Your build has');
    expect(explanation.stats).toHaveLength(1);
    expect(explanation.stats[0]!.stat.id).toBe('defense.life');
    expect(explanation.stats[0]!.value).toBe(1500);
    expect(explanation.modifiers).toHaveLength(2); // base + item
    expect(explanation.conditions).toHaveLength(0);
  });

  it('handles conditional modifiers with conditions section', () => {
    const condMod = createModifier({
      source: 'keystone',
      type: 'more',
      stat: S['offense.spellDamage'],
      value: 30,
      condition: condState('LowLife'),
      meta: { name: 'Pain Attunement' },
    });

    const db = createModDB();
    db.add(condMod);

    const cState = makeState({ playerStates: new Map([['LowLife', false]]) });

    const result = calculateBuild({
      baseStats: { 'offense.spellDamage': 100 },
      modSnapshot: db.snapshot(),
      conditionState: cState,
    });

    const explanation = explainBuild({
      stats: result.stats,
      layers: result.layers,
      modifiers: db.snapshot(),
      conditionState: cState,
    });

    expect(explanation.conditions).toHaveLength(1);
    expect(explanation.conditions[0]!.active).toBe(false);
    expect(explanation.conditions[0]!.condition).toContain('LowLife');
    expect(explanation.summary).toContain('inactive');
  });

  it('marks all active when conditions are met', () => {
    const condMod = createModifier({
      source: 'keystone',
      type: 'more',
      stat: S['offense.spellDamage'],
      value: 30,
      condition: condState('LowLife'),
      meta: { name: 'Pain Attunement' },
    });

    const db = createModDB();
    db.add(condMod);

    const cState = makeState({ playerStates: new Map([['LowLife', true]]) });

    const result = calculateBuild({
      baseStats: { 'offense.spellDamage': 100 },
      modSnapshot: db.snapshot(),
      conditionState: cState,
    });

    const explanation = explainBuild({
      stats: result.stats,
      layers: result.layers,
      modifiers: db.snapshot(),
      conditionState: cState,
    });

    expect(explanation.conditions).toHaveLength(1);
    expect(explanation.conditions[0]!.active).toBe(true);
    expect(explanation.summary).toContain('all');
  });

  it('works with an empty build', () => {
    const db = createModDB();

    const result = calculateBuild({
      baseStats: {},
      modSnapshot: db.snapshot(),
      conditionState: makeState(),
    });

    const explanation = explainBuild({
      stats: result.stats,
      layers: result.layers,
      modifiers: db.snapshot(),
      conditionState: makeState(),
    });

    expect(explanation.summary).toBeTruthy();
    expect(explanation.stats).toHaveLength(0);
    expect(explanation.modifiers).toHaveLength(0);
    expect(explanation.conditions).toHaveLength(0);
  });

  it('deduplicates identical conditions', () => {
    const mod1 = createModifier({
      source: 'item',
      type: 'flat',
      stat: S['defense.life'],
      value: 100,
      condition: condState('LowLife'),
      meta: { name: 'Item 1' },
    });
    const mod2 = createModifier({
      source: 'item',
      type: 'flat',
      stat: S['defense.energyShield'],
      value: 50,
      condition: condState('LowLife'),
      meta: { name: 'Item 2' },
    });

    const db = createModDB();
    db.addMany([mod1, mod2]);

    const cState = makeState({ playerStates: new Map([['LowLife', false]]) });

    const result = calculateBuild({
      baseStats: { 'defense.life': 500, 'defense.energyShield': 200 },
      modSnapshot: db.snapshot(),
      conditionState: cState,
    });

    const explanation = explainBuild({
      stats: result.stats,
      layers: result.layers,
      modifiers: db.snapshot(),
      conditionState: cState,
    });

    expect(explanation.conditions).toHaveLength(1);
  });
});

// ─── AI PROVIDER TYPES ───────────────────────────────────

describe('AIProvider types', () => {
  it('AIProvider interface is exported as a type', () => {
    const provider: AIProvider = {
      name: 'test',
      async complete(request) {
        return { content: 'ok', model: 'test' };
      },
    };
    expect(provider.name).toBe('test');
    expect(provider.complete).toBeTypeOf('function');
  });

  it('AIMessage, AIRequest, AIResponse, AIUsage types are checkable', () => {
    const msg: AIMessage = { role: 'user', content: 'hello' };
    const req: AIRequest = { messages: [msg], temperature: 0.5, maxTokens: 100 };
    const usage: AIUsage = { promptTokens: 10, completionTokens: 20 };
    const res: AIResponse = { content: 'hi', usage, model: 'test-model' };

    expect(msg.role).toBe('user');
    expect(req.messages).toHaveLength(1);
    expect(usage.promptTokens).toBe(10);
    expect(res.content).toBe('hi');
  });
});

// ─── PROMPT TEMPLATES ───────────────────────────────────

describe('prompt templates', () => {
  it('buildAnalysis prompts are non-empty', () => {
    const sysPrompt = buildAnalysisSystemPrompt();
    expect(sysPrompt).toBeTruthy();
    expect(sysPrompt.length).toBeGreaterThan(50);

    const userPrompt = buildAnalysisUserPrompt({
      buildName: 'Test Build',
      className: 'Witch',
      ascendancy: 'Necromancer',
      level: 90,
      mainSkill: 'Raise Spectre',
      keyStats: { life: 4000, es: 2000 },
      statBreakdown: 'Life: 4000',
      modifierSummary: '3 modifiers active',
    });

    expect(userPrompt).toBeTruthy();
    expect(userPrompt).toContain('Test Build');
    expect(userPrompt).toContain('Raise Spectre');
  });

  it('upgradeAdvice prompts are non-empty', () => {
    expect(upgradeAdviceSystemPrompt()).toBeTruthy();

    const userPrompt = upgradeAdviceUserPrompt({
      currentStats: { life: 3500 },
      weaknesses: ['Low fire resistance'],
      budget: 'mid',
      targetContent: 'T16 maps',
    });

    expect(userPrompt).toContain('Low fire resistance');
    expect(userPrompt).toContain('mid');
  });

  it('defenseAnalysis prompts are non-empty', () => {
    expect(defenseAnalysisSystemPrompt()).toBeTruthy();

    const userPrompt = defenseAnalysisUserPrompt({
      life: 4000,
      energyShield: 1000,
      combinedPool: 5000,
      resistances: { fire: { uncapped: 80, capped: 75 }, cold: { uncapped: 90, capped: 76 } },
      armour: 5000,
      evasion: 3000,
      block: 0,
      spellSuppression: 0,
      recovery: 'Life regen 200/s',
      ehp: { physical: 12000, elemental: 25000 },
      problems: ['Low chaos resistance'],
    });

    expect(userPrompt).toContain('4000');
    expect(userPrompt).toContain('Low chaos resistance');
  });

  it('damageAnalysis prompts are non-empty', () => {
    expect(damageAnalysisSystemPrompt()).toBeTruthy();

    const userPrompt = damageAnalysisUserPrompt({
      mainSkill: 'Fireball',
      totalDps: 500000,
      bossDps: 350000,
      damageBreakdown: { fire: 400000, ignite: 100000 },
      critChance: 45,
      critMultiplier: 380,
      attackSpeed: 1.5,
      penetration: 20,
      isDotBuild: false,
      primaryScalars: [
        { name: 'Cast Speed', value: 1.5, efficiency: 2.1 },
        { name: 'Fire Damage', value: 200, efficiency: 1.8 },
      ],
      bottlenecks: ['Mana sustain'],
    });

    expect(userPrompt).toContain('Fireball');
    expect(userPrompt).toContain('500000');
    expect(userPrompt).toContain('Mana sustain');
  });

  it('comparison prompts are non-empty', () => {
    expect(comparisonSystemPrompt()).toBeTruthy();

    const userPrompt = comparisonUserPrompt({
      buildA: { name: 'RF Inquisitor', stats: { life: 5000, dps: 1000000 } },
      buildB: { name: 'EA Ballista', stats: { life: 3500, dps: 5000000 } },
      context: 'Mapping and bossing',
    });

    expect(userPrompt).toContain('RF Inquisitor');
    expect(userPrompt).toContain('EA Ballista');
  });
});
