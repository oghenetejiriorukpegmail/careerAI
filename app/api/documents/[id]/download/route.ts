import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    
    // Check authentication
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    // Get document from database
    const { data: document, error: docError } = await supabase
      .from('generated_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', session.user.id)
      .single();
      
    if (docError || !document) {
      return NextResponse.json({ 
        error: 'Document not found'
      }, { status: 404 });
    }
    
    // Get file from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('documents')
      .download(document.file_path);
      
    if (fileError || !fileData) {
      console.error('Error downloading file:', fileError);
      return NextResponse.json({ 
        error: 'Failed to download file'
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