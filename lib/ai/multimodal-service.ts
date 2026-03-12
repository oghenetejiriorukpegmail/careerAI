import { createAIProvider, AIProviderType } from './providers';
import { AIResponse } from './providers/base-provider';

// Service specifically for multimodal (image) analysis
class MultimodalAIService {
  private provider: any = null;
  private currentModel: string = '';
  
  constructor() {
    // No default — model must come from settings or explicit setModel() call
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
    if (!this.provider || !this.currentModel) {
      throw new Error('No vision model configured. Set a vision model in Settings.');
    }
    
    console.log(`[MULTIMODAL AI] Using ${this.currentModel} via OpenRouter for image analysis`);
    const response = await this.provider.query(prompt, systemPrompt, imageData);
    return response;
  }
}

// Export singleton instance
export const multimodalAI = new MultimodalAIService();

// Helper function for job screenshot analysis with specific model
export async function analyzeJobScreenshotWithModel(screenshotData: string, modelId?: string): Promise<string> {
  // Always use the provided model, or fall back to user's configured vision model
  if (modelId) {
    multimodalAI.setModel(modelId);
  } else {
    // Load vision model from settings if no explicit model passed
    try {
      const { getSettings } = await import('@/lib/utils/settings');
      const settings = await getSettings();
      const visionModel = settings.visionModel || settings.aiModel;
      console.log(`[MULTIMODAL AI] Using vision model from settings: ${visionModel}`);
      multimodalAI.setModel(visionModel);
    } catch {
      throw new Error('No vision model configured. Set a vision model in Settings.');
    }
  }
  
  const systemPrompt = `You are an expert at extracting job posting information from screenshots. Analyze the provided screenshot and extract ONLY the information you can ACTUALLY SEE in the image.

STRICT RULES:
1. NEVER invent, fabricate, or infer responsibilities, qualifications, or requirements that are NOT visible in the screenshot.
2. If the job description body is not visible (e.g., blocked by a login wall, modal, or paywall), say "Job description not visible - blocked by [reason]" instead of making up content.
3. If you can only see partial information (title, company, salary, location), extract ONLY what's visible and explicitly note what's missing.
4. Do NOT generate generic job responsibilities based on the job title. Only list what you can READ in the image.
5. Distinguish between the ACTUAL job posting content and sidebar elements (similar jobs, recommended jobs, etc.) — only extract the main posting.

Extract these fields IF VISIBLE:
- Job title
- Company name (note if it's a recruiter vs actual employer)
- Location
- Job type (full-time, part-time, contract)
- Salary information
- Seniority level
- Industry
- Job description / overview
- Responsibilities (ONLY if actually listed in the posting)
- Required qualifications (ONLY if actually listed)
- Preferred qualifications (ONLY if actually listed)
- Benefits (ONLY if actually listed)
- How to apply

Format as clear, readable text with section headers. For any section where the content is NOT visible, write "[Not visible in screenshot]" rather than guessing.`;

  const userPrompt = `Extract ONLY the job posting information that is actually visible in this screenshot. Do NOT fabricate any responsibilities, qualifications, or details that you cannot directly read from the image. If the full job description is hidden behind a login wall, state that clearly.`;

  try {
    const response = await multimodalAI.analyzeImage(userPrompt, systemPrompt, screenshotData);
    return response.content;
  } catch (error) {
    console.error('[MULTIMODAL AI] Failed to analyze job screenshot:', error);
    throw new Error('Failed to analyze job screenshot');
  }
}

// Helper function for job screenshot analysis (uses settings model)
export async function analyzeJobScreenshot(screenshotData: string): Promise<string> {
  // No hardcoded default — always reads from settings
  return analyzeJobScreenshotWithModel(screenshotData);
}