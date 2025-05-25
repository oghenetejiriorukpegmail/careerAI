"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Authentication disabled - skip session checks
    console.log('Dashboard layout loaded - no authentication required');
    setLoading(false);
  }, []);

  const handleSignOut = async () => {
    try {
      // Clear local storage to ensure complete logout
      if (typeof window !== 'undefined') {
        // Clear the custom storage key used by Supabase
        localStorage.removeItem('careerai-auth-token');
        // Clear any other session-related items
        localStorage.removeItem('sb-localhost-auth-token');
        localStorage.removeItem('sb-access-token');
        localStorage.removeItem('sb-refresh-token');
        
        // Clear session storage as well
        sessionStorage.clear();
      }
      
      // Call the logout API endpoint to clear server-side session
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('Logout API failed');
      }
      
      // Also sign out from client-side Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Supabase signOut error:", error);
      }
      
      // Force a hard redirect to clear any cached state
      window.location.href = "/login";
    } catch (error) {
      console.error("Error signing out:", error);
      // Even if there's an error, still redirect to login
      window.location.href = "/login";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center px-4">
          <div className="flex items-center flex-1">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <span className="font-bold text-xl">CareerAI</span>
            </Link>
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium ml-6">
              <Link href="/dashboard" className="transition-colors hover:text-foreground/80">
                Dashboard
              </Link>
              <Link href="/dashboard/resume" className="transition-colors hover:text-foreground/80">
                Resume
              </Link>
              <Link href="/dashboard/job-opportunities" className="transition-colors hover:text-foreground/80">
                Jobs
              </Link>
              <Link href="/dashboard/job-matching" className="transition-colors hover:text-foreground/80">
                Matching
              </Link>
              <Link href="/dashboard/applications" className="transition-colors hover:text-foreground/80">
                Applications
              </Link>
              <Link href="/dashboard/profile" className="transition-colors hover:text-foreground/80">
                Profile
              </Link>
              <Link href="/dashboard/settings" className="transition-colors hover:text-foreground/80">
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" onClick={handleSignOut} className="hidden md:inline-flex">
              Sign out
            </Button>
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t">
            <nav className="flex flex-col space-y-4 p-4">
              <Link 
                href="/dashboard" 
                className="text-sm font-medium transition-colors hover:text-foreground/80"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link 
                href="/dashboard/resume" 
                className="text-sm font-medium transition-colors hover:text-foreground/80"
                onClick={() => setMobileMenuOpen(false)}
              >
                Resume
              </Link>
              <Link 
                href="/dashboard/job-opportunities" 
                className="text-sm font-medium transition-colors hover:text-foreground/80"
                onClick={() => setMobileMenuOpen(false)}
              >
                Job Opportunities
              </Link>
              <Link 
                href="/dashboard/job-matching" 
                className="text-sm font-medium transition-colors hover:text-foreground/80"
                onClick={() => setMobileMenuOpen(false)}
              >
                Job Matching
              </Link>
              <Link 
                href="/dashboard/applications" 
                className="text-sm font-medium transition-colors hover:text-foreground/80"
                onClick={() => setMobileMenuOpen(false)}
              >
                Applications
              </Link>
              <Link 
                href="/dashboard/profile" 
                className="text-sm font-medium transition-colors hover:text-foreground/80"
                onClick={() => setMobileMenuOpen(false)}
              >
                Profile
              </Link>
              <Link 
                href="/dashboard/settings" 
                className="text-sm font-medium transition-colors hover:text-foreground/80"
                onClick={() => setMobileMenuOpen(false)}
              >
                Settings
              </Link>
              <div className="pt-4 border-t">
                <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start">
                  Sign out
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>
      <main className="flex-1 container py-4 px-4 md:py-8 max-w-full">
        {children}
      </main>
      <footer className="border-t py-6">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground">
            © {new Date().getFullYear()} CareerAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}