import { NextRequest, NextResponse } from 'next/server';

/**
 * Document parsing disabled - missing required dependencies
 */
export async function POST(request: NextRequest) {
  return NextResponse.json({
    error: 'Document parsing service temporarily unavailable'
  }, { status: 503 });
}