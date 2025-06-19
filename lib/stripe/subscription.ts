import { stripe, PLANS, type PlanId } from './client';
import { createServerClient } from '@/lib/supabase/server-client';

export async function createOrUpdateCustomer(userId: string, email: string, name?: string) {
  const supabase = createServerClient();
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });

  await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  return customer.id;
}

export async function createCheckoutSession(
  userId: string,
  email: string,
  planId: PlanId,
  successUrl: string,
  cancelUrl: string
) {
  const plan = PLANS[planId];
  if (!('priceId' in plan) || !plan.priceId) {
    throw new Error(`No price ID configured for plan: ${planId}`);
  }

  const customerId = await createOrUpdateCustomer(userId, email);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: plan.priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      planId,
    },
  });

  return session;
}

export async function createPortalSession(customerId: string, returnUrl: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return subscription;
}

export async function getSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
}