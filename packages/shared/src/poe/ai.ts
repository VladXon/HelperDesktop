import type { Problem, UpgradeRecommendation, BuildSummary } from './analysis';
import type { MetaBuild } from './economy';

export interface AiCapabilities {
  supportsStreaming: boolean;
  supportsTools: boolean;
  contextWindow: number;
  supportsJson: boolean;
}

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiResponse {
  text: string;
  usage: { promptTokens: number; completionTokens: number };
  model: string;
}

export interface TestResult {
  success: boolean;
  latencyMs: number;
  model: string;
  error?: string;
}

export interface AiProviderConfig {
  id: 'deepseek' | 'openai' | 'claude' | 'local';
  name: string;
  requiresApiKey: boolean;
  defaultEndpoint: string;
  models: string[];
}

export interface AiBuildReviewInput {
  summary: BuildSummary;
  problems: Problem[];
  upgrades: UpgradeRecommendation[];
  keyStats: {
    dps: number;
    ehp: number;
    resistances: Record<string, number>;
  };
  metaContext?: { popularBuilds: MetaBuild[]; ascendancyTier: string };
  budgetTier: 'budget' | 'mid' | 'high' | 'mirror';
}

export interface AiReviewResult {
  text: string;
  provider: string;
  model: string;
  tokensUsed: number;
  mode: 'ai' | 'local-fallback';
}
