import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-client';
import { createCheckoutSession } from '@/lib/stripe/subscription';
import type { PlanId } from '@/lib/stripe/client';

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

    const { planId } = await request.json();

    if (!planId || !['PRO', 'BUSINESS'].includes(planId)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?success=true`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?canceled=true`;

    const session = await createCheckoutSession(
      user.id,
      user.email!,
      planId as PlanId,
      successUrl,
      cancelUrl
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
  */
}