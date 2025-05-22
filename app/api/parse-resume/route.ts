import { NextRequest, NextResponse } from 'next/server';

/**
 * Resume parsing disabled - missing required dependencies
 */
export async function POST(request: NextRequest) {
  return NextResponse.json({
    error: 'Resume parsing service temporarily unavailable'
  }, { status: 503 });
}