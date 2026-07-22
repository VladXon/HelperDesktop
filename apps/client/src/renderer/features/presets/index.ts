import type { CommandDef } from '../layout/components/CommandPalette.types';

export { PresetsPage } from './components/PresetsPage';
export { PresetCard } from './components/PresetCard';
export { PresetEditDialog } from './components/PresetEditDialog';
export { AppRow } from './components/AppRow';
export { usePresets } from './hooks/usePresets';
export { useCreatePreset } from './hooks/useCreatePreset';
export { useUpdatePreset } from './hooks/useUpdatePreset';
export { useDeletePreset } from './hooks/useDeletePreset';
export { useTogglePin } from './hooks/useTogglePin';
export { useLaunchPreset } from './hooks/useLaunchPreset';
export type { Preset, PresetApp, PresetCreateInput, PresetUpdateInput } from './types';

export function presetsCommands(close: () => void): CommandDef[] {
  return [
    {
      id: 'presets.new',
      label: 'Новый пресет',
      section: 'Presets',
      keywords: ['create', 'add', 'создать', 'пресет'],
      action: () => {
        close();
        window.dispatchEvent(new CustomEvent('presets:new'));
      },
    },
  ];
}
