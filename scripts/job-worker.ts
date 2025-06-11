#!/usr/bin/env node

/**
 * Background job worker for processing async jobs
 * Run this script to continuously process pending jobs from the queue
 */

// Load environment variables BEFORE any other imports
require('dotenv').config({ path: require('path').join(process.cwd(), '.env.local') });

import { JobProcessor } from '../lib/utils/job-processor';

const POLL_INTERVAL = parseInt(process.env.JOB_POLL_INTERVAL || '5000'); // 5 seconds default
const BATCH_SIZE = parseInt(process.env.JOB_BATCH_SIZE || '5');

console.log('Starting job worker...');
console.log(`Poll interval: ${POLL_INTERVAL}ms`);
console.log(`Batch size: ${BATCH_SIZE}`);
console.log('Environment check:');
console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');

let isProcessing = false;

async function processJobs() {
  if (isProcessing) {
    console.log('Already processing jobs, skipping this cycle');
    return;
  }

  isProcessing = true;
  
  try {
    console.log(`[${new Date().toISOString()}] Checking for pending jobs...`);
    await JobProcessor.processPendingJobs(BATCH_SIZE);
  } catch (error) {
    console.error('Error processing jobs:', error);
  } finally {
    isProcessing = false;
  }
}

// Process jobs immediately on startup
processJobs();

// Set up interval for continuous processing
const interval = setInterval(processJobs, POLL_INTERVAL);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down job worker...');
  clearInterval(interval);
  
  // Wait for current processing to complete
  const checkAndExit = () => {
    if (!isProcessing) {
      console.log('Job worker stopped');
      process.exit(0);
    } else {
      console.log('Waiting for current job to complete...');
      setTimeout(checkAndExit, 1000);
    }
  };
  
  checkAndExit();
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down job worker...');
  clearInterval(interval);
  process.exit(0);
});

console.log('Job worker is running. Press Ctrl+C to stop.');