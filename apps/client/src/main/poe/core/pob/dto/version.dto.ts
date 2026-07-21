export type PoBVersion = '3.25' | '3.26' | 'unknown';

export interface VersionCapabilities {
  version: PoBVersion;
  supportsClusterJewels: boolean;
  supportsPassiveMasteries: boolean;
  supportsEldritchImplicits: boolean;
  supportsTimelessJewels: boolean;
  supportsTinctures: boolean;
  hasTransfiguredGems: boolean;
  gemQualityVariant: boolean;
  itemInfluence: boolean;
}
