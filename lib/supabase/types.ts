export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          phone: string | null
          location: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      qa_conversations: {
        Row: {
          id: string
          user_id: string
          job_description_id: string | null
          job_application_id: string | null
          title: string | null
          context: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          job_description_id?: string | null
          job_application_id?: string | null
          title?: string | null
          context?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          job_description_id?: string | null
          job_application_id?: string | null
          title?: string | null
          context?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      qa_messages: {
        Row: {
          id: string
          conversation_id: string
          role: string
          content: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: string
          content: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: string
          content?: string
          metadata?: Json
          created_at?: string
        }
      }
      job_descriptions: {
        Row: {
          id: string
          user_id: string
          job_title: string | null
          company_name: string | null
          location: string | null
          description: string
          url: string | null
          input_method: string
          employment_type: string | null
          salary_range: string | null
          posted_date: string | null
          application_deadline: string | null
          processing_status: string
          ai_provider: string | null
          ai_model: string | null
          match_score: number | null
          created_at: string
          updated_at: string
          parsed_data: Json | null
          raw_content: string | null
        }
        Insert: {
          id?: string
          user_id: string
          job_title?: string | null
          company_name?: string | null
          location?: string | null
          description: string
          url?: string | null
          input_method?: string
          employment_type?: string | null
          salary_range?: string | null
          posted_date?: string | null
          application_deadline?: string | null
          processing_status?: string
          ai_provider?: string | null
          ai_model?: string | null
          match_score?: number | null
          created_at?: string
          updated_at?: string
          parsed_data?: Json | null
          raw_content?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          job_title?: string | null
          company_name?: string | null
          location?: string | null
          description?: string
          url?: string | null
          input_method?: string
          employment_type?: string | null
          salary_range?: string | null
          posted_date?: string | null
          application_deadline?: string | null
          processing_status?: string
          ai_provider?: string | null
          ai_model?: string | null
          match_score?: number | null
          created_at?: string
          updated_at?: string
          parsed_data?: Json | null
          raw_content?: string | null
        }
      }
      job_applications: {
        Row: {
          id: string
          user_id: string
          job_match_id: string | null
          job_description_id: string | null
          resume_id: string | null
          cover_letter_id: string | null
          status: string
          applied_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          job_match_id?: string | null
          job_description_id?: string | null
          resume_id?: string | null
          cover_letter_id?: string | null
          status?: string
          applied_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          job_match_id?: string | null
          job_description_id?: string | null
          resume_id?: string | null
          cover_letter_id?: string | null
          status?: string
          applied_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}