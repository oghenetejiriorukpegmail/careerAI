"use client";

import { useState, useEffect } from 'react';
import { JobMatchingPanel } from '@/components/job-matching-panel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Briefcase, Target } from 'lucide-react';
import Link from 'next/link';

interface JobDescription {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
  created_at: string;
  match_score?: number;
}

export default function StoredJobMatchingPage() {
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchJobDescriptions();
  }, []);

  const fetchJobDescriptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('job_descriptions')
        .select('id, job_title, company_name, location, created_at, match_score')
        .eq('user_id', user.id)
        .not('parsed_data', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setJobDescriptions(data || []);
    } catch (error) {
      console.error('Error fetching job descriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchComplete = (matches: any[]) => {
    // Refresh job descriptions to show updated match scores
    fetchJobDescriptions();
    
    // Navigate to dashboard after a short delay to show updated stats
    if (matches.length > 0) {
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    }
  };

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const selectAllJobs = () => {
    setSelectedJobs(jobDescriptions.map(job => job.id));
  };

  const clearSelection = () => {
    setSelectedJobs([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Job Matching</h1>
        <p className="text-muted-foreground">
          Match your resume against stored job descriptions to find the best opportunities
        </p>
      </div>

      <Tabs defaultValue="all-jobs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all-jobs">
            <Briefcase className="mr-2 h-4 w-4" />
            All Jobs
          </TabsTrigger>
          <TabsTrigger value="selected-jobs">
            <Target className="mr-2 h-4 w-4" />
            Selected Jobs ({selectedJobs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all-jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stored Job Descriptions</CardTitle>
              <CardDescription>
                You have {jobDescriptions.length} job descriptions stored. Run matching against all or select specific ones.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading job descriptions...
                </div>
              ) : jobDescriptions.length === 0 ? (
                <div className="text-center py-8 space-y-4">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No job descriptions found. Add some job descriptions first.
                  </p>
                  <Link href="/dashboard/job-opportunities">
                    <Button>Browse Job Opportunities</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Click on jobs to select them for matching
                    </p>
                    <div className="space-x-2">
                      <Button variant="outline" size="sm" onClick={selectAllJobs}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={clearSelection}>
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid gap-3">
                    {jobDescriptions.map((job) => (
                      <Card
                        key={job.id}
                        className={`cursor-pointer transition-colors ${
                          selectedJobs.includes(job.id) 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => toggleJobSelection(job.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="font-semibold">{job.job_title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {job.company_name} • {job.location}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Added {new Date(job.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              {job.match_score && (
                                <Badge variant="secondary">
                                  {job.match_score}% match
                                </Badge>
                              )}
                              {selectedJobs.includes(job.id) && (
                                <Badge>Selected</Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <JobMatchingPanel onMatchComplete={handleMatchComplete} />
        </TabsContent>

        <TabsContent value="selected-jobs" className="space-y-4">
          {selectedJobs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No jobs selected. Go to "All Jobs" tab to select jobs for matching.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Selected Jobs for Matching</CardTitle>
                  <CardDescription>
                    These {selectedJobs.length} jobs will be matched against your resume
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {jobDescriptions
                      .filter(job => selectedJobs.includes(job.id))
                      .map(job => (
                        <div key={job.id} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                          <div>
                            <p className="font-medium">{job.job_title}</p>
                            <p className="text-sm text-muted-foreground">
                              {job.company_name}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleJobSelection(job.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <JobMatchingPanel 
                jobDescriptionIds={selectedJobs}
                onMatchComplete={handleMatchComplete}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}