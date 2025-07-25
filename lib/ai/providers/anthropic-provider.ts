import { BaseAIProvider, AIResponse, AIProviderConfig } from './base-provider';

export class AnthropicProvider extends BaseAIProvider {
  constructor(config: AIProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://api.anthropic.com',
    });
  }
  
  async query(prompt: string, systemPrompt?: string, imageData?: string): Promise<AIResponse> {
    const messages = [];
    
    // Handle multimodal input for Claude models that support it
    if (imageData) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: imageData.replace(/^data:image\/[^;]+;base64,/, '')
            }
          }
        ]
      });
    } else {
      messages.push({ 
        role: 'user', 
        content: prompt 
      });
    }
    
    const requestBody: any = {
      model: this.config.model || 'claude-sonnet-4',
      max_tokens: this.config.maxTokens || 4000,
      temperature: this.config.temperature || 0.7,
      messages
    };
    
    // Add system prompt if provided
    if (systemPrompt) {
      requestBody.system = systemPrompt;
    }
    
    const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: this.buildHeaders({
        'anthropic-version': '2023-06-01',
      }),
      body: JSON.stringify(requestBody),
    });
    
    const data = await this.handleResponse(response);
    
    // Extract content from Anthropic's response format
    let content = '';
    if (data.content && Array.isArray(data.content)) {
      content = data.content.map((item: any) => item.text || '').join('');
    } else if (data.content && typeof data.content === 'string') {
      content = data.content;
    }
    
    return {
      content,
      model: data.model || this.config.model,
      usage: data.usage ? {
        prompt_tokens: data.usage.input_tokens || 0,
        completion_tokens: data.usage.output_tokens || 0,
        total_tokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0)
      } : undefined,
    };
  }
}