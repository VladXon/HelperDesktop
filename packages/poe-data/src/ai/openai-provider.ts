import type { AIProvider, AIRequest, AIResponse } from '@helper/poe-engine';
import { FetchHttpClient, type HttpClient } from '../http/http-client.js';

export interface OpenAIProviderConfig {
  readonly apiKey: string;
  readonly model?: string;
  readonly baseUrl?: string;
}

export function createOpenAIProvider(
  config: OpenAIProviderConfig,
  httpClient?: HttpClient,
): AIProvider {
  const client = httpClient ?? new FetchHttpClient();
  const baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
  const model = config.model ?? 'gpt-4o';

  return {
    name: `openai:${model}`,

    async complete(request: AIRequest): Promise<AIResponse> {
      const data = await client.post<{
        choices: { message: { content: string } }[];
        usage?: { prompt_tokens: number; completion_tokens: number };
        model?: string;
      }>(
        `${baseUrl}/chat/completions`,
        {
          model,
          messages: request.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 1024,
        },
        {
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
          },
        },
      );

      const choice = data.choices?.[0];

      return {
        content: choice?.message?.content ?? '',
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
            }
          : undefined,
        model: data.model,
      };
    },
  };
}
