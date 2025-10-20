/**
 * Inline job processor for Replit deployment
 * Processes jobs immediately after creation instead of using a background worker
 */

import { JobProcessor } from './job-processor';

const REPLIT_MODE = process.env.REPLIT || process.env.REPL_ID;
const MAX_INLINE_WAIT_TIME = 60000; // 1 minute max for inline processing

/**
 * Process a job inline with timeout protection
 * Used in Replit where we can't have background workers
 */
export async function processJobInline(jobId: string): Promise<void> {
  if (!REPLIT_MODE) {
    // In non-Replit environments, process the specific job immediately
    setTimeout(() => {
      JobProcessor.processSpecificJob(jobId).catch(console.error);
    }, 100);
    return;
  }

  // In Replit, process the specific job immediately with a timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Job processing timeout')), MAX_INLINE_WAIT_TIME);
  });

  try {
    await Promise.race([
      JobProcessor.processSpecificJob(jobId),
      timeoutPromise
    ]);
  } catch (error) {
    console.error(`[INLINE PROCESSOR] Error processing job ${jobId}:`, error);
    // Don't throw - let the job remain in queue for later processing
  }
}

/**
 * Start a simple interval-based processor for Replit
 * This runs within the main process
 */
export function startInlineProcessor(): void {
  if (!REPLIT_MODE) {
    console.log('[INLINE PROCESSOR] Not in Replit mode, skipping inline processor');
    return;
  }

  const interval = parseInt(process.env.JOB_POLL_INTERVAL || '30000');
  const batchSize = parseInt(process.env.JOB_BATCH_SIZE || '3');

  console.log(`[INLINE PROCESSOR] Starting with interval ${interval}ms, batch size ${batchSize}`);

  // Process jobs periodically
  setInterval(async () => {
    try {
      await JobProcessor.processPendingJobs(batchSize);
    } catch (error) {
      console.error('[INLINE PROCESSOR] Error in periodic processing:', error);
    }
  }, interval);

  // Process once on startup
  JobProcessor.processPendingJobs(batchSize).catch(console.error);
}