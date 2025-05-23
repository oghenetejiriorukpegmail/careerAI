import { BaseAIProvider, AIResponse, AIProviderConfig } from './base-provider';

export class GeminiProvider extends BaseAIProvider {
  constructor(config: AIProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta',
    });
  }
  
  async query(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
    
    const response = await fetch(
      `${this.config.baseUrl}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }],
          generationConfig: {
            temperature: this.config.temperature || 0.7,
            maxOutputTokens: this.config.maxTokens || 4000,
          },
        }),
      }
    );
    
    const data = await this.handleResponse(response);
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const usage = data.usageMetadata;
    
    return {
      content,
      model: this.config.model,
      usage: usage ? {
        prompt_tokens: usage.promptTokenCount,
        completion_tokens: usage.candidatesTokenCount,
        total_tokens: usage.totalTokenCount,
      } : undefined,
    };
  }
}