import type { StatValue } from '../models/stat.model.js';
import type { EquippedItem } from '@helper/shared';

export function collectItemStats(items: EquippedItem[]): StatValue[] {
  return items.flatMap(collectSingleItem);
}

function collectSingleItem(item: EquippedItem): StatValue[] {
  const stats = item.computedStats;
  const result: StatValue[] = [];
  const src: StatValue['source'] = 'item';

  addIf(stats.life > 0, { name: 'life', value: stats.life, source: src, type: 'flat' });
  addIf(stats.mana > 0, { name: 'mana', value: stats.mana, source: src, type: 'flat' });
  addIf(stats.energyShield > 0, { name: 'energyShield', value: stats.energyShield, source: src, type: 'flat' });
  addIf(stats.armour > 0, { name: 'armour', value: stats.armour, source: src, type: 'flat' });
  addIf(stats.evasion > 0, { name: 'evasion', value: stats.evasion, source: src, type: 'flat' });
  addIf(stats.ward > 0, { name: 'ward', value: stats.ward, source: src, type: 'flat' });

  addIf(stats.resistances.fire > 0, { name: 'fireResistance', value: stats.resistances.fire, source: src, type: 'flat' });
  addIf(stats.resistances.cold > 0, { name: 'coldResistance', value: stats.resistances.cold, source: src, type: 'flat' });
  addIf(stats.resistances.lightning > 0, { name: 'lightningResistance', value: stats.resistances.lightning, source: src, type: 'flat' });
  addIf(stats.resistances.chaos > 0, { name: 'chaosResistance', value: stats.resistances.chaos, source: src, type: 'flat' });

  addIf(stats.maxResistances.fire > 0, { name: 'maxFireResistance', value: stats.maxResistances.fire, source: src, type: 'flat' });
  addIf(stats.maxResistances.cold > 0, { name: 'maxColdResistance', value: stats.maxResistances.cold, source: src, type: 'flat' });
  addIf(stats.maxResistances.lightning > 0, { name: 'maxLightningResistance', value: stats.maxResistances.lightning, source: src, type: 'flat' });

  addIf(stats.attributes.str > 0, { name: 'strength', value: stats.attributes.str, source: src, type: 'flat' });
  addIf(stats.attributes.dex > 0, { name: 'dexterity', value: stats.attributes.dex, source: src, type: 'flat' });
  addIf(stats.attributes.int > 0, { name: 'intelligence', value: stats.attributes.int, source: src, type: 'flat' });

  for (const dmg of stats.flatDamage) {
    addIf(true, { name: `${dmg.type}Damage`, value: dmg.min, source: src, type: 'flat' });
    addIf(true, { name: `${dmg.type}Damage`, value: dmg.max, source: src, type: 'flat' });
  }

  for (const [damageType, pct] of Object.entries(stats.increasedDamage)) {
    addIf(Number(pct) > 0, { name: `${damageType}Damage`, value: Number(pct), source: src, type: 'increased' });
  }

  addIf(stats.attackSpeed > 0, { name: 'attackSpeed', value: stats.attackSpeed, source: src, type: 'increased' });
  addIf(stats.castSpeed > 0, { name: 'castSpeed', value: stats.castSpeed, source: src, type: 'increased' });
  addIf(stats.movementSpeed > 0, { name: 'movementSpeed', value: stats.movementSpeed, source: src, type: 'increased' });
  addIf(stats.criticalChance > 0, { name: 'criticalChance', value: stats.criticalChance, source: src, type: 'flat' });
  addIf(stats.criticalMultiplier > 0, { name: 'criticalMultiplier', value: stats.criticalMultiplier, source: src, type: 'flat' });
  addIf(stats.spellSuppression > 0, { name: 'spellSuppression', value: stats.spellSuppression, source: src, type: 'flat' });
  addIf(stats.lifeRegen > 0, { name: 'lifeRegen', value: stats.lifeRegen, source: src, type: 'flat' });
  addIf(stats.blockChance.attack > 0, { name: 'attackBlock', value: stats.blockChance.attack, source: src, type: 'flat' });
  addIf(stats.blockChance.spell > 0, { name: 'spellBlock', value: stats.blockChance.spell, source: src, type: 'flat' });
  addIf(stats.onBlockGain > 0, { name: 'lifeOnBlock', value: stats.onBlockGain, source: src, type: 'flat' });

  return result;

  function addIf(condition: boolean, sv: StatValue) {
    if (condition) result.push(sv);
  }
}
