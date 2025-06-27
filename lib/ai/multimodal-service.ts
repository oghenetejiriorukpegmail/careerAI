import { createAIProvider, AIProviderType } from './providers';
import { AIResponse } from './providers/base-provider';

// Service specifically for multimodal (image) analysis
class MultimodalAIService {
  private provider: any = null;
  private currentModel: string = 'google/gemini-2.0-flash-exp:free';
  
  constructor() {
    // Initialize with default model
    this.initializeProvider(this.currentModel);
  }
  
  private initializeProvider(modelId: string) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('No OpenRouter API key found for multimodal analysis');
    }
    
    this.currentModel = modelId;
    this.provider = createAIProvider('openrouter' as AIProviderType, {
      apiKey,
      model: modelId,
      temperature: 0.7,
      maxTokens: 4000,
    });
  }
  
  setModel(modelId: string) {
    if (modelId !== this.currentModel) {
      console.log(`[MULTIMODAL AI] Switching model from ${this.currentModel} to ${modelId}`);
      this.initializeProvider(modelId);
    }
  }
  
  async analyzeImage(prompt: string, systemPrompt: string, imageData: string): Promise<AIResponse> {
    try {
      console.log(`[MULTIMODAL AI] Using ${this.currentModel} via OpenRouter for image analysis`);
      const response = await this.provider.query(prompt, systemPrompt, imageData);
      return response;
    } catch (error) {
      console.error('[MULTIMODAL AI] Image analysis error:', error);
      
      // Try fallback model if the primary fails
      if (this.provider) {
        try {
          console.log('[MULTIMODAL AI] Trying fallback model...');
          // Reconfigure for a different model
          this.provider = createAIProvider('openrouter' as AIProviderType, {
            apiKey: process.env.OPENROUTER_API_KEY!,
            model: 'anthropic/claude-3-haiku:beta', // Fallback to Claude Haiku
            temperature: 0.7,
            maxTokens: 4000,
          });
          
          const response = await this.provider.query(prompt, systemPrompt, imageData);
          return response;
        } catch (fallbackError) {
          console.error('[MULTIMODAL AI] Fallback also failed:', fallbackError);
        }
      }
      
      throw error;
    }
  }
}

// Export singleton instance
export const multimodalAI = new MultimodalAIService();

// Helper function for job screenshot analysis with specific model
export async function analyzeJobScreenshotWithModel(screenshotData: string, modelId?: string): Promise<string> {
  if (modelId) {
    multimodalAI.setModel(modelId);
  }
  
  const systemPrompt = `You are an expert at extracting job posting information from screenshots. Analyze the provided screenshot and extract all job-related information you can see.

Extract the following information if visible:
- Job title
- Company name
- Location
- Job type (full-time, part-time, contract, etc.)
- Salary information
- Job description
- Required qualifications
- Responsibilities
- Benefits
- How to apply
- Any other relevant job details

Format the extracted information as clear, readable text that can be parsed later. Include section headers for different parts of the job posting.

BE ACCURATE: Only extract information that is actually visible in the screenshot. Do not make up or infer information that isn't shown.`;

  const userPrompt = `Please extract all job posting information from this screenshot. Focus on being accurate and comprehensive.`;

  try {
    const response = await multimodalAI.analyzeImage(userPrompt, systemPrompt, screenshotData);
    return response.content;
  } catch (error) {
    console.error('[MULTIMODAL AI] Failed to analyze job screenshot:', error);
    throw new Error('Failed to analyze job screenshot');
  }
}

// Helper function for job screenshot analysis (uses default model)
export async function analyzeJobScreenshot(screenshotData: string): Promise<string> {
  return analyzeJobScreenshotWithModel(screenshotData);
}