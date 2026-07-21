import { inflateRawSync } from 'node:zlib';
import type { PoBXmlDTO, PoBBuildAttributes, PoBSkillSet, PoBSkill, PoBItem, PoBMod, PoBSocket, PoBTree, PoBConfig } from '../dto/pob-xml.dto.js';

// ---- Supported PoB XML versions ----
// This parser targets Path of Building Community Fork (openarl/PathOfBuilding).
// Tested with targetVersion="3_0" (Build tag) and treeVersion="3_25" (Tree/Spec tag).
// Unknown versions or fields are silently accepted with defaults — no crash.
// Future versions with structural XML changes will need parser updates.

const PASTEBIN_URL_RE = /^https:\/\/pastebin\.com\/(?:raw\/)?([a-zA-Z0-9_-]+)$/;

function decodeBase64(encoded: string): Buffer {
  return Buffer.from(encoded, 'base64');
}

function inflateRaw(data: Buffer): Buffer {
  return inflateRawSync(data);
}

export function isPobPastebinUrl(url: string): boolean {
  return PASTEBIN_URL_RE.test(url);
}

export function extractPastebinId(url: string): string | null {
  const match = url.match(PASTEBIN_URL_RE);
  return match ? (match[1] ?? null) : null;
}

export function parsePobXml(xml: string): PoBXmlDTO {
  return {
    build: parseBuildSection(xml),
    skills: parseSkillsSection(xml),
    items: parseItemsSection(xml),
    tree: parseTreeSection(xml),
    config: parseConfigSection(xml),
  };
}

export function parsePobPastebin(base64Content: string): PoBXmlDTO {
  const compressed = decodeBase64(base64Content);
  const rawXml = inflateRaw(compressed).toString('utf-8');
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

function parseItemsSection(xml: string): PoBItem[] {
  const itemsBlock = extractTag(xml, 'Items');
  if (!itemsBlock) return [];

  const items: PoBItem[] = [];
  const itemRegex = /<Item\b([^>]*)>([\s\S]*?)<\/Item>/g;
  let itemMatch: RegExpExecArray | null;
  while ((itemMatch = itemRegex.exec(itemsBlock)) !== null) {
    const itemAttrs = parseAttrs(itemMatch[1] ?? '');
    const inner = itemMatch[2] ?? '';
    const id = itemAttrs.id ?? '';

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

    if (id) {
      items.push({
        id,
        title: itemAttrs.title ?? '',
        baseType: baseTypeMatch?.[1] ?? '',
        rarity: rarityMatch?.[1] ?? 'normal',
        rawMods: mods,
        sockets,
      });
    }
  }
  return items;
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
  let enemyResistances = 30; // Default. PoB Config may contain per-element resistance overrides.

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
      // PoisonConfig handles enemy elemental resistances per element;
      // the single enemyResistances average is an approximation.
    }
  }

  return { isBoss, enemyResistances, charges };
}
