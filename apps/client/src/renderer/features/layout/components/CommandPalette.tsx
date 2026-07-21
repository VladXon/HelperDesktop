import * as React from 'react';
import { Dialog, DialogContent, DialogTitle } from '../../../components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '../../../components/ui/command';
import { useRouter } from '../../../providers/RouterProvider';
import { notesCommands } from '../../notes';
import { presetsCommands } from '../../presets';
import { settingsCommands } from '../../settings';
import { poeCommands } from '../../poe-assistant';

export interface CommandDef {
  id: string;
  label: string;
  section: 'Pages' | 'Notes' | 'Presets' | 'PoE' | 'Settings';
  keywords?: string[];
  action: () => void;
}

export function CommandPalette(): React.JSX.Element {
  const { isCommandPaletteOpen, closeCommandPalette, navigate } = useRouter();

  const commands = React.useMemo<CommandDef[]>(() => {
    const setPaletteCloseAnd = (fn: () => void): (() => void) => () => {
      closeCommandPalette();
      fn();
    };
    const pages: CommandDef[] = [
      { id: 'page.notes', label: 'Перейти к заметкам', section: 'Pages', action: setPaletteCloseAnd(() => navigate({ page: 'notes' })) },
      { id: 'page.presets', label: 'Перейти к пресетам', section: 'Pages', action: setPaletteCloseAnd(() => navigate({ page: 'presets' })) },
      { id: 'page.settings', label: 'Перейти к настройкам', section: 'Pages', action: setPaletteCloseAnd(() => navigate({ page: 'settings' })) },
      { id: 'page.poe', label: 'PoE Assistant', section: 'Pages', action: setPaletteCloseAnd(() => navigate({ page: 'poe-assistant' })) },
    ];
    return [...pages, ...notesCommands(closeCommandPalette), ...presetsCommands(closeCommandPalette), ...poeCommands(closeCommandPalette), ...settingsCommands(closeCommandPalette)];
  }, [closeCommandPalette, navigate]);

  const grouped = React.useMemo(() => {
    const groups: Record<string, CommandDef[]> = {};
    for (const cmd of commands) {
      if (!groups[cmd.section]) groups[cmd.section] = [];
      groups[cmd.section]!.push(cmd);
    }
    return groups;
  }, [commands]);

  return (
    <Dialog open={isCommandPaletteOpen} onOpenChange={(v) => { if (!v) closeCommandPalette(); }}>
      <DialogContent
        hideClose
        className="top-1/4 translate-y-0 max-w-md p-0 overflow-hidden gap-0 backdrop-blur-none border-border bg-bg-secondary shadow-[0_16px_48px_rgba(0,0,0,0.5)]"
      >
        <DialogTitle className="sr-only">Командная палитра</DialogTitle>
        <Command>
          <CommandInput placeholder="Введите команду..." />
          <CommandList>
            <CommandEmpty>Команды не найдены</CommandEmpty>
            {Object.entries(grouped).map(([section, items], idx) => (
              <React.Fragment key={section}>
                {idx > 0 ? <CommandSeparator /> : null}
                <CommandGroup heading={section}>
                  {items.map((cmd) => (
                    <CommandItem key={cmd.id} value={`${cmd.label} ${(cmd.keywords ?? []).join(' ')}`} onSelect={cmd.action}>
                      {cmd.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
