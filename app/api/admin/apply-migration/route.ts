import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const adminSupabase = getSupabaseAdminClient();
    
    // Apply the migration queries one by one
    const migrations = [
      {
        name: 'Add match_score column',
        query: 'ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS match_score FLOAT'
      },
      {
        name: 'Add last_matched_at column',
        query: 'ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS last_matched_at TIMESTAMP WITH TIME ZONE'
      },
      {
        name: 'Add matched_resume_id column',
        query: 'ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS matched_resume_id UUID REFERENCES resumes(id)'
      },
      {
        name: 'Create match_score index',
        query: 'CREATE INDEX IF NOT EXISTS idx_job_descriptions_match_score ON job_descriptions(match_score DESC)'
      },
      {
        name: 'Create last_matched_at index',
        query: 'CREATE INDEX IF NOT EXISTS idx_job_descriptions_last_matched_at ON job_descriptions(last_matched_at DESC)'
      },
      {
        name: 'Add is_primary column to resumes',
        query: 'ALTER TABLE resumes ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false'
      },
      {
        name: 'Create unique index for primary resume',
        query: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_resumes_primary_per_user ON resumes(user_id, is_primary) WHERE is_primary = true'
      }
    ];
    
    const results = [];
    
    for (const migration of migrations) {
      console.log(`Executing: ${migration.name}`);
      
      try {
        // Use raw SQL query
        const { data, error } = await adminSupabase.rpc('query', { query_text: migration.query });
        
        if (error) {
          // Try alternative approach - direct query
          const { data: altData, error: altError } = await adminSupabase
            .from('_migrations')
            .select('*')
            .limit(1);
            
          // If we can't use RPC, we'll need to use the SQL editor
          results.push({
            name: migration.name,
            status: 'needs_manual',
            error: error.message,
            query: migration.query
          });
        } else {
          results.push({
            name: migration.name,
            status: 'success'
          });
        }
      } catch (err) {
        results.push({
          name: migration.name,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
          query: migration.query
        });
      }
    }
    
    // Test if columns were added
    const { error: testError } = await adminSupabase
      .from('job_descriptions')
      .select('id, match_score, last_matched_at, matched_resume_id')
      .limit(1);
      
    const columnsAdded = !testError;
    
    return NextResponse.json({
      success: columnsAdded,
      results,
      message: columnsAdded 
        ? 'Migration completed successfully!' 
        : 'Migration needs to be applied manually in Supabase SQL Editor',
      manualSql: !columnsAdded ? migrations.map(m => m.query).join(';\n') + ';' : null
    });
    
  } catch (error) {
    console.error('Error applying migration:', error);
    return NextResponse.json({
      error: 'Failed to apply migration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}