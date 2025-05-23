import { NextRequest, NextResponse } from 'next/server';

// Database migration function to ensure job_descriptions table has all required columns
async function migrateJobDescriptionsTable() {
  try {
    const { getSupabaseAdminClient } = await import('@/lib/supabase/client');
    const supabaseAdmin = getSupabaseAdminClient();
    
    if (!supabaseAdmin) {
      throw new Error('Database connection not available');
    }

    console.log('[MIGRATION] Starting job_descriptions table migration...');

    // List of columns to check and add
    const requiredColumns = [
      { name: 'job_title', type: 'TEXT', nullable: true },
      { name: 'company_name', type: 'TEXT', nullable: true },
      { name: 'location', type: 'TEXT', nullable: true },
      { name: 'url', type: 'TEXT', nullable: true },
      { name: 'input_method', type: 'TEXT', nullable: false, default: 'manual' },
      { name: 'employment_type', type: 'TEXT', nullable: true },
      { name: 'salary_range', type: 'TEXT', nullable: true },
      { name: 'posted_date', type: 'TIMESTAMP WITH TIME ZONE', nullable: true },
      { name: 'application_deadline', type: 'TIMESTAMP WITH TIME ZONE', nullable: true },
      { name: 'processing_status', type: 'TEXT', nullable: true, default: 'pending' },
      { name: 'ai_provider', type: 'TEXT', nullable: true },
      { name: 'ai_model', type: 'TEXT', nullable: true },
      { name: 'match_score', type: 'FLOAT', nullable: true },
      { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE', nullable: true, default: 'CURRENT_TIMESTAMP' },
      { name: 'parsed_data', type: 'JSONB', nullable: true },
      { name: 'raw_content', type: 'TEXT', nullable: true }
    ];

    // Check current table structure
    const { data: currentColumns, error: columnsError } = await supabaseAdmin
      .rpc('sql', {
        query: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'job_descriptions' 
          ORDER BY ordinal_position;
        `
      });

    if (columnsError) {
      console.error('[MIGRATION] Error checking current columns:', columnsError);
      throw columnsError;
    }

    const existingColumns = currentColumns?.map((col: any) => col.column_name) || [];
    console.log('[MIGRATION] Existing columns:', existingColumns);

    // Add missing columns
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col.name));
    console.log('[MIGRATION] Missing columns:', missingColumns.map(col => col.name));

    const migrationResults = {
      existingColumns: existingColumns.length,
      missingColumns: missingColumns.length,
      addedColumns: [] as string[],
      errors: [] as string[]
    };

    for (const column of missingColumns) {
      try {
        let alterQuery = `ALTER TABLE job_descriptions ADD COLUMN ${column.name} ${column.type}`;
        
        if (!column.nullable) {
          alterQuery += ' NOT NULL';
        }
        
        if (column.default) {
          alterQuery += ` DEFAULT ${column.default}`;
        }

        console.log(`[MIGRATION] Adding column: ${column.name}`);
        console.log(`[MIGRATION] Query: ${alterQuery}`);

        const { error: addColumnError } = await supabaseAdmin.rpc('sql', {
          query: alterQuery
        });

        if (addColumnError) {
          console.error(`[MIGRATION] Error adding column ${column.name}:`, addColumnError);
          migrationResults.errors.push(`${column.name}: ${addColumnError.message}`);
        } else {
          console.log(`[MIGRATION] Successfully added column: ${column.name}`);
          migrationResults.addedColumns.push(column.name);
        }
      } catch (error) {
        console.error(`[MIGRATION] Exception adding column ${column.name}:`, error);
        migrationResults.errors.push(`${column.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Check if user_id column needs to be converted from UUID to TEXT
    const userIdColumn = currentColumns?.find((col: any) => col.column_name === 'user_id');
    if (userIdColumn && userIdColumn.data_type === 'uuid') {
      try {
        console.log('[MIGRATION] Converting user_id from UUID to TEXT...');
        
        // First, check for and drop any foreign key constraints on user_id
        const { data: constraints, error: constraintError } = await supabaseAdmin.rpc('sql', {
          query: `
            SELECT tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'job_descriptions' 
              AND tc.constraint_type = 'FOREIGN KEY'
              AND kcu.column_name = 'user_id';
          `
        });

        if (!constraintError && constraints && constraints.length > 0) {
          for (const constraint of constraints) {
            console.log(`[MIGRATION] Dropping foreign key constraint: ${constraint.constraint_name}`);
            const { error: dropError } = await supabaseAdmin.rpc('sql', {
              query: `ALTER TABLE job_descriptions DROP CONSTRAINT ${constraint.constraint_name};`
            });
            
            if (dropError) {
              console.error(`[MIGRATION] Error dropping constraint ${constraint.constraint_name}:`, dropError);
            } else {
              console.log(`[MIGRATION] Successfully dropped constraint: ${constraint.constraint_name}`);
            }
          }
        }

        // Now convert the column type
        const { error: convertError } = await supabaseAdmin.rpc('sql', {
          query: 'ALTER TABLE job_descriptions ALTER COLUMN user_id TYPE TEXT;'
        });

        if (convertError) {
          console.error('[MIGRATION] Error converting user_id column:', convertError);
          migrationResults.errors.push(`user_id conversion: ${convertError.message}`);
        } else {
          console.log('[MIGRATION] Successfully converted user_id to TEXT');
          migrationResults.addedColumns.push('user_id (converted to TEXT)');
        }
      } catch (error) {
        console.error('[MIGRATION] Exception converting user_id:', error);
        migrationResults.errors.push(`user_id conversion: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('[MIGRATION] Migration completed');
    return migrationResults;

  } catch (error) {
    console.error('[MIGRATION] Migration failed:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Starting database migration...');
    
    const migrationResults = await migrateJobDescriptionsTable();
    
    return NextResponse.json({
      success: true,
      message: 'Database migration completed',
      results: migrationResults
    });

  } catch (error) {
    console.error('[API] Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { getSupabaseAdminClient } = await import('@/lib/supabase/client');
    const supabaseAdmin = getSupabaseAdminClient();
    
    if (!supabaseAdmin) {
      throw new Error('Database connection not available');
    }

    // Check current table structure
    const { data: currentColumns, error: columnsError } = await supabaseAdmin
      .rpc('sql', {
        query: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'job_descriptions' 
          ORDER BY ordinal_position;
        `
      });

    if (columnsError) {
      throw columnsError;
    }

    const requiredColumns = [
      'id', 'user_id', 'job_title', 'company_name', 'location', 'description', 'url',
      'input_method', 'employment_type', 'salary_range', 'posted_date', 'application_deadline',
      'processing_status', 'ai_provider', 'ai_model', 'match_score', 'created_at', 
      'updated_at', 'parsed_data', 'raw_content'
    ];

    const existingColumns = currentColumns?.map((col: any) => col.column_name) || [];
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    return NextResponse.json({
      success: true,
      tableExists: existingColumns.length > 0,
      currentColumns: currentColumns || [],
      existingColumnsCount: existingColumns.length,
      requiredColumnsCount: requiredColumns.length,
      missingColumns,
      migrationNeeded: missingColumns.length > 0
    });

  } catch (error) {
    console.error('[API] Check failed:', error);
    return NextResponse.json({
      success: false,
      error: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}