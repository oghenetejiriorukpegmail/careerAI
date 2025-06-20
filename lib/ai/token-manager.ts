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
  // Claude models
  'claude-opus-4': { baseTokens: 4096, maxTokens: 200000, costPerKToken: 0.015, supportsLongContext: true },
  'claude-sonnet-4': { baseTokens: 4096, maxTokens: 200000, costPerKToken: 0.003, supportsLongContext: true },
  'claude-3-opus': { baseTokens: 4096, maxTokens: 200000, costPerKToken: 0.015, supportsLongContext: true },
  'claude-3-sonnet': { baseTokens: 4096, maxTokens: 200000, costPerKToken: 0.003, supportsLongContext: true },
  'claude-3-haiku': { baseTokens: 4096, maxTokens: 200000, costPerKToken: 0.00025, supportsLongContext: true },
  
  // GPT models
  'gpt-4': { baseTokens: 4096, maxTokens: 8192, costPerKToken: 0.03 },
  'gpt-4-turbo': { baseTokens: 4096, maxTokens: 128000, costPerKToken: 0.01, supportsLongContext: true },
  'gpt-4o': { baseTokens: 4096, maxTokens: 128000, costPerKToken: 0.005, supportsLongContext: true },
  'gpt-3.5-turbo': { baseTokens: 4096, maxTokens: 16384, costPerKToken: 0.0005 },
  
  // Gemini models
  'gemini-1.5-pro': { baseTokens: 8192, maxTokens: 1048576, costPerKToken: 0.00125, supportsLongContext: true },
  'gemini-1.5-flash': { baseTokens: 8192, maxTokens: 1048576, costPerKToken: 0.00025, supportsLongContext: true },
  
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
  // Normalize model name
  const normalizedModel = modelName.toLowerCase().replace(/[^a-z0-9-]/g, '');
  
  // Find matching config
  let config: TokenConfig = MODEL_TOKEN_CONFIGS.default;
  for (const [key, value] of Object.entries(MODEL_TOKEN_CONFIGS)) {
    if (normalizedModel.includes(key.toLowerCase())) {
      config = value;
      break;
    }
  }
  
  // If bypassing limits, return maximum tokens for the model
  if (bypassLimits) {
    console.log(`[TOKEN MANAGER] Bypassing token limits - using maximum tokens: ${config.maxTokens}`);
    return config.maxTokens;
  }
  
  // If user has set a preference, use it (within model limits)
  if (userPreference && userPreference > 0) {
    return Math.min(userPreference, config.maxTokens);
  }
  
  // Calculate based on input length
  // Rough estimate: 1 token ≈ 4 characters
  const estimatedInputTokens = Math.ceil(inputLength / 4);
  
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
  const normalizedModel = modelName.toLowerCase().replace(/[^a-z0-9-]/g, '');
  
  for (const [key, config] of Object.entries(MODEL_TOKEN_CONFIGS)) {
    if (normalizedModel.includes(key.toLowerCase()) && config.costPerKToken) {
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
  const normalizedModel = modelName.toLowerCase().replace(/[^a-z0-9-]/g, '');
  
  for (const [key, value] of Object.entries(MODEL_TOKEN_CONFIGS)) {
    if (normalizedModel.includes(key.toLowerCase())) {
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