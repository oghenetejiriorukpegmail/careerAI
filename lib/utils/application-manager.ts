import { getSupabaseAdminClient } from '@/lib/supabase/client';

export interface CreateApplicationParams {
  userId: string;
  sessionId?: string;
  jobDescriptionId: string;
  resumeId?: string;
  coverLetterId?: string;
  status?: 'to_apply' | 'applied' | 'interviewing' | 'offered' | 'rejected';
  notes?: string;
}

export interface UpdateApplicationParams {
  applicationId: string;
  userId: string;
  sessionId?: string;
  status?: string;
  notes?: string;
  applied_date?: string;
}

/**
 * Creates or updates a job application automatically
 * Used when documents are generated to ensure application tracking
 */
export async function createOrUpdateApplication(params: CreateApplicationParams) {
  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      throw new Error('Database connection not available');
    }

    const userIdentifier = params.userId || params.sessionId;
    if (!userIdentifier) {
      throw new Error('User ID or Session ID is required');
    }

    // Check if application already exists for this job
    const { data: existingApp, error: checkError } = await supabase
      .from('job_applications')
      .select('id, status, applied_date, resume_id, cover_letter_id')
      .eq('user_id', userIdentifier)
      .eq('job_description_id', params.jobDescriptionId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error checking existing application:', checkError);
      throw new Error('Failed to check existing application');
    }

    if (existingApp) {
      // Update existing application with new document IDs
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Only update fields that are provided and different
      if (params.resumeId && params.resumeId !== existingApp.resume_id) {
        updateData.resume_id = params.resumeId;
      }
      if (params.coverLetterId && params.coverLetterId !== existingApp.cover_letter_id) {
        updateData.cover_letter_id = params.coverLetterId;
      }
      if (params.status && params.status !== existingApp.status) {
        updateData.status = params.status;
        if (params.status === 'applied' && !existingApp.applied_date) {
          updateData.applied_date = new Date().toISOString();
        }
      }
      if (params.notes) {
        updateData.notes = params.notes;
      }

      // Only update if there are changes
      if (Object.keys(updateData).length > 1) { // More than just updated_at
        const { data: updatedApp, error: updateError } = await supabase
          .from('job_applications')
          .update(updateData)
          .eq('id', existingApp.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating application:', updateError);
          throw new Error('Failed to update application');
        }

        console.log('Application updated with new documents:', {
          applicationId: existingApp.id,
          resumeId: params.resumeId,
          coverLetterId: params.coverLetterId
        });

        return { application: updatedApp, created: false };
      } else {
        console.log('No changes needed for existing application:', existingApp.id);
        return { application: existingApp, created: false };
      }
    } else {
      // Create new application
      const applicationData: any = {
        user_id: userIdentifier,
        job_description_id: params.jobDescriptionId,
        status: params.status || 'to_apply',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (params.resumeId) applicationData.resume_id = params.resumeId;
      if (params.coverLetterId) applicationData.cover_letter_id = params.coverLetterId;
      if (params.notes) applicationData.notes = params.notes;
      if (applicationData.status === 'applied') {
        applicationData.applied_date = new Date().toISOString();
      }

      const { data: newApp, error: createError } = await supabase
        .from('job_applications')
        .insert(applicationData)
        .select()
        .single();

      if (createError) {
        console.error('Error creating application:', createError);
        throw new Error('Failed to create application');
      }

      console.log('New application created:', {
        applicationId: newApp.id,
        jobDescriptionId: params.jobDescriptionId,
        resumeId: params.resumeId,
        coverLetterId: params.coverLetterId
      });

      return { application: newApp, created: true };
    }
  } catch (error) {
    console.error('Error in createOrUpdateApplication:', error);
    throw error;
  }
}

/**
 * Updates an existing application status and details
 */
export async function updateApplicationStatus(params: UpdateApplicationParams) {
  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      throw new Error('Database connection not available');
    }

    const userIdentifier = params.userId || params.sessionId;
    if (!userIdentifier) {
      throw new Error('User ID or Session ID is required');
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (params.status) {
      updateData.status = params.status;
      if (params.status === 'applied' && !params.applied_date) {
        updateData.applied_date = new Date().toISOString();
      }
    }
    if (params.notes !== undefined) updateData.notes = params.notes;
    if (params.applied_date) updateData.applied_date = params.applied_date;

    const { data: updatedApp, error } = await supabase
      .from('job_applications')
      .update(updateData)
      .eq('id', params.applicationId)
      .eq('user_id', userIdentifier)
      .select()
      .single();

    if (error) {
      console.error('Error updating application status:', error);
      throw new Error('Failed to update application status');
    }

    if (!updatedApp) {
      throw new Error('Application not found or access denied');
    }

    return updatedApp;
  } catch (error) {
    console.error('Error in updateApplicationStatus:', error);
    throw error;
  }
}

/**
 * Saves generated document to database and returns the document ID
 * This is needed for linking documents to applications
 */
export async function saveGeneratedDocument(
  userId: string,
  jobDescriptionId: string,
  docType: 'resume' | 'cover_letter',
  fileName: string,
  filePath: string
): Promise<string> {
  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      throw new Error('Database connection not available');
    }

    const documentData = {
      user_id: userId,
      job_description_id: jobDescriptionId,
      doc_type: docType,
      file_name: fileName,
      file_path: filePath,
      created_at: new Date().toISOString()
    };

    const { data: newDoc, error } = await supabase
      .from('generated_documents')
      .insert(documentData)
      .select('id')
      .single();

    if (error) {
      console.error('Error saving generated document:', error);
      throw new Error('Failed to save generated document');
    }

    return newDoc.id;
  } catch (error) {
    console.error('Error in saveGeneratedDocument:', error);
    throw error;
  }
}

/**
 * Gets application statistics for analytics
 */
export async function getApplicationStats(userId: string, sessionId?: string) {
  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      throw new Error('Database connection not available');
    }

    const userIdentifier = userId || sessionId;
    if (!userIdentifier) {
      throw new Error('User ID or Session ID is required');
    }

    const { data: applications, error } = await supabase
      .from('job_applications')
      .select('status, applied_date, created_at')
      .eq('user_id', userIdentifier);

    if (error) {
      console.error('Error fetching application stats:', error);
      throw new Error('Failed to fetch application stats');
    }

    const stats = {
      total: applications?.length || 0,
      to_apply: 0,
      applied: 0,
      interviewing: 0,
      offered: 0,
      rejected: 0,
      applied_this_week: 0,
      applied_this_month: 0
    };

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    applications?.forEach(app => {
      // Count by status
      if (app.status in stats) {
        (stats as any)[app.status]++;
      }

      // Count applications by time period
      if (app.applied_date) {
        const appliedDate = new Date(app.applied_date);
        if (appliedDate >= oneWeekAgo) {
          stats.applied_this_week++;
        }
        if (appliedDate >= oneMonthAgo) {
          stats.applied_this_month++;
        }
      }
    });

    return stats;
  } catch (error) {
    console.error('Error in getApplicationStats:', error);
    throw error;
  }
}