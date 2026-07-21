import type * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../components/ui/button';
import { FloppyDisk, Trash, Scales } from '@phosphor-icons/react';
import type { PoeAnalyzeResult } from '../types';

interface SaveBuildButtonProps {
  result: PoeAnalyzeResult;
  pobUrl: string;
  loading: boolean;
}

export function SaveBuildButton({ result, pobUrl, loading }: SaveBuildButtonProps): React.JSX.Element {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await window.api.poe.saveBuild({
        pobUrl,
        rawPobXml: '',
        buildName: result.import.buildSummary.name,
        characterClass: result.import.buildSummary.name,
        ascendancy: result.import.buildSummary.ascendancy,
        level: result.import.buildSummary.level,
        game: 'poe1',
        source: 'pob',
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      void 0;
    } finally {
      setSaving(false);
    }
  }, [result, pobUrl]);

  if (loading) return <span />;

  return (
    <Button
      onClick={handleSave}
      disabled={saving || saved}
      variant={saved ? 'outline' : 'default'}
      size="sm"
      className="gap-1 mb-2"
    >
      <FloppyDisk size={16} />
      {saved ? 'Saved' : saving ? 'Saving...' : 'Save Build'}
    </Button>
  );
}
