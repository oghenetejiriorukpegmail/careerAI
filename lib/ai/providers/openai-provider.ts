import { BaseAIProvider, AIResponse, AIProviderConfig } from './base-provider';

export class OpenAIProvider extends BaseAIProvider {
  constructor(config: AIProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://api.openai.com/v1',
    });
  }
  
  async query(prompt: string, systemPrompt?: string, imageData?: string): Promise<AIResponse> {
    const messages = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    if (imageData) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}` } }
        ]
      });
    } else {
      messages.push({ role: 'user', content: prompt });
    }
    
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.config.model,
        messages,
        max_tokens: this.config.maxTokens || 4000,
        temperature: this.config.temperature || 0.7,
      }),
    });
    
    const data = await this.handleResponse(response);
    
    return {
      content: data.choices[0].message.content,
      model: data.model,
      usage: data.usage,
    };
  }
}