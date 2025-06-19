import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-client';
import { createPortalSession } from '@/lib/stripe/subscription';

export async function POST(request: Request) {
  // STRIPE DISABLED FOR NOW
  return NextResponse.json({ error: 'Stripe integration disabled' }, { status: 503 });
  
  /* Original code disabled
  try {
    const supabase = createServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No active subscription' },
        { status: 400 }
      );
    }

    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`;
    const session = await createPortalSession(profile.stripe_customer_id, returnUrl);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Portal session creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
  */
}