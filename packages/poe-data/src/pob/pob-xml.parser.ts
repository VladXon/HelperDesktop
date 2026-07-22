import { inflateRawSync } from 'node:zlib';
import { decodePobCompressedData } from './utils/decompress.js';
import type { PoBXmlDTO, PoBBuildAttributes, PoBSkillSet, PoBSkill, PoBItem, PoBMod, PoBItemSet, PoBSocket, PoBTree, PoBConfig } from './pob-xml.dto.js';

const PASTEBIN_URL_RE = /^https:\/\/pastebin\.com\/(?:raw\/)?([a-zA-Z0-9_-]+)$/;
const POBB_URL_RE = /^https:\/\/(?:www\.)?pobb\.in\/([a-zA-Z0-9_-]+)$/;
const POB_URL_RE = new RegExp(`(?:${PASTEBIN_URL_RE.source})|(?:${POBB_URL_RE.source})`);

function decodeBase64(encoded: string): Buffer {
  return Buffer.from(encoded, 'base64');
}

function inflateRaw(data: Buffer): Buffer {
  return inflateRawSync(data);
}

export function isPobPastebinUrl(url: string): boolean {
  return PASTEBIN_URL_RE.test(url);
}

export function isPobbUrl(url: string): boolean {
  return POBB_URL_RE.test(url);
}

export function isPoBUrl(url: string): boolean {
  return POB_URL_RE.test(url);
}

export function extractPastebinId(url: string): string | null {
  const match = url.match(PASTEBIN_URL_RE);
  return match ? (match[1] ?? null) : null;
}

export function extractPobbId(url: string): string | null {
  const match = url.match(POBB_URL_RE);
  return match ? (match[1] ?? null) : null;
}

export function parsePobXml(xml: string): PoBXmlDTO {
  const build = parseBuildSection(xml);
  const allItems = parseAllItems(xml);
  const itemSets = parseItemSets(xml);

  const activeItemIds = resolveActiveItemIds(itemSets, build.level);
  const items = activeItemIds.size > 0
    ? allItems.filter(item => activeItemIds.has(item.id))
    : allItems;

  return {
    build,
    skills: parseSkillsSection(xml),
    items,
    itemSets,
    tree: parseTreeSection(xml),
    config: parseConfigSection(xml),
  };
}

export function parsePobPastebin(base64Content: string): PoBXmlDTO {
  const compressed = decodeBase64(base64Content);
  const rawXml = inflateRaw(compressed).toString('utf-8');
  return parsePobXml(rawXml);
}

/**
 * Parse pobb.in build data (base64url + zlib compressed).
 * pobb.in uses base64url (RFC 4648 §5) with zlib compression.
 */
export function parsePobbIn(compressedData: string): PoBXmlDTO {
  const rawXml = decodePobCompressedData(compressedData, { format: 'zlib' });
  return parsePobXml(rawXml);
}

function extractTag(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>`, 'i');
  const match = regex.exec(xml);
  return match ? match[0] : '';
}

function extractSelfClosingTag(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}\\b[^/>]*\\/>`, 'i');
  const match = regex.exec(xml);
  return match ? match[0] : '';
}

function parseAttrs(tagString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(tagString)) !== null) {
    attrs[m[1]!] = unescapeXmlValue(m[2]!);
  }
  return attrs;
}

function unescapeXmlValue(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function normalizeBandit(bandit: string | undefined): PoBBuildAttributes['bandit'] {
  switch (bandit?.toLowerCase()) {
    case 'oak': return 'oak';
    case 'kraityn': case 'kraitlyn': return 'kraityn';
    case 'aliya': case 'alira': return 'aliya';
    default: return 'kill-all';
  }
}

function parseBuildSection(xml: string): PoBBuildAttributes {
  const buildTag = extractTag(xml, 'Build') || extractSelfClosingTag(xml, 'Build');
  if (!buildTag) {
    return { level: 1, className: 'Unknown', ascendClassName: null, bandit: 'kill-all', targetVersion: '3_0' };
  }
  const attrs = parseAttrs(buildTag);
  return {
    level: parseInt(attrs.level ?? '1', 10),
    className: attrs.className ?? 'Unknown',
    ascendClassName: attrs.ascendClassName || null,
    bandit: normalizeBandit(attrs.bandit),
    targetVersion: attrs.targetVersion ?? '3_0',
  };
}

function parseSkillsSection(xml: string): PoBSkillSet[] {
  const skillsBlock = extractTag(xml, 'Skills');
  if (!skillsBlock) return [];

  const skillSets: PoBSkillSet[] = [];
  const setRegex = /<SkillSet\b([^>]*)>([\s\S]*?)<\/SkillSet>/g;
  let setMatch: RegExpExecArray | null;
  while ((setMatch = setRegex.exec(skillsBlock)) !== null) {
    const setAttrs = parseAttrs(setMatch[1] ?? '');
    const content = setMatch[2] ?? '';
    const skills: PoBSkill[] = [];
    const skillRegex = /<Skill\b([^/>]*?)\s*\/?>/g;
    let skillMatch: RegExpExecArray | null;
    while ((skillMatch = skillRegex.exec(content)) !== null) {
      const sAttrs = parseAttrs(skillMatch[1] ?? '');
      skills.push({
        active: sAttrs.active === 'true',
        name: sAttrs.name ?? sAttrs.nameSpec ?? '',
        level: parseInt(sAttrs.level ?? '1', 10),
        quality: parseInt(sAttrs.quality ?? '0', 10),
        variant: sAttrs.variant ?? 'regular',
      });
    }
    if (skills.length > 0) {
      skillSets.push({
        id: parseInt(setAttrs.id ?? String(skillSets.length + 1), 10),
        skills,
      });
    }
  }
  return skillSets;
}

function parseAllItems(xml: string): PoBItem[] {
  const itemsBlock = extractTag(xml, 'Items');
  if (!itemsBlock) return [];

  const items: PoBItem[] = [];
  const itemRegex = /<Item\b([^>]*)>([\s\S]*?)<\/Item>/g;
  let itemMatch: RegExpExecArray | null;
  while ((itemMatch = itemRegex.exec(itemsBlock)) !== null) {
    const itemAttrs = parseAttrs(itemMatch[1] ?? '');
    const inner = itemMatch[2] ?? '';
    const id = itemAttrs.id ?? '';

    if (!id) continue;

    const hasModTags = /<Mod\b/.test(inner);

    if (hasModTags) {
      items.push(parseItemLegacyFormat(id, itemAttrs, inner));
    } else {
      items.push(parseItemTextFormat(id, itemAttrs, inner));
    }
  }
  return items;
}

function parseItemSets(xml: string): PoBItemSet[] {
  const itemsBlock = extractTag(xml, 'Items');
  if (!itemsBlock) return [];

  const sets: PoBItemSet[] = [];
  const setRegex = /<ItemSet\b([^>]*)>([\s\S]*?)<\/ItemSet>/gi;
  let setMatch: RegExpExecArray | null;
  while ((setMatch = setRegex.exec(itemsBlock)) !== null) {
    const attrs = parseAttrs(setMatch[1] ?? '');
    const inner = setMatch[2] ?? '';
    const id = parseInt(attrs.id ?? '0', 10);
    if (!id) continue;

    const slotItemIds: Record<string, string> = {};
    const slotRegex = /<Slot\b([^>]*?)\/?>/gi;
    let slotMatch: RegExpExecArray | null;
    while ((slotMatch = slotRegex.exec(inner)) !== null) {
      const sAttrs = parseAttrs(slotMatch[1] ?? '');
      const itemId = sAttrs.itemId ?? '0';
      const name = sAttrs.name ?? '';
      if (itemId !== '0' && name) {
        slotItemIds[name] = itemId;
      }
    }

    sets.push({ id, title: attrs.title ?? '', slotItemIds });
  }
  return sets;
}

function resolveActiveItemIds(itemSets: PoBItemSet[], level: number): Set<string> {
  if (itemSets.length === 0) return new Set();

  let bestSet = itemSets[0]!;
  let bestScore = -Infinity;

  for (const set of itemSets) {
    const slotCount = Object.keys(set.slotItemIds).length;
    if (slotCount === 0) continue;

    const lvlMatch = /lvl\s*(\d+)/i.exec(set.title);
    if (!lvlMatch) {
      if (slotCount > bestScore) {
        bestScore = slotCount;
        bestSet = set;
      }
      continue;
    }

    const setLevel = parseInt(lvlMatch[1]!, 10);
    if (level >= setLevel) {
      const score = setLevel * 1000 + slotCount;
      if (score > bestScore) {
        bestScore = score;
        bestSet = set;
      }
    }
  }

  if (bestScore === -Infinity) {
    let maxSlots = 0;
    for (const set of itemSets) {
      const sc = Object.keys(set.slotItemIds).length;
      if (sc > maxSlots) { maxSlots = sc; bestSet = set; }
    }
  }

  return new Set(Object.values(bestSet.slotItemIds));
}

const ITEM_META_KEYS = /^(rarity|quality|armou?r|energy shield|evasion|sockets|levelreq|implicits|prefix|suffix|item level|shaper item|elder item|searing exarch item|eater of worlds item|crafted|corrupted|mirrored|fractured|synthesised|enchant|note|variant|armourbasepercentile|energyshieldbasepercentile|evasionbasepercentile)/i;

function parseItemTextFormat(id: string, itemAttrs: Record<string, string>, inner: string): PoBItem {
  const lines = inner.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  let textEnd = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.startsWith('<')) { textEnd = i; break; }
  }
  const textLines = lines.slice(0, textEnd);

  let rarity = 'normal';
  let title = '';
  let baseType = '';
  let implicitsCount = 0;
  let implicitsStart = -1;

  const metaLines = new Set<number>();

  for (let i = 0; i < textLines.length; i++) {
    const line = textLines[i]!;

    const implicitsMatch = /^Implicits:\s*(\d+)/i.exec(line);
    if (implicitsMatch) {
      implicitsCount = parseInt(implicitsMatch[1]!, 10);
      implicitsStart = i + 1;
      metaLines.add(i);
      continue;
    }

    const rarityMatch = /^Rarity:\s*(\w+)/i.exec(line);
    if (rarityMatch) {
      rarity = rarityMatch[1]!.toLowerCase();
      metaLines.add(i);
      continue;
    }

    if (ITEM_META_KEYS.test(line) || /^(prefix|suffix):\s/i.test(line)) {
      metaLines.add(i);
      continue;
    }
  }

  const dataLines: { idx: number; text: string }[] = [];
  for (let i = 0; i < textLines.length; i++) {
    if (!metaLines.has(i)) {
      dataLines.push({ idx: i, text: textLines[i]! });
    }
  }

  if (dataLines.length > 0 && !title) {
    title = dataLines[0]!.text;
  }
  if (dataLines.length > 1 && !baseType) {
    baseType = dataLines[1]!.text;
  }

  const mods: PoBMod[] = [];

  if (implicitsStart >= 0) {
    let implicitFound = 0;
    for (const dl of dataLines) {
      if (dl.idx >= implicitsStart && implicitFound < implicitsCount) {
        mods.push({ text: dl.text, implicit: true, explicit: false, crafted: false });
        implicitFound++;
      }
    }

    for (const dl of dataLines) {
      if (dl.idx >= implicitsStart + implicitsCount) {
        const isCrafted = /\{crafted\}/.test(dl.text);
        mods.push({ text: dl.text, implicit: false, explicit: true, crafted: isCrafted });
      }
    }
  }

  const sockets: PoBSocket[] = [];
  const socketRegex = /<Socket\b([^/>]*?)\s*\/?>/g;
  let socketMatch: RegExpExecArray | null;
  while ((socketMatch = socketRegex.exec(inner)) !== null) {
    const sAttrs = parseAttrs(socketMatch[1] ?? '');
    sockets.push({
      group: parseInt(sAttrs.group ?? '1', 10),
      attr: sAttrs.attr ?? '',
    });
  }

  return {
    id,
    title: itemAttrs.title ?? title,
    baseType,
    rarity,
    rawMods: mods,
    sockets,
  };
}

function parseItemLegacyFormat(id: string, itemAttrs: Record<string, string>, inner: string): PoBItem {
  const baseTypeMatch = /<baseType>([^<]+)<\/baseType>/i.exec(inner);
  const rarityMatch = /<rarity>([^<]+)<\/rarity>/i.exec(inner);

  const mods: PoBMod[] = [];
  const modRegex = /<Mod\b([^/>]*?)\s*\/?>/g;
  let modMatch: RegExpExecArray | null;
  while ((modMatch = modRegex.exec(inner)) !== null) {
    const mAttrs = parseAttrs(modMatch[1] ?? '');
    mods.push({
      text: mAttrs.text ?? '',
      implicit: mAttrs.implicit === 'true',
      explicit: mAttrs.explicit === 'true',
      crafted: mAttrs.crafted === 'true',
    });
  }

  const sockets: PoBSocket[] = [];
  const socketRegex = /<Socket\b([^/>]*?)\s*\/?>/g;
  let socketMatch: RegExpExecArray | null;
  while ((socketMatch = socketRegex.exec(inner)) !== null) {
    const sAttrs = parseAttrs(socketMatch[1] ?? '');
    sockets.push({
      group: parseInt(sAttrs.group ?? '1', 10),
      attr: sAttrs.attr ?? '',
    });
  }

  return {
    id,
    title: itemAttrs.title ?? '',
    baseType: baseTypeMatch?.[1] ?? '',
    rarity: rarityMatch?.[1] ?? 'normal',
    rawMods: mods,
    sockets,
  };
}

function parseTreeSection(xml: string): PoBTree {
  const treeBlock = extractTag(xml, 'Tree');
  if (!treeBlock) {
    return { treeVersion: '3_25', nodes: [], masteryEffects: {}, keystones: [], ascendancyNodes: [] };
  }

  const specMatch = /<Spec\b([^>]*)>([\s\S]*?)<\/Spec>/i.exec(treeBlock);
  const specAttrs = specMatch ? parseAttrs(specMatch[1] ?? '') : {};
  const raw = specMatch?.[2] ?? '';

  const nodes = extractNumbers(raw, /nodeId="(\d+)"/g);
  const masteryEffects: Record<number, string> = {};
  const mRegex = /\{mastery(?::AS)?:\{(\d+)\}\n\{([^}]+)\}/g;
  let mMatch: RegExpExecArray | null;
  while ((mMatch = mRegex.exec(raw)) !== null) {
    masteryEffects[parseInt(mMatch[1]!, 10)] = mMatch[2]!.trim();
  }
  const keystones: string[] = [];
  const kRegex = /\{keystone:([^}]+)\}/g;
  let kMatch: RegExpExecArray | null;
  while ((kMatch = kRegex.exec(raw)) !== null) {
    keystones.push(kMatch[1]!.trim());
  }
  const ascendancyNodes: string[] = [];
  const aRegex = /\{mastery:AS(\d+)\}/g;
  let aMatch: RegExpExecArray | null;
  while ((aMatch = aRegex.exec(raw)) !== null) {
    ascendancyNodes.push(aMatch[0]!);
  }

  return {
    treeVersion: specAttrs.treeVersion ?? '3_25',
    nodes,
    masteryEffects,
    keystones,
    ascendancyNodes,
  };
}

function extractNumbers(raw: string, regex: RegExp): number[] {
  const numbers: number[] = [];
  const seen = new Set<number>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    const n = parseInt(match[1]!, 10);
    if (!seen.has(n)) {
      seen.add(n);
      numbers.push(n);
    }
  }
  return numbers;
}

function parseConfigSection(xml: string): PoBConfig {
  const configBlock = extractTag(xml, 'Config');
  const charges = { frenzy: 0, power: 0, endurance: 0 };
  let isBoss = false;
  let enemyResistances = 30;

  if (!configBlock) return { isBoss, enemyResistances, charges };

  const inputRegex = /<[Ii]nput\b([^/>]*?)\s*\/?>/g;
  let inputMatch: RegExpExecArray | null;
  while ((inputMatch = inputRegex.exec(configBlock)) !== null) {
    const attrs = parseAttrs(inputMatch[1] ?? '');
    const name = (attrs.name ?? '').toLowerCase();
    const boolVal = (attrs.boolean ?? '').toLowerCase();
    const numVal = parseInt(attrs.number ?? '0', 10);

    switch (name) {
      case 'frenzycharges': case 'frenzychargesmax': case 'overridefrenzycharges':
        charges.frenzy = numVal || charges.frenzy; break;
      case 'powercharges': case 'powerchargesmax': case 'overridepowercharges':
        charges.power = numVal || charges.power; break;
      case 'endurancecharges': case 'endurancechargesmax': case 'overrideendurancecharges':
        charges.endurance = numVal || charges.endurance; break;
      case 'istypeofboss': case 'enemyisboss': case 'conditionenemyisboss':
        isBoss = boolVal === 'true'; break;
      case 'enemylevel': case 'enemymaplevel':
        if (numVal >= 84) isBoss = true; break;
    }
  }

  return { isBoss, enemyResistances, charges };
}
