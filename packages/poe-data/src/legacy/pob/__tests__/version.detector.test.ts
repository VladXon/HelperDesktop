import { describe, it, expect } from 'vitest';
import { detectVersion, getCapabilities, isSupported } from '../version/version.detector.js';
import type { PoBXmlDTO } from '../../dto/pob-xml.dto.js';

function makeDto(version: string): PoBXmlDTO {
  return {
    build: {
      level: 90,
      className: 'Juggernaut',
      ascendClassName: 'Berserker',
      bandit: 'oak',
      targetVersion: version,
    },
    skills: [],
    items: [],
    tree: { treeVersion: version, nodes: [], masteryEffects: {}, keystones: [], ascendancyNodes: [] },
    config: { isBoss: false, enemyResistances: 30, charges: { frenzy: 0, power: 0, endurance: 0 } },
  };
}

describe('version detector', () => {
  it('detects 3.25 version from targetVersion', () => {
    const dto = makeDto('3_25');
    expect(detectVersion(dto)).toBe('3.25');
  });

  it('detects 3.26 version from targetVersion', () => {
    const dto = makeDto('3_26');
    expect(detectVersion(dto)).toBe('3.26');
  });

  it('returns unknown for unrecognized version', () => {
    const dto = makeDto('3_24');
    expect(detectVersion(dto)).toBe('unknown');
  });

  it('returns unknown for empty version', () => {
    const dto = makeDto('');
    expect(detectVersion(dto)).toBe('unknown');
  });

  it('returns full capabilities for 3.25', () => {
    const caps = getCapabilities('3.25');
    expect(caps.version).toBe('3.25');
    expect(caps.supportsClusterJewels).toBe(true);
    expect(caps.supportsPassiveMasteries).toBe(true);
    expect(caps.supportsEldritchImplicits).toBe(true);
    expect(caps.supportsTinctures).toBe(true);
    expect(caps.hasTransfiguredGems).toBe(true);
    expect(caps.gemQualityVariant).toBe(true);
    expect(caps.itemInfluence).toBe(true);
  });

  it('returns minimal capabilities for unknown version', () => {
    const caps = getCapabilities('unknown');
    expect(caps.version).toBe('unknown');
    expect(caps.supportsClusterJewels).toBe(false);
    expect(caps.supportsPassiveMasteries).toBe(false);
  });

  it('isSupported returns true for known versions', () => {
    expect(isSupported('3.25')).toBe(true);
    expect(isSupported('3.26')).toBe(true);
  });

  it('isSupported returns false for unknown', () => {
    expect(isSupported('unknown')).toBe(false);
  });
});
