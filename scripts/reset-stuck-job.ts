#!/usr/bin/env node

// Load environment variables BEFORE any other imports
require('dotenv').config({ path: require('path').join(process.cwd(), '.env.local') });

import { createServiceRoleClient } from '../lib/supabase/server-client';

const jobId = process.argv[2] || 'b0a801be-1d46-48bf-b47c-f4d73cd1d396';

async function resetStuckJob() {
  console.log(`Resetting stuck job: ${jobId}`);
  
  try {
    const supabase = createServiceRoleClient();
    
    // First check the job status
    const { data: job, error: fetchError } = await supabase
      .from('job_processing')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching job:', fetchError);
      return;
    }
    
    if (!job) {
      console.log('Job not found!');
      return;
    }
    
    console.log('Current job status:', job.status);
    console.log('Started at:', job.started_at);
    
    if (job.status === 'processing' || job.status === 'failed') {
      if (job.status === 'processing') {
        // Check if it's been stuck for more than 5 minutes
        const startedAt = new Date(job.started_at);
        const now = new Date();
        const minutesStuck = (now.getTime() - startedAt.getTime()) / 1000 / 60;
        console.log(`Job has been processing for ${minutesStuck.toFixed(1)} minutes`);
      }
      
      // Reset to pending
      const { error: updateError } = await supabase
        .from('job_processing')
        .update({
          status: 'pending',
          started_at: null,
          completed_at: null,
          error_message: null,
          result_data: null
        })
        .eq('id', jobId);
      
      if (updateError) {
        console.error('Error resetting job:', updateError);
      } else {
        console.log('Job reset to pending status successfully!');
        console.log('The job worker should pick it up in the next cycle.');
      }
    } else {
      console.log(`Job is not stuck. Current status: ${job.status}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

resetStuckJob();