import { FetchHttpClient, type HttpClient } from '@helper/poe-data';
import type { ModDB, AIProvider } from '@helper/poe-engine';
import { createModDB } from '@helper/poe-engine';
import type { PoeAccountService } from './poe-account.service.js';
import type { PoeTradeService } from './poe-trade.service.js';
import type { PoeImportService } from './poe-import.service.js';
import type { PoeAnalysisService } from './poe-analysis.service.js';

export interface PoeRuntime {
  readonly httpClient: HttpClient;
  readonly modDb: ModDB;
  readonly account: PoeAccountService;
  readonly trade: PoeTradeService;
  readonly importService: PoeImportService;
  readonly analysis: PoeAnalysisService;
  aiProvider: AIProvider | null;
}

export interface PoeRuntimeOptions {
  aiConfig?: {
    type: 'openai' | 'anthropic' | 'openrouter' | 'lmstudio';
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
}
