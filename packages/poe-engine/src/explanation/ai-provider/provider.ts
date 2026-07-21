export interface AIMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

export interface AIRequest {
  readonly messages: readonly AIMessage[];
  readonly temperature?: number;
  readonly maxTokens?: number;
}

export interface AIUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
}

export interface AIResponse {
  readonly content: string;
  readonly usage?: AIUsage;
  readonly model?: string;
}

export interface AIProvider {
  readonly name: string;
  complete(request: AIRequest): Promise<AIResponse>;
  stream?(request: AIRequest): AsyncIterable<string>;
}
