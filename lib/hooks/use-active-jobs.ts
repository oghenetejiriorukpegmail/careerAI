import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

interface ActiveJob {
  id: string;
  type: string;
  status: string;
  created_at: string;
}

export function useActiveJobs() {
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [isPolling, setIsPolling] = useState(false);

  // Check for active jobs
  const checkActiveJobs = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { data, error } = await supabase
        .from('job_processing')
        .select('id, type, status, created_at')
        .eq('user_id', userData.user.id)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false });

      if (!error && data) {
        setActiveJobs(data);
        // Only enable polling if there are active jobs
        setIsPolling(data.length > 0);
      }
    } catch (error) {
      console.error('Error checking active jobs:', error);
    }
  };

  useEffect(() => {
    // Initial check
    checkActiveJobs();

    // Subscribe to job status changes
    const subscription = supabase
      .channel('job-status-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'job_processing'
      }, () => {
        checkActiveJobs();
      })
      .subscribe();

    // Set up polling only when there are active jobs
    let interval: NodeJS.Timeout | null = null;
    
    if (isPolling) {
      interval = setInterval(() => {
        checkActiveJobs();
      }, 5000); // Poll every 5 seconds when jobs are active
    }

    return () => {
      if (interval) clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [isPolling]);

  return {
    activeJobs,
    hasActiveJobs: activeJobs.length > 0,
    isPolling
  };
}