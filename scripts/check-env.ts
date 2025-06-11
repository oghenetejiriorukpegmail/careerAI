#!/usr/bin/env node

// Load environment variables BEFORE any other imports
require('dotenv').config({ path: require('path').join(process.cwd(), '.env.local') });

console.log('Environment check:');
console.log('- OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? `Set (${process.env.OPENROUTER_API_KEY.substring(0, 10)}...)` : 'Not set');
console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');
console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set' : 'Not set');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- Working directory:', process.cwd());
console.log('- .env.local path:', require('path').join(process.cwd(), '.env.local'));

// Check if the file exists
const fs = require('fs');
const envPath = require('path').join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log('- .env.local exists: Yes');
  const stats = fs.statSync(envPath);
  console.log('- .env.local size:', stats.size, 'bytes');
} else {
  console.log('- .env.local exists: No');
}

// Try to manually load and parse to debug
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  const openrouterLine = lines.find(line => line.startsWith('OPENROUTER_API_KEY'));
  if (openrouterLine) {
    console.log('- Found OPENROUTER_API_KEY in .env.local');
  } else {
    console.log('- OPENROUTER_API_KEY not found in .env.local');
  }
} catch (error) {
  console.error('Error reading .env.local:', error);
}