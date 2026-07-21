import type { PoeItemRecord } from '@helper/shared';

interface ExternalItemDTO {
  name?: string;
  baseType?: string;
  itemType?: string;
  category?: string;
  requiredLevel?: number;
  flavourText?: string;
  explicitStats?: Record<string, unknown>;
  dropSources?: string[];
  icon?: string;
  source?: string;
  sourceUrl?: string;
}

export function normalizeItem(raw: ExternalItemDTO): PoeItemRecord {
  return {
    game: 'poe1',
    name: (raw.name ?? raw.baseType ?? '').trim(),
    baseType: (raw.baseType ?? raw.name ?? '').trim(),
    itemType: (raw.itemType ?? raw.category ?? '') || mapTypeFromName(raw.name),
    category: (raw.category ?? raw.itemType ?? 'unique'),
    level: raw.requiredLevel ?? 0,
    requiredLevel: raw.requiredLevel ?? 0,
    explicitStats: raw.explicitStats ?? {},
    dropSources: raw.dropSources ?? [],
    flavourText: (raw.flavourText ?? '').trim(),
    icon: raw.icon ?? '',
    source: raw.source ?? 'unknown',
    sourceUrl: raw.sourceUrl ?? '',
    version: '',
    updatedAt: Date.now(),
  };
}

export function normalizeItems(rawItems: ExternalItemDTO[]): PoeItemRecord[] {
  return rawItems
    .filter((raw) => hasName(raw))
    .map(normalizeItem)
    .filter((item, index, self) =>
      index === self.findIndex((i) => i.name.toLowerCase() === item.name.toLowerCase()),
    );
}

function hasName(raw: ExternalItemDTO): boolean {
  return Boolean((raw.name ?? raw.baseType ?? '').trim());
}

function mapTypeFromName(name?: string): string {
  if (!name) return '';
  if (/\bring\b/i.test(name)) return 'Ring';
  if (/\bamulet\b/i.test(name)) return 'Amulet';
  if (/\bbelt\b/i.test(name)) return 'Belt';
  if (/\bboots\b/i.test(name)) return 'Boots';
  if (/\bgloves\b/i.test(name)) return 'Gloves';
  if (/\bhelmet\b|helm\b/i.test(name)) return 'Helmet';
  if (/\bchest\b|body armour|plate\b/i.test(name)) return 'Body Armour';
  if (/\bsword\b|axe\b|mace\b|dagger\b|claw\b|staff\b|bow\b|wand\b|sceptre\b/i.test(name)) return 'Weapon';
  if (/\bflask\b/i.test(name)) return 'Flask';
  if (/\bjewel\b/i.test(name)) return 'Jewel';
  if (/\bmap\b/i.test(name)) return 'Map';
  return '';
}
