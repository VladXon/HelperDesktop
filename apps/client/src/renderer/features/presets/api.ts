import type { Preset } from '@helper/shared';
import type { PresetCreateInput, PresetUpdateInput } from './types';

export async function getAll(): Promise<Preset[]> {
  return window.api.presets.getAll();
}

export async function save(input: PresetCreateInput): Promise<Preset> {
  return window.api.presets.save(input);
}

export async function update(id: number, input: PresetUpdateInput): Promise<Preset> {
  return window.api.presets.update(id, input);
}

export async function remove(id: number): Promise<void> {
  return window.api.presets.delete(id);
}

export async function launch(id: number): Promise<void> {
  return window.api.presets.launch(id);
}

export async function togglePin(id: number): Promise<Preset> {
  return window.api.presets.togglePin(id);
}
