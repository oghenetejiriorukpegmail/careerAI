import { NextRequest, NextResponse } from 'next/server';
import { JobProcessor } from '@/lib/utils/job-processor';
import { processJobInline } from '@/lib/utils/inline-job-processor';
import { createServerClient } from '@/lib/supabase/server-client';

// Google Document AI processing function
async function processDocumentWithGoogleAI(fileBuffer: ArrayBuffer, mimeType: string) {
  try {
    // Use dynamic import to avoid webpack issues
    const { DocumentProcessorServiceClient } = await import('@google-cloud/documentai').then(m => m.v1);
    
    // Initialize the client with credentials
    const client = new DocumentProcessorServiceClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });

    const projectId = process.env.GOOGLE_PROJECT_ID;
    const location = 'us'; // or your preferred location
    const processorId = process.env.GOOGLE_PROCESSOR_ID;

    // The full resource name of the processor
    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    // Configure the request for processing the document
    const request = {
      name,
      rawDocument: {
        content: Buffer.from(fileBuffer).toString('base64'),
        mimeType,
      },
      // Enable imageless mode to support up to 30 pages
      processOptions: {
        ocrConfig: {
          enableImageQualityScores: false,
          enableSymbol: false,
          computeStyleInfo: false,
        },
      },
    };

    // Process the document
    const [result] = await client.processDocument(request);
    const { document } = result;

    if (!document || !document.text) {
      throw new Error('No text extracted from document');
    }

    return document.text;
  } catch (error) {
    console.error('Google Document AI error:', error);
    throw new Error(`Document AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    // Check authentication
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    if (!file) {
      return NextResponse.json({
        error: 'No file provided'
      }, { status: 400 });
    }

    // Basic file validation
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Please upload a PDF or DOCX file.'
      }, { status: 400 });
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({
        error: 'File size must be less than 10MB'
      }, { status: 400 });
    }

    console.log(`[ASYNC PROCESSING] Creating job for resume: ${file.name} (${file.size} bytes)`);

    // Convert file to buffer for Document AI
    const fileBuffer = await file.arrayBuffer();

    // Step 1: Extract text using Google Document AI (synchronous for now)
    console.log('[GOOGLE DOCUMENT AI] Starting text extraction...');
    const extractedText = await processDocumentWithGoogleAI(fileBuffer, file.type);
    
    if (!extractedText || extractedText.trim().length === 0) {
      console.error('[GOOGLE DOCUMENT AI] No text extracted from document');
      return NextResponse.json({
        error: 'No text could be extracted from the document'
      }, { status: 400 });
    }

    console.log(`[GOOGLE DOCUMENT AI] Extracted ${extractedText.length} characters of text`);

    // Create async job for AI parsing
    const jobId = await JobProcessor.createJob(
      userId,
      'resume_parse',
      {
        content: extractedText,
        filename: file.name,
        userId
      },
      {
        originalFileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }
    );

    console.log(`[ASYNC PROCESSING] Created job ${jobId} for resume parsing`);

    // Start processing the job
    // In Replit, this will process inline; elsewhere it uses background processing
    processJobInline(jobId).catch(console.error);

    // Return immediately with job ID
    return NextResponse.json({
      success: true,
      jobId,
      message: 'Resume upload successful. Processing in background.',
      status: 'processing',
      data: {
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[ASYNC UPLOAD] Error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to process resume',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}