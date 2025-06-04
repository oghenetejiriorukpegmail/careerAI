'use client';

import { useActiveJobs } from '@/lib/hooks/use-active-jobs';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function JobStatusIndicator() {
  const { activeJobs, hasActiveJobs } = useActiveJobs();

  if (!hasActiveJobs) return null;

  const pendingCount = activeJobs.filter(job => job.status === 'pending').length;
  const processingCount = activeJobs.filter(job => job.status === 'processing').length;

  return (
    <div className="flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <Badge variant="secondary" className="text-xs">
        {processingCount > 0 && `${processingCount} processing`}
        {processingCount > 0 && pendingCount > 0 && ', '}
        {pendingCount > 0 && `${pendingCount} pending`}
      </Badge>
    </div>
  );
}