'use client';

import { useState } from 'react';
import { useSubscription } from '@/lib/hooks/use-subscription';
import { PLANS } from '@/lib/stripe/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Check, X } from 'lucide-react';

export function SubscriptionManager() {
  const { subscription, currentPlan, usage, loading, error } = useSubscription();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleUpgrade = async (planId: string) => {
    setIsLoading(planId);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading('manage');
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to open billing portal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            You are currently on the {currentPlan.name} plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">{currentPlan.name}</h3>
              {subscription && (
                <p className="text-sm text-muted-foreground">
                  {subscription.cancelAtPeriodEnd
                    ? `Cancels on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                    : `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
                </p>
              )}
            </div>
            {subscription && (
              <Button onClick={handleManageSubscription} disabled={isLoading === 'manage'}>
                {isLoading === 'manage' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Manage Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle>Usage This Month</CardTitle>
            <CardDescription>Track your feature usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(usage).map(([feature, data]) => {
                const percent = typeof data.limit === 'number' 
                  ? (data.used / data.limit) * 100 
                  : 0;
                
                return (
                  <div key={feature}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">
                        {feature.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {data.limit === -1 ? 'Unlimited' : `${data.used} / ${data.limit}`}
                      </span>
                    </div>
                    {typeof data.limit === 'number' && (
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(PLANS).map(([id, plan]) => {
          const isCurrent = currentPlan.id === plan.id;
          
          return (
            <Card key={id} className={isCurrent ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{plan.name}</CardTitle>
                  {isCurrent && <Badge>Current</Badge>}
                </div>
                <CardDescription>
                  <span className="text-3xl font-bold">
                    ${plan.price / 100}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {Object.entries(plan.features).map(([feature, value]) => (
                    <li key={feature} className="flex items-center">
                      {value ? (
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <X className="h-4 w-4 text-gray-400 mr-2" />
                      )}
                      <span className="text-sm">
                        {feature.replace(/([A-Z])/g, ' $1').trim()}
                        {typeof value === 'number' && value !== -1 && ` (${value})`}
                        {value === -1 && ' (Unlimited)'}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {!isCurrent && 'priceId' in plan && plan.priceId && (
                  <Button 
                    className="w-full" 
                    onClick={() => handleUpgrade(id)}
                    disabled={isLoading === id}
                  >
                    {isLoading === id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Upgrade to {plan.name}
                  </Button>
                )}
                {isCurrent && (
                  <Button className="w-full" disabled variant="outline">
                    Current Plan
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}