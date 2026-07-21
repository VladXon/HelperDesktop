import { describe, it, expect } from 'vitest';
import { resolveActiveGem } from '../resolvers/active-gem.resolver.js';
import { resolveSupportGem, resolveSupportGems, calculateSupportMultiplier } from '../resolvers/support-gem.resolver.js';
import { resolveQualityEffects } from '../resolvers/quality.resolver.js';
import { createSkillSetup, createSkillSetups } from '../factory/skill.factory.js';
import { resolveDamageAfterConversion, createConversionRule, validateConversionOrder } from '../mechanics/conversion.chain.js';
import { isAttack, isSpell, isMelee, isAoE, isDoT, isTrap, getDamageTypes } from '../mechanics/damage-tags.js';
import type { ParsedActiveGemDto } from '../dto/gem.dto.js';
import type { ParsedSupportGemDto } from '../dto/skill.dto.js';
import type { ParsedSkillSetupDto } from '../dto/skill.dto.js';

describe('active gem resolver', () => {
  const fireTrapDto: ParsedActiveGemDto = {
    name: 'Fire Trap',
    level: 20,
    quality: 20,
    variant: 'regular',
    isCorrupted: false,
    isVaal: false,
    isAwakened: false,
    tags: [],
    gemId: null,
    baseDamageInfo: null,
  };

  it('resolves Fire Trap with correct tags', () => {
    const skill = resolveActiveGem(fireTrapDto);
    expect(skill.name).toBe('Fire Trap');
    expect(skill.level).toBe(20);
    expect(skill.quality).toBe(20);
    expect(skill.tags).toContain('fire');
    expect(skill.tags).toContain('spell');
    expect(skill.tags).toContain('trap');
    expect(skill.tags).toContain('dot');
  });

  it('resolves Fire Trap mechanics as trap type', () => {
    const skill = resolveActiveGem(fireTrapDto);
    expect(skill.mechanics.length).toBe(1);
    expect(skill.mechanics[0]!.type).toBe('trap');
  });

  it('resolves Fireball with projectile tag', () => {
    const dto: ParsedActiveGemDto = { ...fireTrapDto, name: 'Fireball' };
    const skill = resolveActiveGem(dto);
    expect(skill.tags).toContain('fire');
    expect(skill.tags).toContain('spell');
    expect(skill.tags).toContain('projectile');
    expect(skill.effectiveness).toBe(3.7);
    expect(skill.castTime).toBe(0.75);
  });

  it('resolves RF with dot and duration tags', () => {
    const dto: ParsedActiveGemDto = { ...fireTrapDto, name: 'Righteous Fire' };
    const skill = resolveActiveGem(dto);
    expect(skill.tags).toContain('fire');
    expect(skill.tags).toContain('dot');
    expect(skill.tags).toContain('duration');
    expect(skill.castTime).toBe(0);
  });

  it('resolves Boneshatter with melee and attack tags', () => {
    const dto: ParsedActiveGemDto = { ...fireTrapDto, name: 'Boneshatter' };
    const skill = resolveActiveGem(dto);
    expect(skill.tags).toContain('physical');
    expect(skill.tags).toContain('attack');
    expect(skill.tags).toContain('melee');
    expect(skill.tags).toContain('strike');
    expect(skill.attackTime).toBe(0.85);
  });

  it('resolves Lightning Strike with 50% phys-to-lightning conversion', () => {
    const dto: ParsedActiveGemDto = { ...fireTrapDto, name: 'Lightning Strike' };
    const skill = resolveActiveGem(dto);
    expect(skill.tags).toContain('lightning');
    expect(skill.conversion.length).toBe(1);
    expect(skill.conversion[0]!.from).toBe('physical');
    expect(skill.conversion[0]!.to).toBe('lightning');
    expect(skill.conversion[0]!.percent).toBe(50);
  });

  it('handles Vaal skill variant', () => {
    const dto: ParsedActiveGemDto = {
      name: 'Fireball',
      level: 20,
      quality: 0,
      variant: 'regular',
      isCorrupted: false,
      isVaal: true,
      isAwakened: false,
      tags: ['fire', 'spell', 'vaal'],
      gemId: null,
      baseDamageInfo: null,
    };
    const skill = resolveActiveGem(dto);
    expect(skill.isVaal).toBe(true);
    expect(skill.tags).toContain('vaal');
  });

  it('returns defaults for unknown gem', () => {
    const dto: ParsedActiveGemDto = {
      name: 'UnknownSkill',
      level: 1,
      quality: 0,
      variant: 'regular',
      isCorrupted: false,
      isVaal: false,
      isAwakened: false,
      tags: ['spell'],
      gemId: null,
      baseDamageInfo: null,
    };
    const skill = resolveActiveGem(dto);
    expect(skill.name).toBe('UnknownSkill');
    expect(skill.tags).toEqual(['spell']);
    expect(skill.effectiveness).toBe(1.0);
    expect(skill.baseDamage).toEqual([]);
    expect(skill.mechanics.length).toBe(1);
    expect(skill.mechanics[0]!.type).toBe('selfCast');
  });
});

describe('support gem resolver', () => {
  it('resolves Brutality support with more multiplier', () => {
    const dto: ParsedSupportGemDto = {
      name: 'Brutality',
      level: 20,
      quality: 20,
      variant: 'regular',
      isAwakened: false,
      isCorrupted: false,
      multiplier: null,
      tags: [],
      restrictions: [],
    };
    const gem = resolveSupportGem(dto);
    expect(gem.name).toBe('Brutality');
    expect(gem.moreMultiplier).toBe(59);
    expect(gem.supportedTags).toContain('melee');
    expect(gem.restrictions).toContain('elemental');
  });

  it('resolves Awakened support with isAwakened flag', () => {
    const dto: ParsedSupportGemDto = {
      name: 'Brutality',
      level: 20,
      quality: 20,
      variant: 'regular',
      isAwakened: true,
      isCorrupted: false,
      multiplier: null,
      tags: [],
      restrictions: [],
    };
    const gem = resolveSupportGem(dto);
    expect(gem.isAwakened).toBe(true);
  });

  it('calculates support multipliers correctly (product of mores)', () => {
    const gem1 = resolveSupportGem({
      name: 'Brutality',
      level: 20, quality: 20, variant: 'regular',
      isAwakened: false, isCorrupted: false,
      multiplier: null, tags: [], restrictions: [],
    });
    const gem2 = resolveSupportGem({
      name: 'Melee Physical Damage',
      level: 20, quality: 20, variant: 'regular',
      isAwakened: false, isCorrupted: false,
      multiplier: null, tags: [], restrictions: [],
    });

    const result = calculateSupportMultiplier([gem1, gem2]);
    expect(result.more).toBeGreaterThan(100);
    expect(result.increased).toBe(0);
  });

  it('resolves multiple support gems at once', () => {
    const dtos: ParsedSupportGemDto[] = [
      { name: 'Brutality', level: 20, quality: 20, variant: 'regular',
        isAwakened: false, isCorrupted: false, multiplier: null, tags: [], restrictions: [] },
      { name: 'Melee Physical Damage', level: 20, quality: 20, variant: 'regular',
        isAwakened: false, isCorrupted: false, multiplier: null, tags: [], restrictions: [] },
    ];
    const gems = resolveSupportGems(dtos);
    expect(gems.length).toBe(2);
    expect(gems[0]!.name).toBe('Brutality');
    expect(gems[1]!.moreMultiplier).toBe(49);
  });
});

describe('quality resolver', () => {
  it('resolves Fireball regular quality as projectile speed', () => {
    const effects = resolveQualityEffects('Fireball', 20, 'regular');
    expect(effects.length).toBe(1);
    expect(effects[0]!.stat).toBe('projectileSpeed');
    expect(effects[0]!.value).toBe(20);
    expect(effects[0]!.type).toBe('increased');
  });

  it('resolves Fireball anomalous quality as ignite chance', () => {
    const effects = resolveQualityEffects('Fireball', 20, 'anomalous');
    expect(effects.length).toBe(1);
    expect(effects[0]!.stat).toBe('chanceToIgnite');
    expect(effects[0]!.value).toBe(20);
  });

  it('returns empty for unknown gem', () => {
    const effects = resolveQualityEffects('UnknownGem', 20, 'regular');
    expect(effects).toEqual([]);
  });

  it('returns empty for zero quality', () => {
    const effects = resolveQualityEffects('Fireball', 0, 'regular');
    expect(effects).toEqual([]);
  });
});

describe('skill factory', () => {
  it('creates a SkillSetup from DTO', () => {
    const dto: ParsedSkillSetupDto = {
      activeGem: {
        name: 'Fireball',
        level: 20,
        quality: 20,
        variant: 'regular',
        isCorrupted: false,
        isVaal: false,
        isAwakened: false,
        tags: [],
        gemId: null,
        baseDamageInfo: null,
      },
      supportGems: [
        { name: 'Brutality', level: 20, quality: 20, variant: 'regular',
          isAwakened: false, isCorrupted: false, multiplier: null, tags: [], restrictions: [] },
      ],
      sockets: 6,
      enabled: true,
    };

    const setup = createSkillSetup(dto);
    expect(setup.activeSkill).toBeDefined();
    expect(setup.activeSkill!.name).toBe('Fireball');
    expect(setup.supports.length).toBe(1);
    expect(setup.sockets).toBe(6);
    expect(setup.enabled).toBe(true);
  });

  it('handles empty active gem', () => {
    const dto: ParsedSkillSetupDto = {
      activeGem: null,
      supportGems: [],
      sockets: 0,
      enabled: true,
    };

    const setup = createSkillSetup(dto);
    expect(setup.activeSkill).toBeNull();
    expect(setup.enabled).toBe(false);
  });

  it('creates multiple setups from array', () => {
    const dtos: ParsedSkillSetupDto[] = [
      {
        activeGem: { name: 'Fireball', level: 20, quality: 0, variant: 'regular',
          isCorrupted: false, isVaal: false, isAwakened: false, tags: [], gemId: null, baseDamageInfo: null },
        supportGems: [],
        sockets: 4,
        enabled: true,
      },
      {
        activeGem: { name: 'Righteous Fire', level: 20, quality: 0, variant: 'regular',
          isCorrupted: false, isVaal: false, isAwakened: false, tags: [], gemId: null, baseDamageInfo: null },
        supportGems: [],
        sockets: 4,
        enabled: true,
      },
    ];

    const setups = createSkillSetups(dtos);
    expect(setups.length).toBe(2);
    expect(setups[0]!.activeSkill!.name).toBe('Fireball');
    expect(setups[1]!.activeSkill!.name).toBe('Righteous Fire');
  });
});

describe('conversion chain', () => {
  it('validates conversion order (physical -> fire is valid)', () => {
    expect(validateConversionOrder('physical', 'fire')).toBe(true);
    expect(validateConversionOrder('physical', 'lightning')).toBe(true);
    expect(validateConversionOrder('physical', 'cold')).toBe(true);
    expect(validateConversionOrder('physical', 'chaos')).toBe(true);
  });

  it('rejects invalid conversion order (fire -> physical)', () => {
    expect(validateConversionOrder('fire', 'physical')).toBe(false);
    expect(validateConversionOrder('lightning', 'physical')).toBe(false);
  });

  it('resolves conversion: 100 phys + 50% phys-to-fire', () => {
    const result = resolveDamageAfterConversion(
      { physical: 100 },
      [createConversionRule('physical', 'fire', 50, 'conversion')],
    );
    expect(result.physical).toBeCloseTo(50);
    expect(result.fire).toBeCloseTo(50);
  });

  it('resolves added-as-extra: 100 phys + 20% added as fire', () => {
    const result = resolveDamageAfterConversion(
      { physical: 100 },
      [createConversionRule('physical', 'fire', 20, 'addedAsExtra')],
    );
    expect(result.physical).toBeCloseTo(100);
    expect(result.fire).toBeCloseTo(20);
  });
});

describe('damage tags', () => {
  it('classifies Fire Trap correctly', () => {
    const tags = ['fire', 'spell', 'trap', 'aoe', 'duration', 'dot'] as const;
    expect(isSpell([...tags])).toBe(true);
    expect(isDoT([...tags])).toBe(true);
    expect(isTrap([...tags])).toBe(true);
    expect(isAoE([...tags])).toBe(true);
    expect(isAttack([...tags])).toBe(false);
    expect(isMelee([...tags])).toBe(false);
  });

  it('classifies Boneshatter correctly', () => {
    expect(isAttack(['physical', 'attack', 'melee'])).toBe(true);
    expect(isMelee(['physical', 'attack', 'melee'])).toBe(true);
    expect(isSpell(['physical', 'attack', 'melee'])).toBe(false);
  });

  it('extracts damage types from tags', () => {
    const types = getDamageTypes(['fire', 'spell', 'projectile', 'aoe']);
    expect(types).toContain('fire');
    expect(types.length).toBe(1);
  });
});
