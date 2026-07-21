import type { ModCategory } from './modifier.model.js';

const CATEGORY_FROM_FLAG: Record<string, ModCategory> = {
  implicit: 'implicit',
  explicit: 'explicit',
  crafted: 'crafted',
};

export interface ClassifyResult {
  category: ModCategory;
  tags: string[];
  tier?: number;
}

export function classifyMod(
  text: string,
  implicit: boolean,
  explicit: boolean,
  crafted: boolean,
): ClassifyResult {
  const category = resolveCategory(text, implicit, explicit, crafted);
  const tags = buildTagList(text, category);

  return { category, tags };
}

function resolveCategory(
  text: string,
  implicit: boolean,
  explicit: boolean,
  crafted: boolean,
): ModCategory {
  if (crafted) return 'crafted';
  if (implicit && !explicit) return 'implicit';

  if (/\bveiled\b/i.test(text)) return 'veiled';
  if (/\bfractured\b/i.test(text)) return 'fractured';
  if (/\bcorrupted\b/i.test(text) && /\bimplicit\b/i.test(text)) return 'corrupted';
  if (/\bsynthesised\b/i.test(text) || /\bsynthesized\b/i.test(text)) return 'synthesized';
  if (/\bshaper\b|\belder\b|\bcrusader\b|\bredeemer\b|\bhunter\b|\bwarlord\b/i.test(text)) {
    return 'influence';
  }
  if (/(?:lab|enchant|labyrinth)\s+enchant/i.test(text)) return 'enchant';

  if (explicit) return 'explicit';
  if (implicit) return 'implicit';

  return 'explicit';
}

function buildTagList(text: string, category: ModCategory): string[] {
  const tags: string[] = [];

  if (/\blife\b/i.test(text)) tags.push('life');
  if (/\benergy\s*shield\b/i.test(text)) tags.push('energyShield');
  if (/\bmana\b/i.test(text)) tags.push('mana');
  if (/\barmour\b/i.test(text)) tags.push('armour');
  if (/\bevasion\b/i.test(text)) tags.push('evasion');
  if (/\bward\b/i.test(text)) tags.push('ward');
  if (/\bresist/i.test(text)) tags.push('resist');
  if (/\bstrength\b/i.test(text)) tags.push('attribute');
  if (/\bdexterity\b/i.test(text)) tags.push('attribute');
  if (/\bintelligence\b/i.test(text)) tags.push('attribute');
  if (/\bdamage\b/i.test(text)) tags.push('damage');
  if (/\bfire\b/i.test(text)) tags.push('fire');
  if (/\bcold\b/i.test(text)) tags.push('cold');
  if (/\blightning\b/i.test(text)) tags.push('lightning');
  if (/\bchaos\b/i.test(text)) tags.push('chaos');
  if (/\bphysical\b/i.test(text)) tags.push('physical');
  if (/\belemental\b/i.test(text)) tags.push('elemental');
  if (/\bspeed\b/i.test(text) || /attack\s*speed|cast\s*speed|movement\s*speed/i.test(text)) tags.push('speed');
  if (/\bcritical\b/i.test(text)) tags.push('critical');
  if (/\bblock\b/i.test(text)) tags.push('block');
  if (/\bsuppress\b/i.test(text)) tags.push('suppression');
  if (/\bconversion\b|as\s+extra\b/i.test(text)) tags.push('conversion');
  if (/\bregenerate\b|\bregen\b/i.test(text)) tags.push('regen');

  if (tags.length === 0) tags.push('other');

  return [...new Set(tags)];
}
