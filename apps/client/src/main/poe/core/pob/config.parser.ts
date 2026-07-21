import type { PoBConfig } from '../dto/pob-xml.dto.js';
import type { ParsedConfigDto } from './dto/config.dto.js';

export function parsePoBConfig(config: PoBConfig): ParsedConfigDto {
  return {
    isBoss: config.isBoss,
    isGuardian: false,
    isUber: false,
    enemyResistances: config.enemyResistances,
    charges: {
      frenzy: config.charges.frenzy,
      power: config.charges.power,
      endurance: config.charges.endurance,
    },
  };
}
