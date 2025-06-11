#!/usr/bin/env node

/**
 * Entry point for job worker that ensures environment variables are loaded
 * before any TypeScript imports happen
 */

// Load environment variables FIRST
require('dotenv').config({ path: require('path').join(process.cwd(), '.env.local') });

// Verify environment is loaded
console.log('[ENTRY] Environment loaded:', {
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? `${process.env.OPENROUTER_API_KEY.substring(0, 10)}...` : 'NOT SET',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set'
});

// Now load and run the TypeScript worker
require('tsx/cjs');
require('./job-worker.ts');