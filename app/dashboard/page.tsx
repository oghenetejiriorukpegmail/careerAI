"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApplicationStatusSelect } from "@/components/application-status-select";

type JobApplication = {
  id: string;
  company_name: string;
  job_title: string;
  status: string;
  created_at: string;
};

type ApplicationStats = {
  total: number;
  to_apply: number;
  applied: number;
  interviewing: number;
  offered: number;
  rejected: number;
  applied_this_week: number;
  applied_this_month: number;
};

type JobMatch = {
  id: string;
  company_name: string;
  job_title: string;
  location: string;
  job_url: string;
  matched_at: string;
};

export default function DashboardPage() {
  const supabase = getSupabaseClient();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [resumeCount, setResumeCount] = useState(0);
  const [totalApplications, setTotalApplications] = useState(0);
  const [totalJobMatches, setTotalJobMatches] = useState(0);
  const [applicationStats, setApplicationStats] = useState<ApplicationStats | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // First check if user is authenticated
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData && userData.user) {
          // Fetch all dashboard data via API (bypasses RLS)
          const dashboardResponse = await fetch('/api/dashboard/data');
          
          if (dashboardResponse.ok) {
            const dashboardData = await dashboardResponse.json();
            
            setProfile(dashboardData.profile);
            setApplications(dashboardData.applications);
            setTotalApplications(dashboardData.totalApplications);
            setJobMatches(dashboardData.jobMatches);
            setTotalJobMatches(dashboardData.totalJobMatches);
            setResumeCount(dashboardData.resumeCount);
            
            console.log('Dashboard data loaded:', dashboardData);
          } else {
            const error = await dashboardResponse.json();
            console.error('Error fetching dashboard data:', error);
          }

          // Fetch application statistics
          try {
            const statsResponse = await fetch(`/api/applications/stats?userId=${userData.user.id}`);
            if (statsResponse.ok) {
              const { stats } = await statsResponse.json();
              setApplicationStats(stats);
              console.log('Application stats loaded:', stats);
            }
          } catch (statsError) {
            console.error('Error fetching application stats:', statsError);
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.full_name || "User"}!
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href="/dashboard/resume/new" passHref>
            <Button>Create New Resume</Button>
          </Link>
          <Link href="/dashboard/job-matching" passHref>
            <Button variant="outline">Find Jobs</Button>
          </Link>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.location.reload()}
            title="Refresh dashboard data"
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Resume</CardTitle>
            <CardDescription>Upload and manage your resumes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumeCount}</div>
            <p className="text-xs text-muted-foreground">resumes created</p>
          </CardContent>
          <CardFooter>
            <Link href="/dashboard/resume" className="w-full">
              <Button variant="outline" className="w-full">View Resumes</Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Job Matches</CardTitle>
            <CardDescription>Jobs matching your profile</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalJobMatches}</div>
            <p className="text-xs text-muted-foreground">total job matches</p>
          </CardContent>
          <CardFooter>
            <Link href="/dashboard/job-matching" className="w-full">
              <Button variant="outline" className="w-full">View Job Matches</Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Applications</CardTitle>
            <CardDescription>Track your job applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applicationStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">total applications</p>
            {applicationStats && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>This week:</span>
                  <Badge variant="secondary">{applicationStats.applied_this_week}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>This month:</span>
                  <Badge variant="secondary">{applicationStats.applied_this_month}</Badge>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Link href="/dashboard/applications" className="w-full">
              <Button variant="outline" className="w-full">View Applications</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* Application Analytics */}
      {applicationStats && applicationStats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Application Analytics</CardTitle>
            <CardDescription>Your job application progress breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <div className="text-2xl font-bold text-blue-600">{applicationStats.to_apply}</div>
                <p className="text-xs text-muted-foreground">To Apply</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                <div className="text-2xl font-bold text-yellow-600">{applicationStats.applied}</div>
                <p className="text-xs text-muted-foreground">Applied</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                <div className="text-2xl font-bold text-purple-600">{applicationStats.interviewing}</div>
                <p className="text-xs text-muted-foreground">Interviewing</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                <div className="text-2xl font-bold text-green-600">{applicationStats.offered}</div>
                <p className="text-xs text-muted-foreground">Offered</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                <div className="text-2xl font-bold text-red-600">{applicationStats.rejected}</div>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                Click on any application status above to update it
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>Track your recent job applications</CardDescription>
          </CardHeader>
          <CardContent>
            {applications.length > 0 ? (
              <div className="space-y-4">
                {applications.map((application) => (
                  <div key={application.id} className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{application.job_title}</p>
                      <p className="text-sm text-muted-foreground truncate">{application.company_name}</p>
                    </div>
                    <ApplicationStatusSelect
                      applicationId={application.id}
                      currentStatus={application.status}
                      onStatusChange={async (newStatus) => {
                        // Update local state
                        const updatedApps = applications.map(app => 
                          app.id === application.id ? { ...app, status: newStatus } : app
                        );
                        setApplications(updatedApps);
                        
                        // Refresh stats after a short delay
                        setTimeout(async () => {
                          try {
                            const { data: userData } = await supabase.auth.getUser();
                            if (userData?.user) {
                              const statsResponse = await fetch(`/api/applications/stats?userId=${userData.user.id}`);
                              if (statsResponse.ok) {
                                const { stats } = await statsResponse.json();
                                setApplicationStats(stats);
                              }
                            }
                          } catch (error) {
                            console.error('Error refreshing stats:', error);
                          }
                        }, 500);
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <p className="text-muted-foreground mb-4">No applications yet</p>
                <Link href="/dashboard/job-matching" passHref>
                  <Button variant="outline" size="sm">
                    Find Jobs to Apply
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
          {applications.length > 0 && (
            <CardFooter>
              <Link href="/dashboard/applications" className="w-full">
                <Button variant="outline" className="w-full">View All Applications</Button>
              </Link>
            </CardFooter>
          )}
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Job Matches</CardTitle>
            <CardDescription>Jobs that match your profile</CardDescription>
          </CardHeader>
          <CardContent>
            {jobMatches.length > 0 ? (
              <div className="space-y-4">
                {jobMatches.map((match) => (
                  <div key={match.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{match.job_title}</p>
                      <p className="text-sm text-muted-foreground">{match.company_name} • {match.location}</p>
                    </div>
                    <a href={match.job_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">View</Button>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <p className="text-muted-foreground mb-4">No job matches yet</p>
                <Link href="/dashboard/profile" passHref>
                  <Button variant="outline" size="sm">
                    Complete Your Profile
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
          {jobMatches.length > 0 && (
            <CardFooter>
              <Link href="/dashboard/job-matching" className="w-full">
                <Button variant="outline" className="w-full">View All Matches</Button>
              </Link>
            </CardFooter>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to enhance your job search</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/dashboard/resume/new" passHref>
              <Button variant="outline" className="w-full h-24 flex flex-col">
                <span className="text-lg">Create Resume</span>
                <span className="text-xs text-muted-foreground">Generate ATS-optimized resume</span>
              </Button>
            </Link>
            <Link href="/dashboard/job-matching" passHref>
              <Button variant="outline" className="w-full h-24 flex flex-col">
                <span className="text-lg">Find Jobs</span>
                <span className="text-xs text-muted-foreground">Discover relevant opportunities</span>
              </Button>
            </Link>
            <Link href="/dashboard/profile/linkedin" passHref>
              <Button variant="outline" className="w-full h-24 flex flex-col">
                <span className="text-lg">Optimize LinkedIn</span>
                <span className="text-xs text-muted-foreground">Improve your LinkedIn profile</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}