import { BaseAIProvider, AIProviderConfig } from './base-provider';
import { OpenAIProvider } from './openai-provider';
import { GeminiProvider } from './gemini-provider';
import { OpenRouterProvider } from './openrouter-provider';

export type AIProviderType = 'openai' | 'gemini' | 'openrouter' | 'requesty';

export function createAIProvider(type: AIProviderType, config: AIProviderConfig): BaseAIProvider {
  switch (type) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'gemini':
      return new GeminiProvider(config);
    case 'openrouter':
      return new OpenRouterProvider(config);
    case 'requesty':
      // Requesty uses OpenAI-compatible API
      return new OpenAIProvider({
        ...config,
        baseUrl: 'https://api.requesty.ai/v1',
      });
    default:
      throw new Error(`Unsupported AI provider: ${type}`);
  }
}

export { BaseAIProvider } from './base-provider';
export type { AIResponse, AIProviderConfig } from './base-provider';