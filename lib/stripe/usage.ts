import { createServerClient } from '@/lib/supabase/server-client';
import { PLANS } from './client';

export type Feature = 'resumeParsing' | 'aiDocuments' | 'jobMatches' | 'applicationTracking';

export async function checkFeatureLimit(userId: string, feature: Feature): Promise<boolean> {
  const supabase = createServerClient();
  
  // Get user's current plan
  const { data: planData } = await supabase
    .rpc('get_user_plan', { user_id: userId })
    .single();
  
  const planId = (planData as any)?.get_user_plan || 'FREE';
  const plan = PLANS[planId as keyof typeof PLANS];
  const limit = plan.features[feature as keyof typeof plan.features] as number | boolean | undefined;
  
  // -1 means unlimited, true means feature is available
  if (limit === -1 || limit === true) {
    return true;
  }
  
  // Check current usage
  const currentPeriodStart = new Date();
  currentPeriodStart.setDate(1);
  currentPeriodStart.setHours(0, 0, 0, 0);
  
  const { data: usage } = await supabase
    .from('usage_tracking')
    .select('used')
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('period_start', currentPeriodStart.toISOString())
    .single();
  
  const currentUsage = usage?.used || 0;
  return currentUsage < (limit as number);
}

export async function trackFeatureUsage(userId: string, feature: Feature, amount: number = 1) {
  const supabase = createServerClient();
  
  await supabase.rpc('track_usage', {
    p_user_id: userId,
    p_feature: feature,
    p_amount: amount,
  });
}

export async function getFeatureUsage(userId: string): Promise<Record<Feature, { used: number; limit: number | boolean }>> {
  const supabase = createServerClient();
  
  // Get user's plan
  const { data: planData } = await supabase
    .rpc('get_user_plan', { user_id: userId })
    .single();
  
  const planId = (planData as any)?.get_user_plan || 'FREE';
  const plan = PLANS[planId as keyof typeof PLANS];
  
  // Get current usage
  const currentPeriodStart = new Date();
  currentPeriodStart.setDate(1);
  currentPeriodStart.setHours(0, 0, 0, 0);
  
  const { data: usageData } = await supabase
    .from('usage_tracking')
    .select('feature, used')
    .eq('user_id', userId)
    .gte('period_start', currentPeriodStart.toISOString());
  
  const usageMap = (usageData || []).reduce((acc, item) => {
    acc[item.feature as Feature] = item.used;
    return acc;
  }, {} as Record<Feature, number>);
  
  // Build response with limits
  const features: Feature[] = ['resumeParsing', 'aiDocuments', 'jobMatches', 'applicationTracking'];
  const result = {} as Record<Feature, { used: number; limit: number | boolean }>;
  
  features.forEach(feature => {
    const limit = plan.features[feature as keyof typeof plan.features];
    result[feature] = {
      used: usageMap[feature] || 0,
      limit: limit || 0,
    };
  });
  
  return result;
}

export async function enforceFeatureLimit(userId: string, feature: Feature): Promise<void> {
  const hasAccess = await checkFeatureLimit(userId, feature);
  
  if (!hasAccess) {
    const supabase = createServerClient();
    const { data: planData } = await supabase
      .rpc('get_user_plan', { user_id: userId })
      .single();
    
    const planId = (planData as any)?.get_user_plan || 'FREE';
    
    throw new Error(
      `You've reached the ${feature} limit for your ${planId} plan. Please upgrade to continue.`
    );
  }
  
  await trackFeatureUsage(userId, feature);
}