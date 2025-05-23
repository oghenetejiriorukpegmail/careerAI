import React, { useEffect, useState } from 'react';
import { AlertCircle, Clock } from 'lucide-react';

interface RateLimitAlertProps {
  error: any;
  onRetry?: () => void;
}

export function RateLimitAlert({ error, onRetry }: RateLimitAlertProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  
  useEffect(() => {
    if (!error) return;
    
    // Check if it's a rate limit error
    const isRateLimit = error?.status === 429 || 
                       error?.code === 'over_request_rate_limit' ||
                       error?.message?.toLowerCase().includes('rate limit') ||
                       error?.message?.toLowerCase().includes('too many');
    
    if (!isRateLimit) return;
    
    // Set initial time (default 5 minutes)
    let waitTime = 300; // 5 minutes in seconds
    
    // Check for Retry-After header
    if (error?.headers?.['retry-after']) {
      waitTime = parseInt(error.headers['retry-after']);
    }
    
    setTimeRemaining(waitTime);
    
    // Countdown timer
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [error]);
  
  if (!error) return null;
  
  const isRateLimit = error?.status === 429 || 
                     error?.code === 'over_request_rate_limit' ||
                     error?.message?.toLowerCase().includes('rate limit') ||
                     error?.message?.toLowerCase().includes('too many');
  
  if (!isRateLimit) return null;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Rate Limit Reached
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>Too many attempts. Please wait before trying again.</p>
            {timeRemaining > 0 && (
              <div className="mt-2 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>Time remaining: {formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
          {timeRemaining === 0 && onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}