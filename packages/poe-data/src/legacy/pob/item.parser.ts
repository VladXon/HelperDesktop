import type { PoBItem, PoBMod } from '../dto/pob-xml.dto.js';
import type { ParsedItemDto, RawModDto } from './dto/item.dto.js';
import type { SocketGroup, ItemRarity, Influence } from '../models/index.js';

const INFLUENCE_PATTERNS: [RegExp, Influence][] = [
  [/\bshaper\b/i, 'shaper'],
  [/\belder\b/i, 'elder'],
  [/\bcrusader\b/i, 'crusader'],
  [/\bredeemer\b/i, 'redeemer'],
  [/\bhunter\b/i, 'hunter'],
  [/\bwarlord\b/i, 'warlord'],
];

export function parsePoBItems(items: PoBItem[]): ParsedItemDto[] {
  return items.map(parseSingleItem);
}

function parseSingleItem(item: PoBItem): ParsedItemDto {
  const classified = classifyMods(item.rawMods);

  return {
    id: item.id,
    baseType: item.baseType,
    rarity: mapRarity(item.rarity),
    influence: detectInfluence(item.rawMods),
    isFractured: hasFracturedMod(item.rawMods),
    isSynthesised: isSynthesised(item.baseType),
    isCorrupted: hasCorruptedMod(item.rawMods),
    quality: 0,
    sockets: mapSockets(item.sockets),
    implicitMods: classified.filter((m) => m.implicit && !m.explicit && !m.crafted),
    explicitMods: classified.filter((m) => m.explicit && !m.crafted),
    craftedMods: classified.filter((m) => m.crafted),
    enchantMods: [],
    fracturedMods: classified.filter((m) => m.explicit && /\bfractured\b/i.test(m.text)),
    corruptedMods: classified.filter((m) => m.explicit && /\bcorrupted\b/i.test(m.text)),
  };
}

function classifyMods(rawMods: PoBMod[]): RawModDto[] {
  return rawMods.map((mod) => ({
    text: mod.text,
    implicit: mod.implicit,
    explicit: mod.explicit,
    crafted: mod.crafted,
  }));
}

function mapRarity(raw: string): ItemRarity {
  const lower = raw.toLowerCase();
  if (lower === 'unique') return 'unique';
  if (lower === 'rare') return 'rare';
  if (lower === 'magic') return 'magic';
  return 'normal';
}

function detectInfluence(rawMods: PoBMod[]): Influence | null {
  for (const mod of rawMods) {
    for (const [regex, influence] of INFLUENCE_PATTERNS) {
      if (regex.test(mod.text)) return influence;
    }
  }
  return null;
}

function hasFracturedMod(rawMods: PoBMod[]): boolean {
  return rawMods.some((mod) => /\bfractured\b/i.test(mod.text));
}

function hasCorruptedMod(rawMods: PoBMod[]): boolean {
  return rawMods.some((mod) => /\bcorrupted\b/i.test(mod.text));
}

function isSynthesised(baseType: string): boolean {
  return /\bsynthesised\b/i.test(baseType);
}

function mapSockets(sockets: { group: number; attr: string }[]): SocketGroup[] {
  const groups = new Map<number, { colours: string; count: number }>();
  for (const s of sockets) {
    const existing = groups.get(s.group);
    if (existing) {
      existing.colours += s.attr;
      existing.count++;
    } else {
      groups.set(s.group, { colours: s.attr, count: 1 });
    }
  }
  return Array.from(groups.entries()).map(([group, data]) => ({
    group,
    colours: data.colours,
    links: data.count - 1,
  }));
}
