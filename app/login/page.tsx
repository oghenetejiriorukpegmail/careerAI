'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        console.log('Session check on login page:', data.session ? 'Authenticated' : 'Not authenticated');
        
        // If user is already logged in, redirect to dashboard
        if (data.session) {
          // Get the redirectTo parameter from the URL if present
          const params = new URLSearchParams(window.location.search);
          const redirectTo = params.get('redirectTo');
          
          // Use a direct manual redirect to dashboard or the requested page
          const destination = redirectTo && !redirectTo.includes('/login') 
            ? redirectTo 
            : '/dashboard';
            
          console.log('Already authenticated, redirecting to:', destination);
          // Use window.location for immediate redirect
          window.location.href = destination;
          return; // Exit early to prevent further processing
        }
      } catch (err) {
        console.error('Error checking session:', err);
      } finally {
        setPageLoading(false);
      }
    };
    
    checkSession();
  }, []);

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
        throw error;
      }

      console.log("Login successful:", data);
      
      // Get the redirectTo parameter from the URL if present
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirectTo');
      
      // Safety check to prevent redirect loops
      const safeRedirectTo = redirectTo && 
                            !redirectTo.includes('/login') && 
                            !redirectTo.includes('/signup') 
                            ? redirectTo 
                            : '/dashboard';
      
      console.log('Login successful, redirecting to:', safeRedirectTo);
      
      // Use window.location for immediate redirect after login
      window.location.href = safeRedirectTo;
    } catch (error: any) {
      console.error("Error during login:", error);
      setError(error.message || "An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {pageLoading ? (
        // Show loading indicator while checking session
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Checking authentication status...</p>
          <p className="text-xs text-muted-foreground mt-2">If you're already logged in, you'll be redirected to the dashboard automatically.</p>
        </div>
      ) : (
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Login</CardTitle>
            <CardDescription>
              Enter your email and password to access your account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                  {error}
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
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
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
      )}
    </div>
  );
}