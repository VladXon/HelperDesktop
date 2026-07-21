import type { GemQualityVariant } from '../models/skill.model.js';
import type { ModifierStat } from '../../items/modifier.model.js';

interface QualityEffect {
  variant: GemQualityVariant | 'any';
  stat: string;
  perQuality: number;
  type: 'increased' | 'flat' | 'more';
}

interface GemQualityData {
  name: string;
  effects: QualityEffect[];
}

const QUALITY_DATA: Record<string, GemQualityData> = {
  boneshatter: {
    name: 'Boneshatter',
    effects: [
      { variant: 'regular', stat: 'attackSpeed', perQuality: 0.5, type: 'increased' },
      { variant: 'anomalous', stat: 'aoeRadius', perQuality: 0.5, type: 'increased' },
      { variant: 'divergent', stat: 'traumaDamage', perQuality: 1.0, type: 'increased' },
    ],
  },
  'fire trap': {
    name: 'Fire Trap',
    effects: [
      { variant: 'regular', stat: 'fireDamage', perQuality: 0.5, type: 'increased' },
      { variant: 'anomalous', stat: 'trapTriggerRadius', perQuality: 1.0, type: 'increased' },
      { variant: 'divergent', stat: 'igniteChance', perQuality: 1.0, type: 'flat' },
    ],
  },
  'righteous fire': {
    name: 'Righteous Fire',
    effects: [
      { variant: 'regular', stat: 'burningDamage', perQuality: 1.0, type: 'increased' },
      { variant: 'anomalous', stat: 'areaDamage', perQuality: 1.0, type: 'increased' },
      { variant: 'divergent', stat: 'spellDamage', perQuality: 0.5, type: 'increased' },
    ],
  },
  fireball: {
    name: 'Fireball',
    effects: [
      { variant: 'regular', stat: 'projectileSpeed', perQuality: 1.0, type: 'increased' },
      { variant: 'anomalous', stat: 'chanceToIgnite', perQuality: 1.0, type: 'flat' },
      { variant: 'divergent', stat: 'castSpeed', perQuality: 0.5, type: 'increased' },
      { variant: 'phantasmal', stat: 'fireDamage', perQuality: 0.5, type: 'increased' },
    ],
  },
};

export function resolveQualityEffects(gemName: string, quality: number, variant: GemQualityVariant): ModifierStat[] {
  const key = gemName.toLowerCase();
  const data = QUALITY_DATA[key];
  if (!data || quality <= 0) return [];

  return data.effects
    .filter((eff) => eff.variant === variant || eff.variant === 'any')
    .map((eff) => ({
      stat: eff.stat,
      value: eff.perQuality * quality,
      type: eff.type,
    }));
}
