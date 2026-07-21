import type { SkillTag } from '../models/skill.model.js';

export function isAttack(tags: SkillTag[]): boolean {
  return tags.includes('attack');
}

export function isSpell(tags: SkillTag[]): boolean {
  return tags.includes('spell');
}

export function isMelee(tags: SkillTag[]): boolean {
  return tags.includes('melee');
}

export function isProjectile(tags: SkillTag[]): boolean {
  return tags.includes('projectile');
}

export function isAoE(tags: SkillTag[]): boolean {
  return tags.includes('aoe');
}

export function isDuration(tags: SkillTag[]): boolean {
  return tags.includes('duration');
}

export function isDoT(tags: SkillTag[]): boolean {
  return tags.includes('dot');
}

export function isMinion(tags: SkillTag[]): boolean {
  return tags.includes('minion');
}

export function isTrap(tags: SkillTag[]): boolean {
  return tags.includes('trap');
}

export function isMine(tags: SkillTag[]): boolean {
  return tags.includes('mine');
}

export function isTotem(tags: SkillTag[]): boolean {
  return tags.includes('totem');
}

export function getDamageTypes(tags: SkillTag[]): string[] {
  const damageTags = new Set<string>();
  for (const tag of tags) {
    if (['physical', 'fire', 'cold', 'lightning', 'chaos', 'elemental'].includes(tag)) {
      damageTags.add(tag);
    }
  }
  return [...damageTags];
}
