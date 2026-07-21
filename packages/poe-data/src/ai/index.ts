export type { AIProvider, AIRequest, AIResponse, AIMessage, AIUsage } from '@helper/poe-engine';

export type AIProviderConfig =
  | ({ readonly type: 'openai' } & OpenAIProviderConfig)
  | ({ readonly type: 'anthropic' } & AnthropicProviderConfig)
  | ({ readonly type: 'openrouter' } & OpenRouterProviderConfig)
  | ({ readonly type: 'lmstudio' } & LMStudioProviderConfig);

import type { AIProvider } from '@helper/poe-engine';
import type { HttpClient } from '../http/http-client.js';
import { createOpenAIProvider, type OpenAIProviderConfig } from './openai-provider.js';
import { createAnthropicProvider, type AnthropicProviderConfig } from './anthropic-provider.js';
import { createOpenRouterProvider, type OpenRouterProviderConfig } from './openrouter-provider.js';
import { createLMStudioProvider, type LMStudioProviderConfig } from './lmstudio-provider.js';

export function createAIProvider(
  config: AIProviderConfig,
  httpClient?: HttpClient,
): AIProvider {
  switch (config.type) {
    case 'openai':
      return createOpenAIProvider(config, httpClient);
    case 'anthropic':
      return createAnthropicProvider(config, httpClient);
    case 'openrouter':
      return createOpenRouterProvider(config, httpClient);
    case 'lmstudio':
      return createLMStudioProvider(config, httpClient);
  }
}

export { createOpenAIProvider } from './openai-provider.js';
export type { OpenAIProviderConfig } from './openai-provider.js';

export { createAnthropicProvider } from './anthropic-provider.js';
export type { AnthropicProviderConfig } from './anthropic-provider.js';

export { createOpenRouterProvider } from './openrouter-provider.js';
export type { OpenRouterProviderConfig } from './openrouter-provider.js';

export { createLMStudioProvider } from './lmstudio-provider.js';
export type { LMStudioProviderConfig } from './lmstudio-provider.js';
