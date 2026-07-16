import * as React from 'react';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { useTheme } from '../hooks/useTheme';
import { THEME_TOKEN_KEYS, type ThemeTokenKey } from '@helper/shared';

const LABEL: Record<ThemeTokenKey, string> = {
  'theme.bg-primary': 'Фон основной',
  'theme.bg-secondary': 'Фон вторичный',
  'theme.bg-sidebar': 'Фон боковой панели',
  'theme.text-primary': 'Текст основной',
  'theme.text-secondary': 'Текст вторичный',
  'theme.text-muted': 'Текст приглушённый',
  'theme.primary': 'Основной',
  'theme.primary-container': 'Контейнер основного',
  'theme.accent': 'Акцент',
  'theme.accent-hover': 'Акцент при наведении',
  'theme.border': 'Граница',
};

export function ThemeSection(): React.JSX.Element {
  const { tokens, setTokens, save, reset, isDirty } = useTheme();
  const [saving, setSaving] = React.useState<boolean>(false);

  const onSave = async (): Promise<void> => {
    setSaving(true);
    try {
      await save(tokens);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {THEME_TOKEN_KEYS.map((key) => {
          const value = tokens[key] ?? '';
          const isColor = !value.startsWith('rgba') && !value.startsWith('rgb');
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <Label htmlFor={`tk-${key}`}>{LABEL[key]}</Label>
              <div className="flex items-center gap-2">
                <input
                  id={`tk-${key}`}
                  type="color"
                  value={isColor ? value : '#000000'}
                  onChange={(e) => setTokens({ ...tokens, [key]: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-bg-secondary"
                />
                <Input
                  value={value}
                  onChange={(e) => setTokens({ ...tokens, [key]: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Button onClick={onSave} disabled={!isDirty || saving}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
        <Button variant="outline" onClick={reset}>Сбросить</Button>
      </div>
    </div>
  );
}
