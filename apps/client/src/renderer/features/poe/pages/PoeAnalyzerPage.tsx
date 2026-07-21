import type * as React from 'react';
import { useState, useCallback } from 'react';
import { usePoeAnalyzer } from '../hooks/usePoeAnalyzer';
import { PobImportPanel } from '../components/PobImportPanel';
import { BuildSummaryCard } from '../components/BuildSummaryCard';
import { StatOverview } from '../components/StatOverview';
import { DefensePanel } from '../components/DefensePanel';
import { DamagePanel } from '../components/DamagePanel';
import { ProblemsPanel } from '../components/ProblemsPanel';
import { RecommendationsPanel } from '../components/RecommendationsPanel';
import { AIExplanationPanel } from '../components/AIExplanationPanel';
import { SaveBuildButton } from '../components/SaveBuildButton';
import { HistoryPanel } from '../components/HistoryPanel';
import { PoeAccountPanel } from '../components/PoeAccountPanel';
import { CharacterPanel } from '../components/CharacterPanel';

export function PoeAnalyzerPage(): React.JSX.Element {
  const { loading, error, result, analyze, setResult, setError, setLoading, reset } = usePoeAnalyzer();
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [selectedCompare, setSelectedCompare] = useState<string | null>(null);
  const [importingChar, setImportingChar] = useState(false);

  const handleAnalyze = (url: string) => {
    setCurrentUrl(url);
    analyze(url);
  };

  const handleCharacterImport = useCallback(async (name: string) => {
    setImportingChar(true);
    setLoading(true);
    setError(null);
    setCurrentUrl('');
    try {
      const charResult = await window.api.poe.analyzeCharacter(name);
      setResult(charResult as any);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setImportingChar(false);
      setLoading(false);
    }
  }, []);

  const handleHistorySelect = async (hash: string) => {
    try {
      window.dispatchEvent(new CustomEvent('poe:history-select', { detail: hash }));
    } catch {
      void 0;
    }
  };

  const handleCompare = (hash: string) => {
    if (selectedCompare === null) {
      setSelectedCompare(hash);
    } else {
      try {
        window.api.poe.compareBuilds(selectedCompare, hash);
        setSelectedCompare(null);
      } catch {
        setSelectedCompare(null);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-white/5">
        <h1 className="text-headline-lg font-semibold text-text-primary mb-3">Build Analyzer</h1>
        <PobImportPanel onAnalyze={handleAnalyze} loading={loading} />
      </div>

      <div className="flex-1 overflow-auto">
        {loading && !result ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-body-md text-text-muted animate-pulse">
                {importingChar ? 'Importing character...' : 'Analyzing build...'}
              </span>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 px-6">
            <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-6 max-w-lg text-center">
              <p className="text-body-md text-red-400 mb-3">{error}</p>
              <button
                type="button"
                onClick={reset}
                className="text-label-sm text-text-muted hover:text-text-primary transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        ) : result ? (
          <div className="px-6 py-4 space-y-4 pb-8">
            <SaveBuildButton result={result} pobUrl={currentUrl} loading={loading} />
            <BuildSummaryCard build={result.import.buildSummary} modifierCount={result.import.modifierCount} />
            <StatOverview offense={result.analysis.offense} defense={result.analysis.defense} />
            <div className="grid grid-cols-2 gap-4">
              <DefensePanel defense={result.analysis.defense} />
              <DamagePanel offense={result.analysis.offense} />
            </div>
            <ProblemsPanel problems={result.analysis.problems} />
            <RecommendationsPanel recommendations={result.analysis.recommendations} />
            <AIExplanationPanel summary={result.explanation?.summary ?? null} />
            <PoeAccountPanel onImportCharacter={handleCharacterImport} isImporting={importingChar} />
            <HistoryPanel
              onSelect={handleHistorySelect}
              onCompare={handleCompare}
              selectedForCompare={selectedCompare}
            />
          </div>
        ) : (
          <div className="px-6 py-4 space-y-4">
            <CharacterPanel />
            <PoeAccountPanel onImportCharacter={handleCharacterImport} isImporting={importingChar} />
            <HistoryPanel
              onSelect={handleHistorySelect}
              onCompare={handleCompare}
              selectedForCompare={selectedCompare}
            />
          </div>
        )}
      </div>
    </div>
  );
}
