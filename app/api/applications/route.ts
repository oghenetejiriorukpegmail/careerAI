import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/client';
import { createServerClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabaseClient = createServerClient();
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'You must be logged in to view applications.'
      }, { status: 401 });
    }
    
    const userId = user.id;

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Use userId if available, otherwise use sessionId
    const userIdentifier = userId;

    // Fetch job applications with related data
    const { data: applications, error } = await supabase
      .from('job_applications')
      .select(`
        id,
        status,
        applied_date,
        notes,
        created_at,
        updated_at,
        job_descriptions (
          id,
          job_title,
          company_name,
          location,
          url,
          description
        ),
        resume:generated_documents!job_applications_resume_id_fkey (
          id,
          file_name,
          file_path,
          doc_type
        ),
        cover_letter:generated_documents!job_applications_cover_letter_id_fkey (
          id,
          file_name,
          file_path,
          doc_type
        )
      `)
      .eq('user_id', userIdentifier)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching applications:', error);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    return NextResponse.json({ applications: applications || [] });

  } catch (error) {
    console.error('Error in applications GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabaseClient = createServerClient();
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'You must be logged in to create applications.'
      }, { status: 401 });
    }
    
    const userId = user.id;
    
    const body = await request.json();
    const { 
      jobDescriptionId, 
      resumeId, 
      coverLetterId, 
      status = 'to_apply',
      notes 
    } = body;

    if (!jobDescriptionId) {
      return NextResponse.json({ error: 'Job Description ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Use userId if available, otherwise use sessionId
    const userIdentifier = userId;

    // Check if application already exists for this job
    const { data: existingApp, error: checkError } = await supabase
      .from('job_applications')
      .select('id')
      .eq('user_id', userIdentifier)
      .eq('job_description_id', jobDescriptionId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error checking existing application:', checkError);
      return NextResponse.json({ error: 'Failed to check existing application' }, { status: 500 });
    }

    if (existingApp) {
      // Update existing application
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (resumeId) updateData.resume_id = resumeId;
      if (coverLetterId) updateData.cover_letter_id = coverLetterId;
      if (notes) updateData.notes = notes;
      if (status === 'applied' && !existingApp.applied_date) {
        updateData.applied_date = new Date().toISOString();
      }

      const { data: updatedApp, error: updateError } = await supabase
        .from('job_applications')
        .update(updateData)
        .eq('id', existingApp.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating application:', updateError);
        return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
      }

      return NextResponse.json({ 
        application: updatedApp,
        message: 'Application updated successfully' 
      });
    } else {
      // Create new application
      const applicationData: any = {
        user_id: userIdentifier,
        job_description_id: jobDescriptionId,
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (resumeId) applicationData.resume_id = resumeId;
      if (coverLetterId) applicationData.cover_letter_id = coverLetterId;
      if (notes) applicationData.notes = notes;
      if (status === 'applied') {
        applicationData.applied_date = new Date().toISOString();
      }

      const { data: newApp, error: createError } = await supabase
        .from('job_applications')
        .insert(applicationData)
        .select()
        .single();

      if (createError) {
        console.error('Error creating application:', createError);
        return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
      }

      return NextResponse.json({ 
        application: newApp,
        message: 'Application created successfully' 
      }, { status: 201 });
    }

  } catch (error) {
    console.error('Error in applications POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const supabaseClient = createServerClient();
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'You must be logged in to update applications.'
      }, { status: 401 });
    }
    
    const userId = user.id;
    
    const body = await request.json();
    const { 
      applicationId, 
      status, 
      notes,
      applied_date 
    } = body;

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const userIdentifier = userId;

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (status) {
      updateData.status = status;
      // Auto-set applied_date when status changes to 'applied'
      if (status === 'applied' && !applied_date) {
        updateData.applied_date = new Date().toISOString();
      }
    }
    if (notes !== undefined) updateData.notes = notes;
    if (applied_date) updateData.applied_date = applied_date;

    const { data: updatedApp, error } = await supabase
      .from('job_applications')
      .update(updateData)
      .eq('id', applicationId)
      .eq('user_id', userIdentifier) // Ensure user owns this application
      .select()
      .single();

    if (error) {
      console.error('Error updating application:', error);
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }

    if (!updatedApp) {
      return NextResponse.json({ error: 'Application not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ 
      application: updatedApp,
      message: 'Application updated successfully' 
    });

  } catch (error) {
    console.error('Error in applications PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const supabaseClient = createServerClient();
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'You must be logged in to delete applications.'
      }, { status: 401 });
    }
    
    const userId = user.id;
    
    const applicationId = request.nextUrl.searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const userIdentifier = userId;

    const { error } = await supabase
      .from('job_applications')
      .delete()
      .eq('id', applicationId)
      .eq('user_id', userIdentifier); // Ensure user owns this application

    if (error) {
      console.error('Error deleting application:', error);
      return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Application deleted successfully' });

  } catch (error) {
    console.error('Error in applications DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}