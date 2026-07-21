import type { PoBXmlDTO, PoBItem, PoBSkillSet, PoBSkill, PoBMod } from '../dto/pob-xml.dto.js';
import type {
  Build,
  EquippedItem,
  EquipmentSlot,
  ItemRarity,
  Modifier,
  SocketGroup,
  SkillSetup,
  SkillGem,
  CharacterBase,
  PassiveTreeSnapshot,
  BuildConfig,
} from '../models/index.js';

const ITEM_SLOT_MAP: Record<string, EquipmentSlot> = {
  'Weapon 1': 'mainHand',
  'Weapon 2': 'offHand',
  'Helmet': 'helm',
  'Body Armour': 'chest',
  'Gloves': 'gloves',
  'Boots': 'boots',
  'Amulet': 'amulet',
  'Ring 1': 'ring1',
  'Ring 2': 'ring2',
  'Belt': 'belt',
  'Flask 1': 'flask1',
  'Flask 2': 'flask2',
  'Flask 3': 'flask3',
  'Flask 4': 'flask4',
  'Flask 5': 'flask5',
};

const POB_SLOT_PATTERNS: Array<{ pattern: RegExp; slot: EquipmentSlot }> = [
  { pattern: /^Weapon\s*1$/i, slot: 'mainHand' },
  { pattern: /^Weapon\s*2$/i, slot: 'offHand' },
  { pattern: /^Helmet?$/i, slot: 'helm' },
  { pattern: /^Body\s*Armou?r$/i, slot: 'chest' },
  { pattern: /^Gloves$/i, slot: 'gloves' },
  { pattern: /^Boots$/i, slot: 'boots' },
  { pattern: /^Amulet$/i, slot: 'amulet' },
  { pattern: /^Ring\s*1$/i, slot: 'ring1' },
  { pattern: /^Ring\s*2$/i, slot: 'ring2' },
  { pattern: /^Belt$/i, slot: 'belt' },
  { pattern: /^Flask\s*1$/i, slot: 'flask1' },
  { pattern: /^Flask\s*2$/i, slot: 'flask2' },
  { pattern: /^Flask\s*3$/i, slot: 'flask3' },
  { pattern: /^Flask\s*4$/i, slot: 'flask4' },
  { pattern: /^Flask\s*5$/i, slot: 'flask5' },
];

function resolveSlot(itemId: string): EquipmentSlot {
  const exact = ITEM_SLOT_MAP[itemId];
  if (exact) return exact;

  for (const { pattern, slot } of POB_SLOT_PATTERNS) {
    if (pattern.test(itemId)) return slot;
  }

  if (/^Flask/i.test(itemId)) return 'flask1';
  if (/^Jewel/i.test(itemId)) return 'jewel';
  return 'mainHand';
}

function mapRarity(raw: string): ItemRarity {
  switch (raw.toLowerCase()) {
    case 'unique': return 'unique';
    case 'rare': return 'rare';
    case 'magic': return 'magic';
    default: return 'normal';
  }
}

function mapMod(pobMod: PoBMod): Modifier {
  const parsed = parseModText(pobMod.text);
  return {
    name: parsed.name,
    values: parsed.values.map(String),
    domain: pobMod.implicit ? 'implicit' : pobMod.crafted ? 'crafted' : pobMod.explicit ? 'explicit' : 'enchant',
  };
}

function parseModText(text: string): { name: string; values: (string | number)[] } {
  const rangeMatch = text.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)(?:\s*\((\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\))?$/);
  if (rangeMatch) {
    const rawValues = rangeMatch.slice(2).filter(Boolean).map((v) => parseFloat(v.replace(',', '.')));
    return { name: rangeMatch[1]!.trim(), values: rawValues };
  }

  const numSuffix = text.match(/^(.+?)\s+([+-]?\d+\.?\d*)$/);
  if (numSuffix) {
    return { name: numSuffix[1]!.trim(), values: [parseFloat(numSuffix[2]!)] };
  }

  return { name: text, values: [] };
}

function mapSockets(pobSockets: Array<{ group: number; attr: string }>): SocketGroup[] {
  const groups = new Map<number, { colours: string; count: number }>();
  for (const s of pobSockets) {
    const entry = groups.get(s.group) ?? { colours: '', count: 0 };
    entry.colours += s.attr;
    entry.count++;
    groups.set(s.group, entry);
  }
  return Array.from(groups.entries()).map(([group, data]) => ({
    group,
    colours: data.colours,
    links: data.count > 0 ? data.count : 0,
  }));
}

function buildEquippedItem(pobItem: PoBItem): EquippedItem {
  const slot = resolveSlot(pobItem.id);
  return {
    slot,
    identity: {
      name: pobItem.title,
      baseType: pobItem.baseType || pobItem.title,
      rarity: mapRarity(pobItem.rarity),
    },
    rawMods: pobItem.rawMods.map(mapMod),
    computedStats: emptyComputedStats(),
    sockets: mapSockets(pobItem.sockets),
  };
}

function emptyComputedStats() {
  return {
    armour: 0,
    evasion: 0,
    energyShield: 0,
    ward: 0,
    life: 0,
    mana: 0,
    resistances: { fire: 0, cold: 0, lightning: 0, chaos: 0 },
    maxResistances: { fire: 0, cold: 0, lightning: 0 },
    attributes: { str: 0, dex: 0, int: 0 },
    flatDamage: [] as Array<{ type: 'physical' | 'fire' | 'cold' | 'lightning' | 'chaos'; min: number; max: number }>,
    increasedDamage: {} as Record<string, number>,
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
  };
}

function mapSkillGem(pobSkill: PoBSkill): SkillGem {
  const variantMap: Record<string, SkillGem['variant']> = {
    regular: 'regular',
    anomalous: 'anomalous',
    divergent: 'divergent',
    phantasmal: 'phantasmal',
  };
  return {
    name: pobSkill.name,
    level: pobSkill.level,
    quality: pobSkill.quality,
    variant: variantMap[pobSkill.variant?.toLowerCase()] ?? 'regular',
  };
}

function buildSkillSetups(pobSkillSets: PoBSkillSet[]): SkillSetup[] {
  return pobSkillSets.map((set, index) => {
    const active = set.skills.find((s) => s.active);
    const supports = set.skills.filter((s) => !s.active && s.name);

    if (!active) {
      return {
        id: `skill-${index}`,
        activeGem: { name: set.skills[0]?.name ?? 'Unknown', level: 1, quality: 0, variant: 'regular' },
        supportGems: [],
        isEnabled: false,
      };
    }

    return {
      id: `skill-${index}`,
      activeGem: mapSkillGem(active),
      supportGems: supports.map(mapSkillGem),
      isEnabled: true,
    };
  });
}

function buildCharacter(dto: PoBXmlDTO): CharacterBase {
  return {
    class: dto.build.className,
    ascendancy: dto.build.ascendClassName,
    level: dto.build.level,
    bandits: dto.build.bandit,
  };
}

function buildPassiveTree(dto: PoBXmlDTO): PassiveTreeSnapshot {
  return {
    version: dto.tree.treeVersion,
    allocatedHashes: dto.tree.nodes,
    masteryChoices: dto.tree.masteryEffects,
    keystones: dto.tree.keystones,
    clusterJewels: [],
    ascendancyNodes: dto.tree.ascendancyNodes,
  };
}

function buildConfig(dto: PoBXmlDTO): BuildConfig {
  return {
    isBoss: dto.config.isBoss,
    enemyResistances: dto.config.enemyResistances,
    charges: dto.config.charges,
    curses: [],
    customMods: [],
  };
}

export function fromPob(dto: PoBXmlDTO): Build {
  return {
    game: 'poe1',
    name: `${dto.build.ascendClassName || dto.build.className} ${dto.build.level}`,
    source: 'pob',
    character: buildCharacter(dto),
    passiveTree: buildPassiveTree(dto),
    items: dto.items.map(buildEquippedItem).filter((item) => item.slot !== 'jewel'),
    skills: buildSkillSetups(dto.skills),
    config: buildConfig(dto),
  };
}
