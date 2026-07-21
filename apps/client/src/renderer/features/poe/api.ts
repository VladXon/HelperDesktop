import type { PoeAnalyzeResult } from './types';

export async function importUrl(url: string): Promise<{ dto: unknown; modifierCount: number; buildSummary: { name: string; ascendancy: string; level: number } }> {
  return window.api.poe.importUrl(url) as Promise<{ dto: unknown; modifierCount: number; buildSummary: { name: string; ascendancy: string; level: number } }>;
}

export async function analyze(url: string): Promise<PoeAnalyzeResult> {
  return window.api.poe.analyze(url, true) as Promise<PoeAnalyzeResult>;
}
