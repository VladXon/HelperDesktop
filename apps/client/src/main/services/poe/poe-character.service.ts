import { net } from 'electron';
import { createModifier, S } from '@helper/poe-engine';
import type { Modifier } from '@helper/poe-engine';
import {
  parseLifeMod,
  parseResistanceMod,
  parseFlatDamageMod,
  parseIncreasedDamageMod,
  parseEnergyShieldMod,
  DAMAGE_STAT_MAP,
  RESISTANCE_STAT_MAP,
} from '@helper/poe-data';
import type {
  Build,
  BuildConfig,
  CharacterBase,
  PassiveTreeSnapshot,
  EquippedItem,
  SkillSetup,
  SkillGem,
  EquipmentSlot,
  ItemRarity,
} from '@helper/shared';

export interface GggPassiveSkillsResponse {
  character: number;
  ascendancy: number;
  alternate_ascendancy: number;
  hashes: number[];
  hashes_ex: number[];
  mastery_effects: Record<string, number>;
  skill_overrides: Record<string, {
    name?: string;
    isMastery?: boolean;
    isTattoo?: boolean;
    stats?: string[];
    [key: string]: unknown;
  }>;
  items: unknown[];
  jewel_data: Record<string, unknown>;
}

export function fetchPassiveSkills(accountName: string, characterName: string, poesessid: string): Promise<PassiveTreeSnapshot> {
  return _fetchPassiveSkillsImpl(accountName, characterName, poesessid);
}

async function _fetchPassiveSkillsImpl(accountName: string, characterName: string, poesessid: string): Promise<PassiveTreeSnapshot> {
  const url = `https://www.pathofexile.com/character-window/get-passive-skills?accountName=${encodeURIComponent(accountName)}&realm=pc&character=${encodeURIComponent(characterName)}`;

  const res = await net.fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Cookie': `POESESSID=${poesessid}`,
    },
  });

  if (!res.ok) {
    throw new Error(`GGG passive skills API returned ${res.status} ${res.statusText}`);
  }

  const data: GggPassiveSkillsResponse = await res.json();

  const masteryChoices: Record<number, string> = {};
  for (const [nodeHash, effectId] of Object.entries(data.mastery_effects)) {
    masteryChoices[Number(nodeHash)] = String(effectId);
  }

  return {
    version: '3_25',
    allocatedHashes: [...data.hashes, ...data.hashes_ex],
    masteryChoices,
    keystones: [],
    clusterJewels: [],
    ascendancyNodes: [],
  };
}

export interface CharacterPassiveTree {
  allocatedNodes: number[];
  treeVersion?: string;
}

interface GggItem {
  id: string;
  name: string;
  typeLine: string;
  inventoryId: string;
  socketedItems?: Array<{
    id: string;
    typeLine: string;
    properties?: Array<{ name: string; values: Array<[string, number]>; displayMode: number; type: number }>;
    explicitMods?: string[];
    support: boolean;
    socket?: number;
  }>;
  explicitMods?: string[];
  implicitMods?: string[];
  craftedMods?: string[];
  enchantMods?: string[];
  fracturedMods?: string[];
  scourgeMods?: string[];
  veiledMods?: string[];
  incubatedMods?: string[];
  frameType: number;
  sockets?: Array<{ group: number; attr: string; sColour: string }>;
}

export interface GggCharacterDetail {
  character: {
    name: string;
    league: string;
    classId: number;
    ascendancyClass: number;
    class: string;
    level: number;
    experience?: number;
  };
  items: GggItem[];
}

export interface CharacterBuildResult {
  build: Build;
  modifiers: Modifier[];
  passiveTree: CharacterPassiveTree | undefined;
}

const GGG_SLOT_MAP: Record<string, EquipmentSlot> = {
  'Weapon': 'mainHand',
  'Weapon 1': 'mainHand',
  'Offhand': 'offHand',
  'Weapon 2': 'offHand',
  'Helm': 'helm',
  'Body Armour': 'chest',
  'Gloves': 'gloves',
  'Boots': 'boots',
  'Amulet': 'amulet',
  'Ring': 'ring1',
  'Ring 1': 'ring1',
  'Ring1': 'ring1',
  'Ring 2': 'ring2',
  'Ring2': 'ring2',
  'Belt': 'belt',
};

function mapSlot(inventoryId: string): EquipmentSlot | null {
  const direct = GGG_SLOT_MAP[inventoryId];
  if (direct) return direct;
  if (inventoryId.startsWith('Flask')) return 'flask1' as EquipmentSlot;
  return null;
}

function frameTypeToRarity(frameType: number): ItemRarity {
  switch (frameType) {
    case 2: return 'normal';
    case 3: return 'unique';
    case 1: return 'magic';
    case 0: return 'normal';
    default: return 'rare';
  }
}

function extractGemLevel(properties?: Array<{ name: string; values: Array<[string, number]>; displayMode: number; type: number }>): number {
  const prop = properties?.find((p) => p.name === 'Level');
  if (prop?.values[0]) return Number(prop.values[0][0]) || 1;
  return 1;
}

function extractGemQuality(properties?: Array<{ name: string; values: Array<[string, number]>; displayMode: number; type: number }>): number {
  const prop = properties?.find((p) => p.name === 'Quality');
  if (prop?.values[0]) return Number(prop.values[0][0]) || 0;
  return 0;
}

function extractSkills(items: GggItem[]): SkillSetup[] {
  const skills: SkillSetup[] = [];
  let skillIndex = 0;

  for (const item of items) {
    const socketedGems = item.socketedItems ?? [];
    const activeGems = socketedGems.filter((g) => !g.support);
    const supportGems = socketedGems.filter((g) => g.support);

    for (const activeGem of activeGems) {
      const supportsInSameGroup: Array<typeof activeGem> = [];
      if (item.sockets) {
        for (const support of supportGems) {
          if (support.socket !== undefined && support.socket !== null) {
            supportsInSameGroup.push(support);
          }
        }
      }

      const skillGem: SkillGem = {
        name: activeGem.typeLine,
        level: extractGemLevel(activeGem.properties),
        quality: extractGemQuality(activeGem.properties),
        variant: 'regular',
      };

      const supportSkillGems: SkillGem[] = supportGems.map((s) => ({
        name: s.typeLine,
        level: extractGemLevel(s.properties),
        quality: extractGemQuality(s.properties),
        variant: 'regular' as const,
      }));

      skills.push({
        id: `skill-${skillIndex++}`,
        activeGem: skillGem,
        supportGems: supportSkillGems,
        isEnabled: true,
      });
    }

    if (activeGems.length === 0 && socketedGems.length > 0) {
      let first = true;
      for (const gem of socketedGems) {
        skills.push({
          id: `skill-${skillIndex++}`,
          activeGem: {
            name: gem.typeLine,
            level: extractGemLevel(gem.properties),
            quality: extractGemQuality(gem.properties),
            variant: 'regular',
          },
          supportGems: [],
          isEnabled: first,
        });
        first = false;
      }
    }
  }

  return skills;
}

function extractModifiersFromItem(item: GggItem): Modifier[] {
  const mods: Modifier[] = [];
  const allMods: Array<{ text: string; source: 'explicit' | 'implicit' | 'crafted' | 'enchantment' }> = [];

  for (const text of item.implicitMods ?? []) allMods.push({ text, source: 'implicit' });
  for (const text of item.explicitMods ?? []) allMods.push({ text, source: 'explicit' });
  for (const text of item.craftedMods ?? []) allMods.push({ text, source: 'crafted' });
  for (const text of item.enchantMods ?? []) allMods.push({ text, source: 'enchantment' });

  for (const mod of allMods) {
    const text = mod.text;
    const source = mod.source;

    const life = parseLifeMod(text);
    if (life) {
      mods.push(
        createModifier({
          source,
          type: life.type,
          stat: life.type === 'flat' ? S['defense.life']! : S['defense.lifeIncreased']!,
          value: life.value,
          meta: { name: text },
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
          meta: { name: text },
        }),
      );
      continue;
    }

    const res = parseResistanceMod(text);
    if (res) {
      if (res.stat === 'all') {
        for (const element of ['fire', 'cold', 'lightning'] as const) {
          const statKey = S[RESISTANCE_STAT_MAP[element]!];
          if (statKey) {
            mods.push(
              createModifier({ source, type: 'flat', stat: statKey, value: res.value, meta: { name: text } }),
            );
          }
        }
      } else {
        const statKey = S[RESISTANCE_STAT_MAP[res.stat]!];
        if (statKey) {
          mods.push(
            createModifier({ source, type: 'flat', stat: statKey, value: res.value, meta: { name: text } }),
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
          createModifier({ source, type: 'flat', stat: statKey, value: flatDmg.value, meta: { name: text } }),
        );
      }
      continue;
    }

    const incDmg = parseIncreasedDamageMod(text);
    if (incDmg) {
      const statKey = S[DAMAGE_STAT_MAP[incDmg.damageType]!];
      if (statKey) {
        mods.push(
          createModifier({ source, type: 'increased', stat: statKey, value: incDmg.value, meta: { name: text } }),
        );
      }
      continue;
    }
  }

  return mods;
}

function extractItems(gggItems: GggItem[]): EquippedItem[] {
  const items: EquippedItem[] = [];

  for (const gggItem of gggItems) {
    const slot = mapSlot(gggItem.inventoryId);
    if (!slot) continue;

    items.push({
      slot,
      identity: {
        name: gggItem.name || gggItem.typeLine,
        baseType: gggItem.typeLine,
        rarity: frameTypeToRarity(gggItem.frameType),
      },
      rawMods: [
        ...(gggItem.implicitMods ?? []).map((text) => ({ name: text, values: [] as string[], domain: 'implicit' })),
        ...(gggItem.explicitMods ?? []).map((text) => ({ name: text, values: [] as string[], domain: 'explicit' })),
        ...(gggItem.craftedMods ?? []).map((text) => ({ name: text, values: [] as string[], domain: 'crafted' })),
        ...(gggItem.enchantMods ?? []).map((text) => ({ name: text, values: [] as string[], domain: 'enchant' })),
        ...(gggItem.fracturedMods ?? []).map((text) => ({ name: text, values: [] as string[], domain: 'fractured' })),
        ...(gggItem.scourgeMods ?? []).map((text) => ({ name: text, values: [] as string[], domain: 'explicit' })),
        ...(gggItem.veiledMods ?? []).map((text) => ({ name: text, values: [] as string[], domain: 'veiled' })),
        ...(gggItem.incubatedMods ?? []).map((text) => ({ name: text, values: [] as string[], domain: 'explicit' })),
      ],
      computedStats: {
        armour: 0,
        evasion: 0,
        energyShield: 0,
        ward: 0,
        life: 0,
        mana: 0,
        resistances: { fire: 0, cold: 0, lightning: 0, chaos: 0 },
        maxResistances: { fire: 0, cold: 0, lightning: 0 },
        attributes: { str: 0, dex: 0, int: 0 },
        flatDamage: [],
        increasedDamage: {},
        castSpeed: 0,
        attackSpeed: 0,
        criticalChance: 0,
        criticalMultiplier: 0,
        spellSuppression: 0,
        blockChance: { attack: 0, spell: 0 },
        lifeRegen: 0,
        onBlockGain: 0,
        movementSpeed: 0,
        implicits: [],
        explicits: [],
        crafts: [],
      },
      sockets: gggItem.sockets?.map((s) => ({
        group: s.group,
        colours: s.sColour,
        links: 1,
      })) ?? [],
    });
  }

  return items;
}

function ascendancyClassIdToName(classId: number): string | null {
  const ascendancies: Record<number, string> = {
    1: 'Juggernaut',
    2: 'Berserker',
    3: 'Chieftain',
    4: 'Gladiator',
    5: 'Champion',
    6: 'Slayer',
    7: 'Necromancer',
    8: 'Occultist',
    9: 'Elementalist',
    10: 'Deadeye',
    11: 'Raider',
    12: 'Pathfinder',
    13: 'Inquisitor',
    14: 'Hierophant',
    15: 'Guardian',
    16: 'Assassin',
    17: 'Trickster',
    18: 'Saboteur',
    19: 'Ascendant',
    20: 'Warden',
    21: 'Warlord',
  };
  return ascendancies[classId] ?? null;
}

function buildDefaultConfig(): BuildConfig {
  return {
    isBoss: false,
    enemyResistances: 0,
    charges: { frenzy: 0, power: 0, endurance: 0 },
    curses: [],
    customMods: [],
  };
}

function buildEmptyPassiveTree(): PassiveTreeSnapshot {
  return {
    version: 'unknown',
    allocatedHashes: [],
    masteryChoices: {},
    keystones: [],
    clusterJewels: [],
    ascendancyNodes: [],
  };
}

export function convertCharacterToBuild(detail: GggCharacterDetail): CharacterBuildResult {
  const ch = detail.character;

  const character: CharacterBase = {
    class: ch.class,
    ascendancy: ascendancyClassIdToName(ch.ascendancyClass),
    level: ch.level,
    bandits: 'kill-all',
  };

  const items = extractItems(detail.items ?? []);
  const skills = extractSkills(detail.items ?? []);
  const allModifiers = (detail.items ?? []).flatMap(extractModifiersFromItem);

  const passiveTreePlaceholder: CharacterPassiveTree = {
    allocatedNodes: [],
    treeVersion: undefined,
  };

  const build: Build = {
    game: 'poe1',
    name: ch.name,
    source: 'api',
    character,
    passiveTree: buildEmptyPassiveTree(),
    items,
    skills,
    config: buildDefaultConfig(),
  };

  return {
    build,
    modifiers: allModifiers,
    passiveTree: passiveTreePlaceholder,
  };
}
