import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PLANS, type PlanId } from '@/lib/stripe/client';
import type { Feature } from '@/lib/stripe/usage';

interface Subscription {
  id: string;
  planId: PlanId;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface UsageData {
  [key: string]: {
    used: number;
    limit: number | boolean;
  };
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use the global supabase client

  const fetchSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get subscription
      const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (subError && subError.code !== 'PGRST116') {
        throw subError;
      }

      if (sub) {
        setSubscription({
          id: sub.id,
          planId: sub.plan_id as PlanId,
          status: sub.status,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        });
      }

      // Get usage
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setUsage(data.usage);
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      setError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const currentPlan = subscription ? PLANS[subscription.planId] : PLANS.FREE;
  
  const checkLimit = (feature: Feature): boolean => {
    if (!usage) return true;
    const featureUsage = usage[feature];
    if (!featureUsage) return true;
    
    if (featureUsage.limit === -1 || featureUsage.limit === true) {
      return true;
    }
    
    return featureUsage.used < (featureUsage.limit as number);
  };

  const getUsagePercent = (feature: Feature): number => {
    if (!usage) return 0;
    const featureUsage = usage[feature];
    if (!featureUsage) return 0;
    
    if (featureUsage.limit === -1 || featureUsage.limit === true) {
      return 0;
    }
    
    return (featureUsage.used / (featureUsage.limit as number)) * 100;
  };

  return {
    subscription,
    currentPlan,
    usage,
    loading,
    error,
    checkLimit,
    getUsagePercent,
    refetch: fetchSubscription,
  };
}