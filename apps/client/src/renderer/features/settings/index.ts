import type { CommandDef } from '../layout/components/CommandPalette.types';

export { SettingsPage } from './components/SettingsPage';
export { AccountSection } from './components/AccountSection';
export { TelegramSection } from './components/TelegramSection';
export { ThemeSection } from './components/ThemeSection';
export { DevConsole } from './components/DevConsole';
export { ServerSection } from './components/ServerSection';
export { ServersSection } from './components/ServersSection';
export { useSettings } from './hooks/useSettings';
export { useUpdateSettings } from './hooks/useUpdateSettings';
export { useTheme } from './hooks/useTheme';
export { useDevCommands } from './hooks/useDevCommands';
export { useServerUrl } from './hooks/useServerUrl';
export type { DevServerInfo } from './types';

export function settingsCommands(close: () => void): CommandDef[] {
  return [
    {
      id: 'settings.open',
      label: 'Открыть настройки',
      section: 'Settings',
      keywords: ['preferences', 'config', 'конфиг'],
      action: () => {
        close();
        window.dispatchEvent(new CustomEvent('settings:open'));
      },
    },
  ];
}
