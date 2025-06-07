import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-client';
import { checkFeatureLimit, type Feature } from '@/lib/stripe/usage';

const FEATURE_ROUTES: Record<string, Feature> = {
  '/api/parse-resume': 'resumeParsing',
  '/api/generate-resume': 'aiDocuments',
  '/api/generate-cover-letter': 'aiDocuments',
  '/api/jobs/match': 'jobMatches',
  '/api/applications': 'applicationTracking',
};

export async function checkSubscriptionMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const feature = FEATURE_ROUTES[pathname];
  
  if (!feature) {
    return NextResponse.next();
  }
  
  try {
    const supabase = createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const hasAccess = await checkFeatureLimit(user.id, feature);
    
    if (!hasAccess) {
      return NextResponse.json(
        { 
          error: 'Feature limit reached',
          feature,
          upgrade: true,
        },
        { status: 403 }
      );
    }
    
    return NextResponse.next();
  } catch (error) {
    console.error('Subscription check failed:', error);
    return NextResponse.next(); // Allow request to proceed on error
  }
}