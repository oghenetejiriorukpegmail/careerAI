import { supabase } from '@/lib/supabase/client';

export interface DeleteJobDescriptionResult {
  success: boolean;
  error?: string;
}

/**
 * Delete a job description and all associated data
 * @param jobId The ID of the job description to delete
 * @returns Result of the deletion operation
 */
export async function deleteJobDescription(jobId: string): Promise<DeleteJobDescriptionResult> {
  try {
    const response = await fetch(`/api/job-descriptions/${jobId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || error.message || 'Failed to delete job description',
      };
    }
    
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting job description:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get all job descriptions for the current user
 */
export async function getUserJobDescriptions() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const { data, error } = await supabase
    .from('job_descriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw error;
  }
  
  return data || [];
}