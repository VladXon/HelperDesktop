export interface CommandDef {
  id: string;
  label: string;
  section: 'Pages' | 'Notes' | 'Presets' | 'PoE' | 'PoE Analyzer' | 'Settings';
  keywords?: string[];
  action: () => void;
}