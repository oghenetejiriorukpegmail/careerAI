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
    console.log('createOrUpdateApplication called with:', params);
    
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
      .maybeSingle();

    if (checkError) {
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
  jobDescriptionId: string | null,
  docType: 'resume' | 'cover_letter',
  fileName: string,
  filePath: string,
  txtFilePath?: string // Optional TXT file path
): Promise<string> {
  try {
    console.log('saveGeneratedDocument called with:', { userId, jobDescriptionId, docType, fileName, filePath });
    
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      throw new Error('Database connection not available');
    }

    // Check if document already exists
    let existingDocQuery = supabase
      .from('generated_documents')
      .select('id')
      .eq('user_id', userId)
      .eq('doc_type', docType)
      .eq('file_path', filePath);
    
    // Add job_description_id condition only if it's not null
    if (jobDescriptionId) {
      existingDocQuery = existingDocQuery.eq('job_description_id', jobDescriptionId);
    } else {
      existingDocQuery = existingDocQuery.is('job_description_id', null);
    }
    
    const { data: existingDoc, error: checkError } = await existingDocQuery.single();

    if (existingDoc && !checkError) {
      // Document record exists, but we need to verify the actual file exists
      // For now, we'll update the existing record to ensure consistency
      console.log('Document record exists, updating with new file data:', existingDoc.id);
      
      const updateData: any = {
        file_name: fileName,
        file_path: filePath,
        updated_at: new Date().toISOString()
      };
      
      // Add TXT file path if provided
      if (txtFilePath) {
        updateData.txt_file_path = txtFilePath;
      }
      
      const { error: updateError } = await supabase
        .from('generated_documents')
        .update(updateData)
        .eq('id', existingDoc.id);
      
      if (updateError) {
        console.error('Error updating existing document:', updateError);
        // Continue to create new document if update fails
      } else {
        console.log('Successfully updated existing document:', existingDoc.id);
        return existingDoc.id;
      }
    }

    // Create new document
    const documentData: any = {
      user_id: userId,
      doc_type: docType,
      file_name: fileName,
      file_path: filePath,
      created_at: new Date().toISOString()
    };
    
    // Only include job_description_id if it's not null
    if (jobDescriptionId) {
      documentData.job_description_id = jobDescriptionId;
    }
    
    // Add TXT file path if provided
    if (txtFilePath) {
      documentData.txt_file_path = txtFilePath;
    }

    const { data: newDoc, error } = await supabase
      .from('generated_documents')
      .insert(documentData)
      .select('id')
      .single();

    if (error) {
      // If it's a duplicate key error, try to fetch the existing document
      if (error.code === '23505' || error.message?.includes('duplicate')) {
        console.warn('Duplicate document detected, fetching existing document');
        let recoveryQuery = supabase
          .from('generated_documents')
          .select('id')
          .eq('user_id', userId)
          .eq('doc_type', docType)
          .order('created_at', { ascending: false })
          .limit(1);
        
        // Add job_description_id condition only if it's not null
        if (jobDescriptionId) {
          recoveryQuery = recoveryQuery.eq('job_description_id', jobDescriptionId);
        } else {
          recoveryQuery = recoveryQuery.is('job_description_id', null);
        }
        
        const { data: existingDoc2, error: fetchError } = await recoveryQuery.single();

        if (!fetchError && existingDoc2) {
          return existingDoc2.id;
        }
      }
      
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

    console.log('[getApplicationStats] Starting query for user:', userIdentifier);
    
    // Force fresh data by adding a timestamp to break any caching
    const { data: applications, error } = await supabase
      .from('job_applications')
      .select('id, status, applied_date, created_at, user_id, updated_at')
      .eq('user_id', userIdentifier)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching application stats:', error);
      throw new Error('Failed to fetch application stats');
    }

    console.log('[getApplicationStats] Query complete');
    console.log('[getApplicationStats] Total applications found:', applications?.length);
    console.log('[getApplicationStats] First 3 applications:', applications?.slice(0, 3));
    
    // Let's also do a raw count query to verify
    let rawCounts: any = {};
    const { data: statusCounts, error: countError } = await supabase
      .from('job_applications')
      .select('status')
      .eq('user_id', userIdentifier);
      
    if (!countError && statusCounts) {
      statusCounts.forEach((row: any) => {
        const status = row.status || 'null';
        rawCounts[status] = (rawCounts[status] || 0) + 1;
      });
      console.log('[getApplicationStats] Raw status counts from DB:', rawCounts);
    }

    const stats = {
      total: applications?.length || 0,
      to_apply: 0,
      applied: 0,
      interviewing: 0,
      offered: 0,
      rejected: 0,
      applied_this_week: 0,
      applied_this_month: 0,
      _debug: {
        rawCounts: rawCounts || {},
        sampleApps: applications?.slice(0, 3).map((app: any) => ({
          id: app.id.substring(0, 8),
          status: app.status,
          statusType: typeof app.status
        }))
      }
    };

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Log first few applications to see their structure
    if (applications && applications.length > 0) {
      console.log('[getApplicationStats] Sample application structure:', applications[0]);
    }
    
    applications?.forEach((app: any, index: number) => {
      if (index < 3) {  // Only log first 3 to avoid clutter
        console.log(`[getApplicationStats] App ${index}:`, { 
          id: app.id,
          status: app.status,
          status_type: typeof app.status,
          status_value: `"${app.status}"`,
          applied_date: app.applied_date,
          user_id: app.user_id 
        });
      }
      
      // Count by status - ensure we handle the exact status values
      switch(app.status) {
        case 'to_apply':
          stats.to_apply++;
          break;
        case 'applied':
          stats.applied++;
          break;
        case 'interviewing':
          stats.interviewing++;
          break;
        case 'offered':
          stats.offered++;
          break;
        case 'rejected':
          stats.rejected++;
          break;
        default:
          console.warn('Unknown status:', app.status, 'for application:', app.id);
          // Still count it as to_apply if status is null or unknown
          if (!app.status) {
            stats.to_apply++;
          }
      }

      // Count applications by time period based on applied_date
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
    
    console.log('Final application stats:', stats);
    console.log('Stats breakdown by status:', {
      to_apply: stats.to_apply,
      applied: stats.applied,
      interviewing: stats.interviewing,
      offered: stats.offered,
      rejected: stats.rejected
    });

    return stats;
  } catch (error) {
    console.error('Error in getApplicationStats:', error);
    throw error;
  }
}