import type { PoBVersion, VersionCapabilities } from '../dto/version.dto.js';
import type { PoBXmlDTO } from '../../dto/pob-xml.dto.js';

const SUPPORTED_VERSIONS: Record<string, VersionCapabilities> = {
  '3_25': {
    version: '3.25',
    supportsClusterJewels: true,
    supportsPassiveMasteries: true,
    supportsEldritchImplicits: true,
    supportsTimelessJewels: true,
    supportsTinctures: true,
    hasTransfiguredGems: true,
    gemQualityVariant: true,
    itemInfluence: true,
  },
  '3_26': {
    version: '3.26',
    supportsClusterJewels: true,
    supportsPassiveMasteries: true,
    supportsEldritchImplicits: true,
    supportsTimelessJewels: true,
    supportsTinctures: false,
    hasTransfiguredGems: true,
    gemQualityVariant: true,
    itemInfluence: true,
  },
};

const UNKNOWN_CAPABILITIES: VersionCapabilities = {
  version: 'unknown',
  supportsClusterJewels: false,
  supportsPassiveMasteries: false,
  supportsEldritchImplicits: false,
  supportsTimelessJewels: false,
  supportsTinctures: false,
  hasTransfiguredGems: false,
  gemQualityVariant: false,
  itemInfluence: false,
};

export function detectVersion(dto: PoBXmlDTO): PoBVersion {
  const raw = dto.build.targetVersion;
  if (raw === '3_25') return '3.25';
  if (raw === '3_26') return '3.26';
  return 'unknown';
}

export function getCapabilities(version: PoBVersion): VersionCapabilities {
  const key = version === '3.25' ? '3_25' : version === '3.26' ? '3_26' : null;
  if (key !== null && key in SUPPORTED_VERSIONS) {
    const caps = SUPPORTED_VERSIONS[key];
    if (caps) return caps;
  }
  return { ...UNKNOWN_CAPABILITIES, version };
}

export function isSupported(version: PoBVersion): boolean {
  return version !== 'unknown';
}
