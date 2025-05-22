"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Authentication disabled - skip session checks
    console.log('Dashboard layout loaded - no authentication required');
    setLoading(false);
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      // Use window.location for a hard redirect
      window.location.href = "/login";
    } catch (error) {
      console.error("Error signing out:", error);
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
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
              <span className="font-bold text-xl">CareerAI</span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link href="/dashboard" className="transition-colors hover:text-foreground/80">
                Dashboard
              </Link>
              <Link href="/dashboard/resume" className="transition-colors hover:text-foreground/80">
                Resume
              </Link>
              <Link href="/dashboard/job-opportunities" className="transition-colors hover:text-foreground/80">
                Job Opportunities
              </Link>
              <Link href="/dashboard/job-matching" className="transition-colors hover:text-foreground/80">
                Job Matching
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
          <div className="flex flex-1 items-center justify-end space-x-2">
            <Button variant="ghost" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-8">
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