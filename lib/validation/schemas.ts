import { z } from 'zod';

// File upload schemas
export const fileUploadSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().max(10 * 1024 * 1024), // 10MB max
  type: z.enum(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
});

// Resume parsing schemas
export const parseResumeSchema = z.object({
  content: z.string().min(1).max(500000), // ~500KB text max
  filename: z.string().optional(),
});

// Job description schemas
export const jobDescriptionSchema = z.object({
  url: z.string().url().optional(),
  text: z.string().min(10).max(50000).optional(),
}).refine(data => data.url || data.text, {
  message: "Either URL or text must be provided",
});

// Settings schemas
export const settingsSchema = z.object({
  personal_info: z.object({
    full_name: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().min(5).max(20),
    location: z.string().max(100),
    linkedin_url: z.string().url().optional().nullable(),
    portfolio_url: z.string().url().optional().nullable(),
  }),
  preferences: z.object({
    job_titles: z.array(z.string().min(1).max(100)).max(10),
    locations: z.array(z.string().min(1).max(100)).max(10),
    job_types: z.array(z.enum(['full-time', 'part-time', 'contract', 'internship', 'remote'])),
    salary_min: z.number().min(0).max(1000000).optional().nullable(),
    salary_max: z.number().min(0).max(1000000).optional().nullable(),
  }),
  ai_settings: z.object({
    tone: z.enum(['professional', 'casual', 'enthusiastic']),
    focus_areas: z.array(z.string().min(1).max(50)).max(5),
    avoid_phrases: z.array(z.string().min(1).max(100)).max(10),
  }),
});

// Application schemas
export const applicationSchema = z.object({
  job_id: z.string().uuid(),
  resume_version: z.string().uuid().optional(),
  cover_letter: z.string().max(5000).optional(),
  status: z.enum(['applied', 'interviewing', 'offered', 'rejected', 'withdrawn']),
  notes: z.string().max(1000).optional(),
});

// Document generation schemas
export const generateResumeSchema = z.object({
  job_description: z.string().min(10).max(50000),
  user_profile: z.any(), // Will be validated separately
  format: z.enum(['pdf', 'docx']).optional(),
});

export const generateCoverLetterSchema = z.object({
  job_description: z.string().min(10).max(50000),
  company_info: z.object({
    name: z.string().min(1).max(100),
    hiring_manager: z.string().max(100).optional(),
  }),
  user_profile: z.any(), // Will be validated separately
});

// Helper function to validate and sanitize input
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

// Helper function for safe validation with error handling
export function safeValidateInput<T>(schema: z.ZodSchema<T>, data: unknown): 
  { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
    }
    return { success: false, error: 'Invalid input' };
  }
}