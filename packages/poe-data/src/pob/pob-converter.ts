import { createModifier, S } from '@helper/poe-engine';
import type { Modifier, ModifierSource } from '@helper/poe-engine';
import type { PoBXmlDTO, PoBItem, PoBMod } from './pob-xml.dto.js';

function sourceForMod(mod: PoBMod): ModifierSource {
  if (mod.implicit) return 'implicit';
  if (mod.crafted) return 'crafted';
  return 'explicit';
}

export function parseLifeMod(text: string): { value: number; type: 'flat' | 'increased' } | null {
  const flatMatch = /^\+(\d+)\s+to\s+maximum\s+life/i.exec(text);
  if (flatMatch) return { value: parseInt(flatMatch[1]!, 10), type: 'flat' };

  const incMatch = /^(\d+)%\s+increased\s+maximum\s+life/i.exec(text);
  if (incMatch) return { value: parseInt(incMatch[1]!, 10), type: 'increased' };

  return null;
}

export function parseResistanceMod(text: string): { value: number; stat: string } | null {
  const match = /^\+(\d+)%\s+to\s+(fire|cold|lightning|chaos)\s+resistance/i.exec(text);
  if (match) {
    return {
      value: parseInt(match[1]!, 10),
      stat: match[2]!.toLowerCase(),
    };
  }

  const allMatch = /^\+(\d+)%\s+to\s+all\s+(elemental\s+)?resistances/i.exec(text);
  if (allMatch) {
    return {
      value: parseInt(allMatch[1]!, 10),
      stat: 'all',
    };
  }

  return null;
}

export function parseFlatDamageMod(text: string): { value: number; type: string; damageType: string } | null {
  const match = /^adds\s+(\d+)\s+to\s+(\d+)\s+(fire|cold|lightning|chaos|physical)\s+damage/i.exec(text);
  if (match) {
    return {
      value: parseInt(match[1]!, 10),
      type: 'flat',
      damageType: match[3]!.toLowerCase(),
    };
  }
  return null;
}

export function parseIncreasedDamageMod(text: string): { value: number; damageType: string } | null {
  const match = /^(\d+)%\s+increased\s+(fire|cold|lightning|chaos|physical|spell|attack|elemental)\s+damage/i.exec(text);
  if (match) {
    return {
      value: parseInt(match[1]!, 10),
      damageType: match[2]!.toLowerCase(),
    };
  }
  return null;
}

export function parseEnergyShieldMod(text: string): { value: number; type: 'flat' | 'increased' } | null {
  const flatMatch = /^\+(\d+)\s+to\s+maximum\s+energy\s+shield/i.exec(text);
  if (flatMatch) return { value: parseInt(flatMatch[1]!, 10), type: 'flat' };

  const incMatch = /^(\d+)%\s+increased\s+maximum\s+energy\s+shield/i.exec(text);
  if (incMatch) return { value: parseInt(incMatch[1]!, 10), type: 'increased' };

  return null;
}

export const DAMAGE_STAT_MAP: Record<string, string> = {
  fire: 'offense.fireDamage',
  cold: 'offense.coldDamage',
  lightning: 'offense.lightningDamage',
  chaos: 'offense.chaosDamage',
  physical: 'offense.physicalDamage',
  spell: 'offense.spellDamage',
  attack: 'offense.attackDamage',
  elemental: 'offense.elementalDamage',
};

export const RESISTANCE_STAT_MAP: Record<string, string> = {
  fire: 'resistance.fire',
  cold: 'resistance.cold',
  lightning: 'resistance.lightning',
  chaos: 'resistance.chaos',
};

function itemToModifiers(item: PoBItem): Modifier[] {
  const mods: Modifier[] = [];

  for (const mod of item.rawMods) {
    const source = sourceForMod(mod);
    const text = mod.text;

    const life = parseLifeMod(text);
    if (life) {
      mods.push(
        createModifier({
          source,
          type: life.type,
          stat: life.type === 'flat' ? S['defense.life']! : S['defense.lifeIncreased']!,
          value: life.value,
          meta: { name: mod.text },
        }),
      );
      continue;
    }

    const es = parseEnergyShieldMod(text);
    if (es) {
      mods.push(
        createModifier({
          source,
          type: es.type,
          stat: es.type === 'flat' ? S['defense.energyShield']! : S['defense.energyShieldIncreased']!,
          value: es.value,
          meta: { name: mod.text },
        }),
      );
      continue;
    }

    const res = parseResistanceMod(text);
    if (res) {
      if (res.stat === 'all') {
        for (const element of ['fire', 'cold', 'lightning']) {
          const statKey = S[RESISTANCE_STAT_MAP[element]!];
          if (statKey) {
            mods.push(
              createModifier({
                source,
                type: 'flat',
                stat: statKey,
                value: res.value,
                meta: { name: mod.text },
              }),
            );
          }
        }
      } else {
        const statKey = S[RESISTANCE_STAT_MAP[res.stat]!];
        if (statKey) {
          mods.push(
            createModifier({
              source,
              type: 'flat',
              stat: statKey,
              value: res.value,
              meta: { name: mod.text },
            }),
          );
        }
      }
      continue;
    }

    const flatDmg = parseFlatDamageMod(text);
    if (flatDmg) {
      const statKey = S[DAMAGE_STAT_MAP[flatDmg.damageType]!];
      if (statKey) {
        mods.push(
          createModifier({
            source,
            type: 'flat',
            stat: statKey,
            value: flatDmg.value,
            meta: { name: mod.text },
          }),
        );
      }
      continue;
    }

    const incDmg = parseIncreasedDamageMod(text);
    if (incDmg) {
      const statKey = S[DAMAGE_STAT_MAP[incDmg.damageType]!];
      if (statKey) {
        mods.push(
          createModifier({
            source,
            type: 'increased',
            stat: statKey,
            value: incDmg.value,
            meta: { name: mod.text },
          }),
        );
      }
      continue;
    }
  }

  return mods;
}

export function convertPobItems(dto: PoBXmlDTO): Modifier[] {
  const allModifiers: Modifier[] = [];

  for (const item of dto.items) {
    allModifiers.push(...itemToModifiers(item));
  }

  return allModifiers;
}

export function convertPobDto(dto: PoBXmlDTO): Modifier[] {
  return convertPobItems(dto);
}
