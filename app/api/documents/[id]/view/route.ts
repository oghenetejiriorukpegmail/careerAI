import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-client';
import { getSupabaseAdminClient } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const supabaseClient = createServerClient();
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'You must be logged in to view documents.'
      }, { status: 401 });
    }
    
    const userId = session.user.id;
    const documentId = params.id;
    
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }
    
    // Get document metadata
    const { data: document, error: docError } = await supabase
      .from('generated_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();
    
    if (docError || !document) {
      console.error('Document not found:', { documentId, userId, error: docError });
      return NextResponse.json({ 
        error: 'Document not found',
        message: 'The requested document does not exist or you do not have access to it.'
      }, { status: 404 });
    }
    
    // Download from storage
    const { data: fileData, error } = await supabase.storage
      .from('user_files')
      .download(document.file_path);
    
    if (error || !fileData) {
      console.error('Storage download error:', error);
      return NextResponse.json({ 
        error: 'Failed to retrieve document from storage',
        details: error?.message 
      }, { status: 500 });
    }
    
    // Convert blob to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());
    
    // Determine content type based on file extension
    const isDocx = document.file_name.toLowerCase().endsWith('.docx');
    const contentType = isDocx 
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/pdf';
    
    // Return the file for viewing (inline disposition)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${document.file_name}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      },
    });
    
  } catch (error) {
    console.error('Error in document view:', error);
    return NextResponse.json({
      error: 'Failed to view document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}