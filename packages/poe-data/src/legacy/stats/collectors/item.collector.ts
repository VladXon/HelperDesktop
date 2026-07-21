import type { StatValue, ModifierScope } from '../models/stat.model.js';
import type { EquippedItem } from '@helper/shared';

export function collectItemStats(items: EquippedItem[]): StatValue[] {
  return items.flatMap(collectSingleItem);
}

function collectSingleItem(item: EquippedItem): StatValue[] {
  const stats = item.computedStats;
  const result: StatValue[] = [];
  const slotName = item.identity.name || item.slot;

  const isWeapon = item.slot === 'mainHand' || item.slot === 'offHand';

  const globalScope = (): { scope: ModifierScope; modifierName: string } => ({
    scope: 'global',
    modifierName: `${slotName}: `,
  });

  const localScope = (): { scope: ModifierScope; modifierName: string } => ({
    scope: 'localItem',
    modifierName: `${slotName}: `,
  });

  const scope = isWeapon ? localScope : globalScope;

  add(stats.life, 'life', 'flat', globalScope());
  add(stats.mana, 'mana', 'flat', globalScope());
  add(stats.energyShield, 'energyShield', 'flat', globalScope());
  add(stats.armour, 'armour', 'flat', scope());
  add(stats.evasion, 'evasion', 'flat', scope());
  add(stats.ward, 'ward', 'flat', globalScope());

  add(stats.resistances.fire, 'fireResistance', 'flat', globalScope());
  add(stats.resistances.cold, 'coldResistance', 'flat', globalScope());
  add(stats.resistances.lightning, 'lightningResistance', 'flat', globalScope());
  add(stats.resistances.chaos, 'chaosResistance', 'flat', globalScope());

  add(stats.maxResistances.fire, 'maxFireResistance', 'flat', globalScope());
  add(stats.maxResistances.cold, 'maxColdResistance', 'flat', globalScope());
  add(stats.maxResistances.lightning, 'maxLightningResistance', 'flat', globalScope());

  add(stats.attributes.str, 'strength', 'flat', globalScope());
  add(stats.attributes.dex, 'dexterity', 'flat', globalScope());
  add(stats.attributes.int, 'intelligence', 'flat', globalScope());

  for (const dmg of stats.flatDamage) {
    add(dmg.min, `${dmg.type}Damage`, 'flat', scope());
    add(dmg.max, `${dmg.type}Damage`, 'flat', scope());
  }

  for (const [damageType, pct] of Object.entries(stats.increasedDamage)) {
    add(Number(pct), `${damageType}Damage`, 'increased', globalScope());
  }

  add(stats.attackSpeed, 'attackSpeed', 'increased', scope());
  add(stats.castSpeed, 'castSpeed', 'increased', globalScope());
  add(stats.movementSpeed, 'movementSpeed', 'increased', globalScope());
  add(stats.criticalChance, 'criticalChance', 'flat', globalScope());
  add(stats.criticalMultiplier, 'criticalMultiplier', 'flat', globalScope());
  add(stats.spellSuppression, 'spellSuppression', 'flat', globalScope());
  add(stats.lifeRegen, 'lifeRegen', 'flat', globalScope());
  add(stats.blockChance.attack, 'attackBlock', 'flat', globalScope());
  add(stats.blockChance.spell, 'spellBlock', 'flat', globalScope());
  add(stats.onBlockGain, 'lifeOnBlock', 'flat', globalScope());

  return result;

  function add(rawValue: number, name: string, type: StatValue['type'], ctx: { scope: ModifierScope; modifierName: string }) {
    if (rawValue > 0) {
      result.push({
        name,
        value: rawValue,
        source: 'item',
        type,
        scope: ctx.scope,
        modifierName: `${ctx.modifierName}${name}`,
      });
    }
  }
}
