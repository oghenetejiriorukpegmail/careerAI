import { NextResponse } from 'next/server';

export async function GET() {
  // Return a minimal 1x1 transparent GIF
  const transparentGif = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );
  
  return new NextResponse(transparentGif, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}