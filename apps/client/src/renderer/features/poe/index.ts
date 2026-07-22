import type { CommandDef } from '../layout/components/CommandPalette.types';

export { PoeAnalyzerPage } from './pages/PoeAnalyzerPage';
export { usePoeAnalyzer } from './hooks/usePoeAnalyzer';

export function poeAnalyzerCommands(close: () => void): CommandDef[] {
  return [
    {
      id: 'poe-analyzer.open',
      label: 'PoE Build Analyzer',
      section: 'Pages',
      keywords: ['poe', 'build', 'pob', 'analyze', 'dps', 'defense'],
      action: () => {
        close();
        window.dispatchEvent(new CustomEvent('poe-analyzer:open'));
      },
    },
  ];
}
