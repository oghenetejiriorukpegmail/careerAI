"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X } from "lucide-react";

// Force dynamic rendering to ensure proper health checks
export const dynamic = 'force-dynamic';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center px-4">
          <div className="flex flex-1 items-center">
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-bold text-xl">CareerAI</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium ml-6">
              <Link href="#features" className="transition-colors hover:text-foreground/80">
                Features
              </Link>
              <Link href="#pricing" className="transition-colors hover:text-foreground/80">
                Pricing
              </Link>
              <Link href="#about" className="transition-colors hover:text-foreground/80">
                About
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-2">
            <nav className="hidden md:flex items-center">
              <Link href="/login" passHref>
                <Button variant="ghost" className="mr-2">
                  Log in
                </Button>
              </Link>
              <Link href="/signup" passHref>
                <Button>
                  Sign up
                </Button>
              </Link>
            </nav>
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
        {mobileMenuOpen && (
          <div className="md:hidden border-t">
            <nav className="flex flex-col space-y-4 p-4">
              <Link 
                href="#features" 
                className="text-sm font-medium transition-colors hover:text-foreground/80"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link 
                href="#pricing" 
                className="text-sm font-medium transition-colors hover:text-foreground/80"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link 
                href="#about" 
                className="text-sm font-medium transition-colors hover:text-foreground/80"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <div className="pt-4 border-t space-y-2">
                <Link href="/login" passHref>
                  <Button variant="ghost" className="w-full justify-start">
                    Log in
                  </Button>
                </Link>
                <Link href="/signup" passHref>
                  <Button className="w-full">
                    Sign up
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-48 bg-secondary">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl xl:text-6xl">
                    Land Your Dream Job with AI-Powered Applications
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Generate ATS-optimized resumes and cover letters tailored to each job. Get matched with relevant opportunities and optimize your job search.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/signup" passHref>
                    <Button size="lg" className="w-full min-[400px]:w-auto">
                      Get Started
                    </Button>
                  </Link>
                  <Link href="/features" passHref>
                    <Button size="lg" variant="outline" className="w-full min-[400px]:w-auto">
                      Learn More
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="hidden lg:flex">
                <div className="rounded-lg bg-foreground/5 p-8 shadow-lg">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Resume Generation</h3>
                    <p className="text-muted-foreground">
                      Our AI analyzes your skills and experience to generate tailored, ATS-optimized resumes for each job application.
                    </p>
                  </div>
                  <div className="mt-6 space-y-2">
                    <h3 className="text-xl font-bold">Cover Letter Customization</h3>
                    <p className="text-muted-foreground">
                      Create compelling cover letters that highlight your relevant skills and express genuine interest in the role.
                    </p>
                  </div>
                  <div className="mt-6 space-y-2">
                    <h3 className="text-xl font-bold">Job Matching</h3>
                    <p className="text-muted-foreground">
                      Get matched with relevant job opportunities from major job boards based on your profile.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                Features
              </h2>
              <p className="max-w-[85%] text-muted-foreground sm:text-lg">
                Comprehensive tools to streamline your job search process and improve your chances of success.
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 sm:grid-cols-2 md:grid-cols-3">
              <div className="rounded-lg border bg-card p-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h3 className="text-xl font-bold">Resume Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload your resume for AI analysis and optimization suggestions.
                  </p>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h3 className="text-xl font-bold">ATS Optimization</h3>
                  <p className="text-sm text-muted-foreground">
                    Ensure your resume gets past Applicant Tracking Systems with keyword optimization.
                  </p>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h3 className="text-xl font-bold">LinkedIn Enhancement</h3>
                  <p className="text-sm text-muted-foreground">
                    Get actionable tips to improve your LinkedIn profile visibility.
                  </p>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h3 className="text-xl font-bold">Job Matching</h3>
                  <p className="text-sm text-muted-foreground">
                    Discover relevant job opportunities tailored to your skills and experience.
                  </p>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h3 className="text-xl font-bold">Application Tracking</h3>
                  <p className="text-sm text-muted-foreground">
                    Monitor your job applications from a centralized dashboard.
                  </p>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h3 className="text-xl font-bold">Document Generation</h3>
                  <p className="text-sm text-muted-foreground">
                    Create professional resumes and cover letters tailored to each job.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-secondary">
          <div className="container px-4 md:px-6">
            <div className="mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                Ready to Transform Your Job Search?
              </h2>
              <p className="max-w-[85%] text-muted-foreground sm:text-lg">
                Join thousands of job seekers who've optimized their applications with CareerAI.
              </p>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Link href="/signup" passHref>
                  <Button size="lg" className="w-full min-[400px]:w-auto">
                    Sign Up Now
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} CareerAI. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="/terms">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="/privacy">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}