import type { AIProvider, AIRequest, AIResponse } from '@helper/poe-engine';
import { FetchHttpClient, type HttpClient } from '../http/http-client.js';

export interface AnthropicProviderConfig {
  readonly apiKey: string;
  readonly model?: string;
}

export function createAnthropicProvider(
  config: AnthropicProviderConfig,
  httpClient?: HttpClient,
): AIProvider {
  const client = httpClient ?? new FetchHttpClient();
  const model = config.model ?? 'claude-3-5-sonnet-20241022';

  return {
    name: `anthropic:${model}`,

    async complete(request: AIRequest): Promise<AIResponse> {
      const systemMessage = request.messages.find((m) => m.role === 'system');
      const chatMessages = request.messages.filter((m) => m.role !== 'system');

      const body: Record<string, unknown> = {
        model,
        max_tokens: request.maxTokens ?? 1024,
        messages: chatMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };

      if (systemMessage) {
        body.system = systemMessage.content;
      }

      if (request.temperature !== undefined) {
        body.temperature = request.temperature;
      }

      const data = await client.post<{
        content: { type: string; text: string }[];
        usage?: { input_tokens: number; output_tokens: number };
        model?: string;
      }>(
        'https://api.anthropic.com/v1/messages',
        body,
        {
          headers: {
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
          },
        },
      );

      const textContent = data.content
        ?.filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('') ?? '';

      return {
        content: textContent,
        usage: data.usage
          ? {
              promptTokens: data.usage.input_tokens,
              completionTokens: data.usage.output_tokens,
            }
          : undefined,
        model: data.model,
      };
    },
  };
}
