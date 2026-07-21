import type { SkillSetup, ActiveSkill } from '../models/skill.model.js';
import type { ParsedSkillSetupDto } from '../dto/skill.dto.js';
import { resolveActiveGem } from '../resolvers/active-gem.resolver.js';
import { resolveSupportGems } from '../resolvers/support-gem.resolver.js';

export function createSkillSetup(dto: ParsedSkillSetupDto): SkillSetup {
  const active = dto.activeGem ? resolveActiveGem(dto.activeGem) : null;

  return {
    activeSkill: active,
    supports: resolveSupportGems(dto.supportGems),
    enabled: dto.enabled && dto.activeGem !== null,
    sockets: dto.sockets,
  };
}

export function createSkillSetups(dtos: ParsedSkillSetupDto[]): SkillSetup[] {
  return dtos.map(createSkillSetup);
}
