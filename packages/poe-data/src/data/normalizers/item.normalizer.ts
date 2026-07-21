import type { PoeItemRecord, ExternalItemDTO } from '@helper/shared';

export function normalizeItem(raw: ExternalItemDTO, now: number): PoeItemRecord {
  const itemType = (raw.itemType ?? raw.item_class ?? raw.category ?? '') || mapTypeFromName(raw.name);
  const level = (raw.requiredLevel ?? parseInt(raw.required_level ?? '0', 10)) || 0;
  return {
    game: 'poe1',
    name: (raw.name ?? raw.baseType ?? raw.base_item ?? '').trim(),
    baseType: (raw.baseType ?? raw.base_item ?? raw.name ?? '').trim(),
    itemType,
    category: (raw.category ?? raw.item_class ?? raw.itemType ?? 'unique'),
    level,
    requiredLevel: level,
    explicitStats: raw.explicitStats ?? {},
    dropSources: raw.dropSources ?? [],
    flavourText: (raw.flavourText ?? raw.flavour_text ?? '').trim(),
    icon: raw.icon ?? '',
    source: raw.source ?? 'unknown',
    sourceUrl: raw.sourceUrl ?? '',
    version: '',
    updatedAt: now,
  };
}

export function normalizeItems(rawItems: ExternalItemDTO[], now: number): PoeItemRecord[] {
  return rawItems
    .filter((raw) => hasName(raw))
    .map((raw) => normalizeItem(raw, now))
    .filter((item, index, self) =>
      index === self.findIndex((i) => i.name.toLowerCase() === item.name.toLowerCase()),
    );
}

function hasName(raw: ExternalItemDTO): boolean {
  return Boolean((raw.name ?? raw.baseType ?? raw.base_item ?? '').trim());
}

function mapTypeFromName(name?: string): string {
  if (!name) return '';
  if (/\bring\b/i.test(name)) return 'Ring';
  if (/\bamulet\b/i.test(name)) return 'Amulet';
  if (/\bbelt\b/i.test(name)) return 'Belt';
  if (/\bboots\b/i.test(name)) return 'Boots';
  if (/\bgloves\b|gauntlets\b/i.test(name)) return 'Gloves';
  if (/\bhelmet\b|helm\b|burgonet\b|circlet\b|crown\b/i.test(name)) return 'Helmet';
  if (/\bchest\b|body armour|plate\b/i.test(name)) return 'Body Armour';
  if (/\bsword\b|axe\b|mace\b|dagger\b|claw\b|staff\b|bow\b|wand\b|sceptre\b/i.test(name)) return 'Weapon';
  if (/\bflask\b/i.test(name)) return 'Flask';
  if (/\bjewel\b/i.test(name)) return 'Jewel';
  if (/\bmap\b/i.test(name)) return 'Map';
  return '';
}
