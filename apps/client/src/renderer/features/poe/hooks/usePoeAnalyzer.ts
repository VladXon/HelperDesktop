import { useState, useCallback } from 'react';
import type { PoeAnalyzeResult } from '../types';
import * as api from '../api';

interface PoeAnalyzerState {
  loading: boolean;
  error: string | null;
  result: PoeAnalyzeResult | null;
}

export function usePoeAnalyzer(): PoeAnalyzerState & {
  analyze: (url: string) => Promise<void>;
  reset: () => void;
  setResult: (result: PoeAnalyzeResult) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
} {
  const [state, setState] = useState<PoeAnalyzerState>({ loading: false, error: null, result: null });

  const analyze = useCallback(async (url: string): Promise<void> => {
    setState({ loading: true, error: null, result: null });
    try {
      const result = await api.analyze(url);
      setState({ loading: false, error: null, result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setState({ loading: false, error: message, result: null });
    }
  }, []);

  const reset = useCallback((): void => {
    setState({ loading: false, error: null, result: null });
  }, []);

  const setResult = useCallback((result: PoeAnalyzeResult) => {
    setState({ loading: false, error: null, result });
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  return { ...state, analyze, reset, setResult, setError, setLoading };
}
