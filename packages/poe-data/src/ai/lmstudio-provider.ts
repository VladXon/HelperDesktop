import type { AIProvider } from '@helper/poe-engine';
import type { HttpClient } from '../http/http-client.js';
import { createOpenAIProvider } from './openai-provider.js';

export interface LMStudioProviderConfig {
  readonly baseUrl: string;
  readonly model?: string;
}

export function createLMStudioProvider(
  config: LMStudioProviderConfig,
  httpClient?: HttpClient,
): AIProvider {
  return createOpenAIProvider(
    {
      apiKey: 'lm-studio',
      model: config.model ?? 'local-model',
      baseUrl: config.baseUrl.replace(/\/+$/, ''),
    },
    httpClient,
  );
}
