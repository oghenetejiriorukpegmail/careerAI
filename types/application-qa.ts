export interface ApplicationQARequest {
  question: string;
  jobDescriptionId: string;
  resumeId?: string;
  coverLetterId?: string;
}

export interface ApplicationQAResponse {
  answer: string;
  confidenceScore: number;
  keyPointsUsed: string[];
  suggestedFollowUp?: string;
}

export interface ApplicationQAHistoryItem {
  id: string;
  user_id: string;
  job_description_id: string;
  resume_id: string | null;
  cover_letter_id: string | null;
  question: string;
  answer: string;
  confidence_score: number;
  metadata: {
    keyPointsUsed?: string[];
    suggestedFollowUp?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ApplicationQAApiResponse {
  success: boolean;
  response?: ApplicationQAResponse;
  error?: string;
  details?: string;
}

export interface ApplicationQAHistoryApiResponse {
  success: boolean;
  history?: ApplicationQAHistoryItem[];
  error?: string;
  details?: string;
}