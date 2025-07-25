'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RateLimitAlert } from "@/components/ui/rate-limit-alert";
import { clearAllAuthStorage } from "@/lib/auth/auth-recovery";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  // Clear any corrupted auth state when login page loads
  useEffect(() => {
    // Only clear auth state if we're actually on login page due to auth issues
    const urlParams = new URLSearchParams(window.location.search);
    const hasRedirectParam = urlParams.has('redirectTo');
    
    if (hasRedirectParam) {
      console.log('Login page loaded due to redirect - clearing any corrupted auth state');
      clearAllAuthStorage();
      
      // Show a brief informational message
      const redirectFrom = urlParams.get('redirectTo');
      if (redirectFrom && redirectFrom !== '/') {
        setErrorMessage('Your session has expired. Please log in again to continue.');
      }
    }
  }, []);

  // Removed client-side session check - middleware handles authentication
  // The middleware will redirect authenticated users away from login page

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log("Logging in with:", { email });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);
        
        // Handle rate limit specifically
        if (error.status === 429 || error.code === 'over_request_rate_limit') {
          throw new Error('Too many login attempts. Please wait a few minutes before trying again.');
        }
        
        // Handle invalid refresh token
        if (error.code === 'refresh_token_already_used') {
          // Clear any stored session data
          await supabase.auth.signOut();
          throw new Error('Session expired. Please try logging in again.');
        }
        
        throw error;
      }

      console.log("Login successful:", data);
      
      // Sync the session with the server
      const sessionResponse = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }),
      });
      
      if (!sessionResponse.ok) {
        const error = await sessionResponse.json();
        throw new Error(error.error || 'Failed to establish session');
      }
      
      console.log('Session synchronized with server');
      
      // Get the redirectTo parameter from the URL if present
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirectTo') || '/dashboard';
      
      console.log('Redirecting to:', redirectTo);
      
      // Use window.location.href for a full page navigation
      window.location.href = redirectTo;
    } catch (error: any) {
      console.error("Error during login:", error);
      setError(error);
      setErrorMessage(error.message || "An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Login</CardTitle>
            <CardDescription>
              Enter your email and password to access your account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <RateLimitAlert 
                error={error} 
                onRetry={() => {
                  setError(null);
                  setErrorMessage(null);
                }}
              />
              {errorMessage && !error?.status && (
                <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                  {errorMessage}
                </div>
              )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
            <div className="mt-4 text-center text-sm">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}