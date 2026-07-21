import type { GggCharacterDetail } from '../ggg-client.js';
import type {
  PoeCharacterSummary,
  PoeCharacterDetails,
  PoeEquipmentItem,
  PoeItemSocket,
  PoeGem,
  PoeSkillGroup,
  ItemRarity,
} from './types.js';

const FRAME_TYPE_RARITY: Record<number, ItemRarity> = {
  0: 'normal',
  1: 'magic',
  2: 'rare',
  3: 'unique',
  4: 'gem',
  5: 'currency',
  6: 'relic',
  8: 'relic',
};

const SOCKET_COLORS: Record<string, string> = {
  R: 'R',
  G: 'G',
  B: 'B',
  W: 'W',
  A: 'A',
  I: 'R',
  D: 'G',
  S: 'B',
};

function toSockets(raw: Array<{ group: number; attr: string; sColour: string }> | undefined): PoeItemSocket[] {
  if (!raw || raw.length === 0) return [];
  return raw.map(s => ({
    group: s.group,
    color: SOCKET_COLORS[s.sColour] ?? s.sColour,
  }));
}

function toGem(raw: {
  typeLine: string;
  properties?: Array<{ name: string; values: Array<[string, number]>; displayMode: number; type: number }>;
  support?: boolean;
}): PoeGem {
  let level = 0;
  let quality = 0;

  if (raw.properties) {
    for (const prop of raw.properties) {
      if (prop.name === 'Level' && prop.values.length > 0) {
        level = parseInt(prop.values[0]![0], 10) || 0;
      }
      if (prop.name === 'Quality' && prop.values.length > 0) {
        quality = parseInt(prop.values[0]![0].replace(/[+%]/g, ''), 10) || 0;
      }
    }
  }

  return {
    name: raw.typeLine,
    level,
    quality,
    support: !!raw.support,
  };
}

function toSkillGroups(items: GggCharacterDetail['items']): PoeSkillGroup[] {
  return items
    .filter(item => item.socketedItems && item.socketedItems.length > 0)
    .map(item => ({
      itemSlot: item.inventoryId,
      gems: item.socketedItems!.map(toGem),
    }));
}

function toPropertyValues(
  properties: Array<{ name: string; values: Array<[string, number]>; displayMode: number; type: number }> | undefined,
): Record<string, number> {
  if (!properties) return {};
  const result: Record<string, number> = {};
  for (const prop of properties) {
    if (prop.values.length === 0) continue;
    const displayText = prop.values[0]![0];
    const parsed = parseFloat(displayText.replace(/[^0-9.]/g, '')) || 0;
    result[prop.name] = parsed;
  }
  return result;
}

function toEquipmentItem(raw: GggCharacterDetail['items'][number]): PoeEquipmentItem {
  return {
    slot: raw.inventoryId,
    name: raw.name || raw.typeLine,
    baseType: raw.typeLine,
    rarity: FRAME_TYPE_RARITY[raw.frameType] ?? 'normal',
    icon: (raw as Record<string, unknown>).icon as string ?? null,
    sockets: toSockets(raw.sockets as Array<{ group: number; attr: string; sColour: string }> | undefined),
    socketedGems: (raw.socketedItems ?? []).map(toGem),
    explicitMods: raw.explicitMods ?? [],
    implicitMods: raw.implicitMods ?? [],
    craftedMods: raw.craftedMods ?? [],
    enchantMods: raw.enchantMods ?? [],
    propertyValues: toPropertyValues(raw.properties),
  };
}

interface NormalizableSummaryRow {
  id: number;
  name: string;
  level: number;
  class: string;
  ascendancy: string | null;
  league: string;
  fetchedAt: string;
}

interface NormalizableDetailRow {
  id: number;
  name: string;
  level: number;
  class: string;
  ascendancy: string | null;
  league: string;
  rawJson: GggCharacterDetail;
}

export function normalizeCharacterSummary(row: NormalizableSummaryRow): PoeCharacterSummary {
  return {
    id: row.id,
    name: row.name,
    level: row.level,
    class: row.class,
    ascendancy: row.ascendancy,
    league: row.league,
    lastSync: row.fetchedAt,
  };
}

export function normalizeCharacterDetails(row: NormalizableDetailRow): PoeCharacterDetails {
  const detail = row.rawJson;
  const items = detail.items ?? [];
  const equipment = items.map(toEquipmentItem);
  const skills = toSkillGroups(items);

  return {
    id: row.id,
    name: row.name,
    level: row.level,
    class: row.class,
    ascendancy: row.ascendancy,
    league: row.league,
    equipment,
    skills,
    rawData: detail as unknown as Record<string, unknown>,
  };
}
