-- Add stripe_customer_id to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE NOT NULL,
  stripe_customer_id text NOT NULL,
  plan_id text NOT NULL,
  status text NOT NULL,
  current_period_end timestamp with time zone NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create usage_tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  feature text NOT NULL,
  used integer NOT NULL DEFAULT 0,
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, feature, period_start)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON usage_tracking(period_start, period_end);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for usage_tracking
CREATE POLICY "Users can view own usage" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage usage" ON usage_tracking
  FOR ALL USING (auth.role() = 'service_role');

-- Function to get user's current plan
CREATE OR REPLACE FUNCTION get_user_plan(user_id uuid)
RETURNS text AS $$
DECLARE
  plan text;
BEGIN
  SELECT plan_id INTO plan
  FROM subscriptions
  WHERE subscriptions.user_id = get_user_plan.user_id
    AND status IN ('active', 'trialing')
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(plan, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track feature usage
CREATE OR REPLACE FUNCTION track_usage(
  p_user_id uuid,
  p_feature text,
  p_amount integer DEFAULT 1
)
RETURNS void AS $$
DECLARE
  current_period_start timestamp with time zone;
  current_period_end timestamp with time zone;
BEGIN
  -- Get current period (monthly)
  current_period_start := date_trunc('month', now());
  current_period_end := current_period_start + interval '1 month';
  
  -- Upsert usage record
  INSERT INTO usage_tracking (user_id, feature, used, period_start, period_end)
  VALUES (p_user_id, p_feature, p_amount, current_period_start, current_period_end)
  ON CONFLICT (user_id, feature, period_start)
  DO UPDATE SET 
    used = usage_tracking.used + p_amount,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;