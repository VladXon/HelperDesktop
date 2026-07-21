import type { AIProvider } from '@helper/poe-engine';
import type { HttpClient } from '../http/http-client.js';
import { createOpenAIProvider } from './openai-provider.js';

export interface OpenRouterProviderConfig {
  readonly apiKey: string;
  readonly model: string;
}

export function createOpenRouterProvider(
  config: OpenRouterProviderConfig,
  httpClient?: HttpClient,
): AIProvider {
  return createOpenAIProvider(
    {
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: 'https://openrouter.ai/api/v1',
    },
    httpClient,
  );
}
