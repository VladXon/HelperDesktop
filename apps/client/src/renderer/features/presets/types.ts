import type { Preset, PresetApp } from '@helper/shared';

export type { Preset, PresetApp };

export interface PresetCreateInput {
  name: string;
  icon: string;
  apps: PresetApp[];
}

export interface PresetUpdateInput {
  name?: string;
  icon?: string;
  apps?: PresetApp[];
  pinned?: boolean;
}
