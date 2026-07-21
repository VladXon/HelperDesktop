import type { StatKey } from '../registry/stat-key.js';

// ── State conditions (boolean flags on the character/enemy) ──

export interface StateCondition {
  readonly kind: 'state';
  /** Variable name, e.g. 'Moving', 'LowLife', 'FullLife', 'Leeching', 'Burning' */
  readonly var: string;
}

// ── Charge conditions (charge count thresholds) ──

export interface ChargeCondition {
  readonly kind: 'charge';
  /** Charge type: 'frenzy' | 'power' | 'endurance' | 'brutal' | 'affliction' | 'absorption' */
  readonly chargeKind: string;
  /** Minimum charge count (inclusive) */
  readonly min?: number;
  /** Maximum charge count (inclusive) */
  readonly max?: number;
}

// ── Skill tag conditions ──

export interface SkillTagCondition {
  readonly kind: 'skillTag';
  /** Tag that the current skill must have, e.g. 'attack', 'spell', 'projectile', 'aoe' */
  readonly tag: string;
  /** If true, the skill must NOT have this tag */
  readonly negate?: boolean;
}

// ── Actor conditions (cross-actor state checks) ──

export interface ActorCondition {
  readonly kind: 'actor';
  /** Which actor to check: 'player' | 'enemy' | 'minion' */
  readonly actor: 'player' | 'enemy' | 'minion';
  /** Condition variable on that actor */
  readonly var: string;
  /** If true, the actor must NOT have this state */
  readonly negate?: boolean;
}

// ── Stat threshold conditions ──

export interface StatThresholdCondition {
  readonly kind: 'statThreshold';
  /** The stat to check against */
  readonly statKey: StatKey;
  /** Comparison operator */
  readonly operator: 'greaterThan' | 'lessThan' | 'equals' | 'greaterOrEqual' | 'lessOrEqual';
  /** Threshold value */
  readonly value: number;
}

// ── Equipment slot conditions ──

export interface SlotCondition {
  readonly kind: 'slot';
  /** Slot name, e.g. 'Helmet', 'Weapon 1', 'Ring 1' */
  readonly slotName: string;
  /** If true, the item must NOT be in this slot */
  readonly negate?: boolean;
}

// ── Socketed-in conditions ──

export interface SocketedInCondition {
  readonly kind: 'socketedIn';
  /** The item slot where the gem is socketed */
  readonly slotName: string;
  /** If true, the gem must NOT be socketed here */
  readonly negate?: boolean;
}

// ── Global effect conditions ──

export interface GlobalEffectCondition {
  readonly kind: 'globalEffect';
  /** Effect type: 'Aura' | 'Curse' | 'Buff' | 'Debuff' | 'Herald' */
  readonly effectType: string;
  /** If true, this is NOT this effect type */
  readonly negate?: boolean;
}

// ── Temporal conditions ──

export interface RecentlyCondition {
  readonly kind: 'recently';
  /** Event that happened: 'killed', 'blocked', 'crit', 'hit', 'gainedCharge', 'spentMana' */
  readonly event: string;
  /** Time window in milliseconds (default 4000) */
  readonly window?: number;
}

export interface TimerCondition {
  readonly kind: 'timer';
  /** Interval in milliseconds */
  readonly interval: number;
  /** Phase: 'active' or 'inactive' */
  readonly phase: 'active' | 'inactive';
}

export interface DuringActionCondition {
  readonly kind: 'duringAction';
  /** Action: 'casting' | 'channeling' | 'moving' | 'stationary' */
  readonly action: string;
}

// ── Stack conditions ──

export interface StackCondition {
  readonly kind: 'stack';
  /** Stack source: 'poison' | 'rage' | 'withered' | 'fortify' | 'delirium' */
  readonly source: string;
  /** Minimum stacks (inclusive) */
  readonly min?: number;
  /** Maximum stacks (inclusive) */
  readonly max?: number;
}

// ── Union type of all leaf conditions ──

export type ConditionLeaf =
  | StateCondition
  | ChargeCondition
  | SkillTagCondition
  | ActorCondition
  | StatThresholdCondition
  | SlotCondition
  | SocketedInCondition
  | GlobalEffectCondition
  | RecentlyCondition
  | TimerCondition
  | DuringActionCondition
  | StackCondition;
