#!/usr/bin/env node

/**
 * Database Migration Runner for CareerAI
 * 
 * This script checks and migrates the job_descriptions table to ensure
 * all required columns are present.
 * 
 * Usage:
 *   node scripts/run-migration.js [check|migrate]
 * 
 * Examples:
 *   node scripts/run-migration.js check    # Check current schema
 *   node scripts/run-migration.js migrate  # Run migration
 */

const https = require('https');

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const action = process.argv[2] || 'check';

function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    console.log(`Making ${method} request to: ${url}`);
    
    const isHttps = url.startsWith('https://');
    const lib = isHttps ? https : require('http');
    
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = lib.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function checkSchema() {
  console.log('🔍 Checking current database schema...\n');
  
  try {
    const response = await makeRequest('GET', '/api/admin/migrate');
    
    if (response.status === 200 && response.data.success) {
      const { currentColumns, missingColumns, migrationNeeded } = response.data;
      
      console.log('✅ Schema check completed successfully\n');
      console.log(`📊 Current columns: ${response.data.existingColumnsCount}/${response.data.requiredColumnsCount}`);
      
      if (currentColumns.length > 0) {
        console.log('\n📋 Existing columns:');
        currentColumns.forEach(col => {
          console.log(`  - ${col.column_name} (${col.data_type})`);
        });
      }
      
      if (missingColumns.length > 0) {
        console.log('\n❌ Missing columns:');
        missingColumns.forEach(col => {
          console.log(`  - ${col}`);
        });
        console.log('\n💡 Run migration to add missing columns:');
        console.log('   node scripts/run-migration.js migrate');
      } else {
        console.log('\n✅ All required columns are present!');
      }
      
      return migrationNeeded;
      
    } else {
      console.error('❌ Schema check failed:', response.data.error || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
    return false;
  }
}

async function runMigration() {
  console.log('🔧 Running database migration...\n');
  
  try {
    const response = await makeRequest('POST', '/api/admin/migrate');
    
    if (response.status === 200 && response.data.success) {
      const { results } = response.data;
      
      console.log('✅ Migration completed successfully\n');
      console.log('📊 Migration Results:');
      console.log(`  - Existing columns: ${results.existingColumns}`);
      console.log(`  - Missing columns found: ${results.missingColumns}`);
      console.log(`  - Columns added: ${results.addedColumns.length}`);
      
      if (results.addedColumns.length > 0) {
        console.log('\n✅ Added columns:');
        results.addedColumns.forEach(col => {
          console.log(`  - ${col}`);
        });
      }
      
      if (results.errors.length > 0) {
        console.log('\n❌ Errors encountered:');
        results.errors.forEach(error => {
          console.log(`  - ${error}`);
        });
      }
      
      console.log('\n🎉 Job descriptions table is now ready!');
      
    } else {
      console.error('❌ Migration failed:', response.data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
  }
}

async function main() {
  console.log('🚀 CareerAI Database Migration Tool\n');
  
  switch (action) {
    case 'check':
      await checkSchema();
      break;
      
    case 'migrate':
      const needsMigration = await checkSchema();
      if (needsMigration) {
        console.log('\n🔧 Starting migration...\n');
        await runMigration();
      } else {
        console.log('\n✅ No migration needed - all columns are present!');
      }
      break;
      
    default:
      console.log('Usage: node scripts/run-migration.js [check|migrate]');
      console.log('');
      console.log('Commands:');
      console.log('  check   - Check current database schema');
      console.log('  migrate - Run migration to add missing columns');
      break;
  }
}

main().catch(console.error);