/**
 * Token management utilities for AI model interactions
 * Provides dynamic token sizing and use-case specific limits
 */

export interface TokenConfig {
  baseTokens: number;
  maxTokens: number;
  costPerKToken?: number; // Cost per 1000 tokens in USD
  supportsLongContext?: boolean;
}

// Model-specific token configurations
export const MODEL_TOKEN_CONFIGS: Record<string, TokenConfig> = {
  // Latest 2025 Models - Premium
  'openai/gpt-5.2': { baseTokens: 8192, maxTokens: 256000, costPerKToken: 1.5, supportsLongContext: true },
  'openai/gpt-5.2-pro': { baseTokens: 8192, maxTokens: 512000, costPerKToken: 2.0, supportsLongContext: true },
  'openai/gpt-5': { baseTokens: 8192, maxTokens: 256000, costPerKToken: 1.25, supportsLongContext: true },
  'openai/gpt-5.1': { baseTokens: 8192, maxTokens: 256000, costPerKToken: 1.35, supportsLongContext: true },
  'openai/gpt-5-mini': { baseTokens: 4096, maxTokens: 128000, costPerKToken: 0.5, supportsLongContext: true },
  'openai/gpt-5-nano': { baseTokens: 4096, maxTokens: 64000, costPerKToken: 0.1, supportsLongContext: true },
  'anthropic/claude-opus-4.5': { baseTokens: 8192, maxTokens: 200000, costPerKToken: 5, supportsLongContext: true },
  'anthropic/claude-sonnet-4.5': { baseTokens: 8192, maxTokens: 200000, costPerKToken: 3, supportsLongContext: true },
  'anthropic/claude-haiku-4.5': { baseTokens: 8192, maxTokens: 200000, costPerKToken: 0.8, supportsLongContext: true },
  'anthropic/claude-opus-4.1': { baseTokens: 8192, maxTokens: 200000, costPerKToken: 15, supportsLongContext: true },
  'moonshotai/kimi-k2': { baseTokens: 8192, maxTokens: 128000, costPerKToken: 2.5, supportsLongContext: true },
  'meta/llama-4-maverick': { baseTokens: 8192, maxTokens: 256000, costPerKToken: 5.0, supportsLongContext: true },
  'meta/llama-4-scout': { baseTokens: 8192, maxTokens: 512000, costPerKToken: 3.0, supportsLongContext: true },

  // Latest 2025 Models - Cost Effective
  'qwen/qwen3-30b-a3b-instruct-2507': { baseTokens: 8192, maxTokens: 1000000, costPerKToken: 1.0, supportsLongContext: true },
  'z-ai/glm-4.7': { baseTokens: 8192, maxTokens: 200000, costPerKToken: 0.28, supportsLongContext: true },
  'z-ai/glm-4.7-air': { baseTokens: 4096, maxTokens: 96000, costPerKToken: 0.15, supportsLongContext: true },

  // Latest 2025 Models - Free Tier
  'openai/gpt-oss-120b:free': { baseTokens: 4096, maxTokens: 32000, costPerKToken: 0, supportsLongContext: false },
  'openai/gpt-oss-20b:free': { baseTokens: 4096, maxTokens: 32000, costPerKToken: 0, supportsLongContext: false },
  'moonshotai/kimi-k2:free': { baseTokens: 4096, maxTokens: 60000, costPerKToken: 0, supportsLongContext: true },
  'z-ai/glm-4.7:free': { baseTokens: 8192, maxTokens: 128000, costPerKToken: 0, supportsLongContext: true },
  'deepseek/deepseek-r1-zero:free': { baseTokens: 4096, maxTokens: 64000, costPerKToken: 0, supportsLongContext: true },
  'qwen/qwen3-30b-a3b-instruct-2507:free': { baseTokens: 4096, maxTokens: 256000, costPerKToken: 0, supportsLongContext: true },
  
  // Claude models (including OpenRouter format)
  'claude-opus-4.5': { baseTokens: 8192, maxTokens: 200000, costPerKToken: 5, supportsLongContext: true },
  'claude-sonnet-4.5': { baseTokens: 8192, maxTokens: 200000, costPerKToken: 3, supportsLongContext: true },
  'claude-haiku-4.5': { baseTokens: 8192, maxTokens: 200000, costPerKToken: 0.8, supportsLongContext: true },
  'claude-opus-4.1': { baseTokens: 8192, maxTokens: 200000, costPerKToken: 15, supportsLongContext: true },
  'claude-sonnet-4': { baseTokens: 4096, maxTokens: 200000, costPerKToken: 3, supportsLongContext: true },
  'anthropic/claude-sonnet-4': { baseTokens: 4096, maxTokens: 200000, costPerKToken: 3, supportsLongContext: true },
  'claude-3-opus': { baseTokens: 4096, maxTokens: 200000, costPerKToken: 15, supportsLongContext: true },
  'claude-3-sonnet': { baseTokens: 4096, maxTokens: 200000, costPerKToken: 3, supportsLongContext: true },
  'claude-3-haiku': { baseTokens: 4096, maxTokens: 200000, costPerKToken: 0.25, supportsLongContext: true },
  
  // GPT models
  'gpt-5.2': { baseTokens: 8192, maxTokens: 256000, costPerKToken: 1.5, supportsLongContext: true },
  'gpt-5.2-pro': { baseTokens: 8192, maxTokens: 512000, costPerKToken: 2.0, supportsLongContext: true },
  'gpt-5': { baseTokens: 8192, maxTokens: 256000, costPerKToken: 1.25, supportsLongContext: true },
  'gpt-5.1': { baseTokens: 8192, maxTokens: 256000, costPerKToken: 1.35, supportsLongContext: true },
  'gpt-5-mini': { baseTokens: 4096, maxTokens: 128000, costPerKToken: 0.5, supportsLongContext: true },
  'gpt-4o': { baseTokens: 4096, maxTokens: 128000, costPerKToken: 5, supportsLongContext: true },
  'gpt-4-turbo': { baseTokens: 4096, maxTokens: 128000, costPerKToken: 10, supportsLongContext: true },
  'gpt-4': { baseTokens: 4096, maxTokens: 8192, costPerKToken: 30 },

  // Gemini models (OpenRouter format)
  'google/gemini-3-preview': { baseTokens: 8192, maxTokens: 2097152, costPerKToken: 1.5, supportsLongContext: true },
  'google/gemini-3-flash-preview': { baseTokens: 8192, maxTokens: 2097152, costPerKToken: 0.3, supportsLongContext: true },

  // Gemini models (Direct API format)
  'models/gemini-3-preview': { baseTokens: 8192, maxTokens: 2097152, costPerKToken: 1.5, supportsLongContext: true },
  'models/gemini-3-flash-preview': { baseTokens: 8192, maxTokens: 2097152, costPerKToken: 0.3, supportsLongContext: true },

  // Gemini models (short format for fallback matching)
  'gemini-3-preview': { baseTokens: 8192, maxTokens: 2097152, costPerKToken: 1.5, supportsLongContext: true },
  'gemini-3-flash-preview': { baseTokens: 8192, maxTokens: 2097152, costPerKToken: 0.3, supportsLongContext: true },
  'gemini-3': { baseTokens: 8192, maxTokens: 2097152, costPerKToken: 1.5, supportsLongContext: true },
  'gemini-3-flash': { baseTokens: 8192, maxTokens: 2097152, costPerKToken: 0.3, supportsLongContext: true },
  'gemini-2.5-pro': { baseTokens: 8192, maxTokens: 1048576, costPerKToken: 1.25, supportsLongContext: true },
  'gemini-2.5-flash': { baseTokens: 8192, maxTokens: 1048576, costPerKToken: 0.25, supportsLongContext: true },
  'gemini-1.5-pro': { baseTokens: 8192, maxTokens: 1048576, costPerKToken: 1.25, supportsLongContext: true },
  'gemini-1.5-flash': { baseTokens: 8192, maxTokens: 1048576, costPerKToken: 0.25, supportsLongContext: true },

  // Gemini models (Vertex AI format)
  'vertex/gemini-3-preview@us-east5': { baseTokens: 8192, maxTokens: 2097152, costPerKToken: 1.5, supportsLongContext: true },

  // Claude models (Vertex AI format)
  'vertex/anthropic/claude-opus-4.5@us-east5': { baseTokens: 8192, maxTokens: 200000, costPerKToken: 5, supportsLongContext: true },
  'vertex/anthropic/claude-sonnet-4.5@us-east5': { baseTokens: 8192, maxTokens: 200000, costPerKToken: 3, supportsLongContext: true },
  'vertex/anthropic/claude-haiku-4.5@us-east5': { baseTokens: 8192, maxTokens: 200000, costPerKToken: 0.8, supportsLongContext: true },

  // X.AI models
  'x-ai/grok-4': { baseTokens: 4096, maxTokens: 256000, costPerKToken: 5, supportsLongContext: true },
  'x-ai/grok-4-fast': { baseTokens: 8192, maxTokens: 2000000, costPerKToken: 2.5, supportsLongContext: true },
  'x-ai/grok-4-fast:free': { baseTokens: 8192, maxTokens: 2000000, costPerKToken: 0, supportsLongContext: true },
  'x-ai/grok-4.1-fast': { baseTokens: 8192, maxTokens: 2000000, costPerKToken: 0, supportsLongContext: true },
  'x-ai/grok-code-fast-1': { baseTokens: 4096, maxTokens: 256000, costPerKToken: 2.5, supportsLongContext: true },

  // Vision-specific model aliases (for compatibility)
  'openai/gpt-4o': { baseTokens: 4096, maxTokens: 128000, costPerKToken: 5, supportsLongContext: true },
  'google/gemini-2.0-flash-exp:free': { baseTokens: 8192, maxTokens: 1048576, costPerKToken: 0, supportsLongContext: true },

  // Legacy for compatibility
  'qwen/qwen3-235b-a22b:free': { baseTokens: 4096, maxTokens: 32000, costPerKToken: 0, supportsLongContext: false },
  
  // Default for unknown models
  'default': { baseTokens: 4096, maxTokens: 32000 }
};

// Use case specific multipliers
export const USE_CASE_MULTIPLIERS: Record<string, number> = {
  'resume_parsing': 2.5,      // Resumes need detailed extraction
  'resumeParsing': 2.5,       // Alternative key format
  'cover_letter': 1.5,        // Cover letters are shorter
  'coverLetter': 1.5,         // Alternative key format  
  'job_matching': 1.2,        // Job matching needs less detail
  'jobMatching': 1.2,         // Alternative key format
  'document_summary': 0.8,    // Summaries should be concise
  'profile_optimization': 1.8, // Profile optimization needs comprehensive output
  'application_qa': 1.3,      // Q&A responses should be moderate length
  'suggested_questions': 0.5, // Suggested questions list is short
  'general': 1.0,             // General operations
  'default': 1.0
};

/**
 * Calculate optimal token limit based on input and use case
 */
export function calculateOptimalTokens(
  modelName: string,
  inputLength: number,
  useCase: string = 'default',
  userPreference?: number,
  bypassLimits: boolean = false
): number {
  // Find matching config - check exact match first, then substring match
  let config: TokenConfig = MODEL_TOKEN_CONFIGS.default;
  
  // Check for exact match first (handles OpenRouter format like "anthropic/claude-sonnet-4")
  if (MODEL_TOKEN_CONFIGS[modelName]) {
    config = MODEL_TOKEN_CONFIGS[modelName];
  } else {
    // Fallback to substring matching
    const normalizedModel = modelName.toLowerCase().replace(/[^a-z0-9-\/]/g, '');
    for (const [key, value] of Object.entries(MODEL_TOKEN_CONFIGS)) {
      if (normalizedModel.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedModel)) {
        config = value;
        break;
      }
    }
  }
  
  // If bypassing limits, calculate available output tokens for high-capacity model
  if (bypassLimits) {
    // Use more accurate token estimation (Claude tokenizer is closer to 3.5 chars per token)
    const estimatedInputTokens = Math.ceil(inputLength / 3.5);
    const bufferTokens = 2000; // Larger buffer to account for estimation errors
    const availableOutputTokens = Math.max(config.maxTokens - estimatedInputTokens - bufferTokens, config.baseTokens);
    
    console.log(`[TOKEN MANAGER] Using high-capacity model - available output tokens: ${availableOutputTokens}`);
    console.log(`[TOKEN MANAGER] Input: ${estimatedInputTokens} tokens, Buffer: ${bufferTokens}, Available: ${availableOutputTokens}/${config.maxTokens}`);
    
    return availableOutputTokens;
  }
  
  // If user has set a preference, use it (within model limits)
  if (userPreference && userPreference > 0) {
    return Math.min(userPreference, config.maxTokens);
  }
  
  // Calculate based on input length
  // More accurate estimate: 1 token ≈ 3.5 characters for Claude models
  const estimatedInputTokens = Math.ceil(inputLength / 3.5);
  
  // For resume parsing, output is typically 1.5-2x the input
  const outputMultiplier = USE_CASE_MULTIPLIERS[useCase] || USE_CASE_MULTIPLIERS.default;
  
  // Calculate desired output tokens
  let desiredTokens = Math.ceil(estimatedInputTokens * outputMultiplier);
  
  // Apply minimum and maximum bounds
  desiredTokens = Math.max(config.baseTokens, desiredTokens);
  desiredTokens = Math.min(config.maxTokens, desiredTokens);
  
  // For long-context models, be more generous with tokens
  if (config.supportsLongContext && desiredTokens < config.maxTokens * 0.5) {
    desiredTokens = Math.min(desiredTokens * 1.5, config.maxTokens);
  }
  
  return Math.ceil(desiredTokens);
}

/**
 * Estimate cost for a given token usage
 */
export function estimateCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number | null {
  // Check for exact match first
  if (MODEL_TOKEN_CONFIGS[modelName] && MODEL_TOKEN_CONFIGS[modelName].costPerKToken) {
    const totalTokens = inputTokens + outputTokens;
    return (totalTokens / 1000) * MODEL_TOKEN_CONFIGS[modelName].costPerKToken!;
  }
  
  // Fallback to substring matching
  const normalizedModel = modelName.toLowerCase().replace(/[^a-z0-9-\/]/g, '');
  for (const [key, config] of Object.entries(MODEL_TOKEN_CONFIGS)) {
    if ((normalizedModel.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedModel)) && config.costPerKToken) {
      const totalTokens = inputTokens + outputTokens;
      return (totalTokens / 1000) * config.costPerKToken;
    }
  }
  
  return null;
}

/**
 * Get token configuration for a model
 */
export function getModelTokenConfig(modelName: string): TokenConfig {
  // Check for exact match first (handles OpenRouter format like "anthropic/claude-sonnet-4")
  if (MODEL_TOKEN_CONFIGS[modelName]) {
    return MODEL_TOKEN_CONFIGS[modelName];
  }
  
  // Fallback to substring matching
  const normalizedModel = modelName.toLowerCase().replace(/[^a-z0-9-\/]/g, '');
  for (const [key, value] of Object.entries(MODEL_TOKEN_CONFIGS)) {
    if (normalizedModel.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedModel)) {
      return value;
    }
  }
  
  return MODEL_TOKEN_CONFIGS.default;
}

/**
 * Check if a model supports long context
 */
export function supportsLongContext(modelName: string): boolean {
  const config = getModelTokenConfig(modelName);
  return config.supportsLongContext || false;
}