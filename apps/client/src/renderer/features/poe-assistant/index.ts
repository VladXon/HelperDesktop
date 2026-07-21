import type { CommandDef } from '../layout';

export { PoeAssistantPage } from './components/PoeAssistantPage';
export { usePoeSession, useLeagues, useExchangeRate, useItemSearch, useCharacters } from './hooks/usePoeQueries';

export function poeCommands(close: () => void): CommandDef[] {
  return [
    {
      id: 'poe.open',
      label: 'PoE Assistant',
      section: 'Pages',
      keywords: ['poe', 'currency', 'trade', 'economy'],
      action: () => {
        close();
        window.dispatchEvent(new CustomEvent('poe-assistant:open'));
      },
    },
  ];
}
