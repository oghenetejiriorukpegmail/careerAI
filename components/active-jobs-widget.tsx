'use client';

import { useActiveJobs } from '@/lib/hooks/use-active-jobs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

interface JobDetails {
  id: string;
  type: string;
  status: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  metadata?: any;
}

export function ActiveJobsWidget() {
  const { activeJobs, hasActiveJobs } = useActiveJobs();
  const [jobDetails, setJobDetails] = useState<JobDetails[]>([]);
  const [recentlyCompleted, setRecentlyCompleted] = useState<JobDetails[]>([]);

  // Fetch detailed job information
  const fetchJobDetails = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      // Get active jobs
      if (activeJobs.length > 0) {
        const { data: activeData } = await supabase
          .from('job_processing')
          .select('*')
          .eq('user_id', userData.user.id)
          .in('id', activeJobs.map(j => j.id));
        
        if (activeData) {
          setJobDetails(activeData);
        }
      }

      // Get recently completed jobs (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: completedData } = await supabase
        .from('job_processing')
        .select('*')
        .eq('user_id', userData.user.id)
        .in('status', ['completed', 'failed'])
        .gte('completed_at', fiveMinutesAgo)
        .order('completed_at', { ascending: false })
        .limit(5);
      
      if (completedData) {
        setRecentlyCompleted(completedData);
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
    }
  };

  useEffect(() => {
    fetchJobDetails();
  }, [activeJobs]);

  const getJobTypeLabel = (type: string) => {
    switch (type) {
      case 'resume_parse':
        return 'Resume Parsing';
      case 'resume_generate':
        return 'Resume Generation';
      case 'cover_letter':
        return 'Cover Letter Generation';
      default:
        return type;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-yellow-500" />;
    }
  };

  if (!hasActiveJobs && recentlyCompleted.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Background Jobs</CardTitle>
        <CardDescription>
          Track your document generation progress
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Active Jobs */}
          {jobDetails.map((job) => (
            <div key={job.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(job.status)}
                <div>
                  <p className="text-sm font-medium">{getJobTypeLabel(job.type)}</p>
                  <p className="text-xs text-muted-foreground">
                    Started {new Date(job.started_at || job.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <Badge variant={job.status === 'processing' ? 'default' : 'secondary'}>
                {job.status}
              </Badge>
            </div>
          ))}
          
          {/* Recently Completed */}
          {recentlyCompleted.map((job) => (
            <div key={job.id} className="flex items-center justify-between p-3 rounded-lg opacity-75">
              <div className="flex items-center gap-3">
                {getStatusIcon(job.status)}
                <div>
                  <p className="text-sm font-medium">{getJobTypeLabel(job.type)}</p>
                  <p className="text-xs text-muted-foreground">
                    Completed {new Date(job.completed_at!).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <Badge variant={job.status === 'completed' ? 'default' : 'destructive'}>
                {job.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}