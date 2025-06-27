export interface AIResponse {
  content: string;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface AIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export abstract class BaseAIProvider {
  protected config: AIProviderConfig;
  
  constructor(config: AIProviderConfig) {
    this.config = config;
  }
  
  abstract query(prompt: string, systemPrompt?: string, imageData?: string): Promise<AIResponse>;
  
  protected cleanJsonResponse(text: string): string {
    // Remove markdown code blocks
    text = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    
    // Try to find JSON content
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }
    
    // Try array format
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return arrayMatch[0];
    }
    
    return text.trim();
  }
  
  protected parseJsonResponse(text: string): any {
    const cleaned = this.cleanJsonResponse(text);
    
    try {
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      console.error('Cleaned text:', cleaned);
      
      // Try to fix common JSON errors
      let fixed = cleaned
        .replace(/,\s*}/g, '}') // Remove trailing commas
        .replace(/,\s*]/g, ']')
        .replace(/'/g, '"') // Replace single quotes with double quotes
        .replace(/(\w+):/g, '"$1":') // Quote unquoted keys
        .replace(/:\s*undefined/g, ': null') // Replace undefined with null
        .replace(/\\n/g, ' ') // Remove newlines in strings
        .replace(/\s+/g, ' '); // Normalize whitespace
      
      try {
        return JSON.parse(fixed);
      } catch (secondError) {
        console.error('Failed to parse fixed JSON:', secondError);
        throw new Error(`Invalid JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
  
  protected async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
    
    return response.json();
  }
  
  protected buildHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    
    return { ...headers, ...additionalHeaders };
  }
}