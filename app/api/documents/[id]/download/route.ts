import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-client';
import { getSupabaseAdminClient } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    
    // Check authentication
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    let userId: string | null = null;
    
    if (!authError && user) {
      userId = user.id;
    } else {
      // Check for session-based user
      const sessionUserId = request.headers.get('x-session-id');
      if (sessionUserId) {
        userId = sessionUserId;
      }
    }
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    // Use service role client to bypass RLS for document lookup
    const adminSupabase = getSupabaseAdminClient();
    
    // Get document from database - first verify it belongs to the user
    const { data: document, error: docError } = await adminSupabase
      .from('generated_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();
      
    if (docError || !document) {
      console.error('Document lookup error:', {
        documentId,
        userId,
        error: docError
      });
      return NextResponse.json({ 
        error: 'Document not found',
        details: docError?.message
      }, { status: 404 });
    }
    
    // Get file from storage using admin client
    const { data: fileData, error: fileError } = await adminSupabase.storage
      .from('user_files')
      .download(document.file_path);
      
    if (fileError || !fileData) {
      console.error('Error downloading file from user_files:', fileError);
      console.error('Document details:', {
        id: document.id,
        file_path: document.file_path,
        file_name: document.file_name,
        doc_type: document.doc_type
      });
      
      // If the file is not found in user_files, it might be a path issue
      // Return a more helpful error message
      return NextResponse.json({ 
        error: 'Failed to download file',
        details: fileError?.message || 'File not found in storage',
        documentId: document.id,
        filePath: document.file_path
      }, { status: 500 });
    }
    
    // Convert blob to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());
    
    // Return the file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${document.file_name}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
    
  } catch (error) {
    console.error('Error in document download:', error);
    return NextResponse.json({
      error: 'Failed to download document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}