import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json({
    error: 'Resume upload service temporarily unavailable'
  }, { status: 503 });
}