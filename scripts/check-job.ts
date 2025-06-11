#!/usr/bin/env node

// Load environment variables BEFORE any other imports
require('dotenv').config({ path: require('path').join(process.cwd(), '.env.local') });

import { createServiceRoleClient } from '../lib/supabase/server-client';

const jobId = process.argv[2] || 'b0a801be-1d46-48bf-b47c-f4d73cd1d396';

async function checkJob() {
  console.log(`Checking job: ${jobId}`);
  
  try {
    const supabase = createServiceRoleClient();
    
    // Get the specific job
    const { data: job, error } = await supabase
      .from('job_processing')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (error) {
      console.error('Error fetching job:', error);
      return;
    }
    
    if (!job) {
      console.log('Job not found!');
      return;
    }
    
    console.log('\nJob details:');
    console.log('- ID:', job.id);
    console.log('- Type:', job.type);
    console.log('- Status:', job.status);
    console.log('- Created at:', job.created_at);
    console.log('- Started at:', job.started_at);
    console.log('- Completed at:', job.completed_at);
    console.log('- Error message:', job.error_message);
    console.log('- User ID:', job.user_id);
    
    if (job.result_data) {
      console.log('\nResult data:', JSON.stringify(job.result_data, null, 2));
    }
    
    if (job.error_message) {
      console.log('\nError details:', job.error_message);
    }
    
    // Also check for any pending jobs
    console.log('\n\nChecking all pending jobs...');
    const { data: pendingJobs, error: pendingError } = await supabase
      .from('job_processing')
      .select('id, type, status, created_at, user_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    
    if (pendingError) {
      console.error('Error fetching pending jobs:', pendingError);
    } else if (pendingJobs && pendingJobs.length > 0) {
      console.log(`Found ${pendingJobs.length} pending jobs:`);
      pendingJobs.forEach(job => {
        console.log(`- ${job.id}: ${job.type} (created: ${job.created_at})`);
      });
    } else {
      console.log('No pending jobs found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkJob();