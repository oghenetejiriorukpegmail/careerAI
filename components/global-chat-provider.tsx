'use client';

import { useQAChat } from '@/lib/hooks/use-qa-chat';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function GlobalChatProvider() {
  const pathname = usePathname();
  const [context, setContext] = useState<{
    jobDescriptionId?: string;
    applicationId?: string;
    documentType?: 'resume' | 'cover-letter';
  }>({});

  // Update context based on current route
  useEffect(() => {
    if (pathname.includes('/job-opportunities/')) {
      const jobId = pathname.split('/job-opportunities/')[1];
      setContext({ jobDescriptionId: jobId });
    } else if (pathname.includes('/applications')) {
      // Could extract application ID if in URL
      setContext({});
    } else if (pathname.includes('/generate')) {
      setContext({ documentType: 'resume' });
    } else {
      setContext({});
    }
  }, [pathname]);

  const { ChatWidget, openChat } = useQAChat({
    title: "Career Advisor",
    subtitle: "Ask me anything about your job search!",
    ...context,
  });

  return (
    <>
      {ChatWidget}
      {/* Floating button that appears on all pages */}
      <Button
        onClick={openChat}
        className="fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 p-0 shadow-lg hover:scale-110 transition-transform bg-primary hover:bg-primary/90"
        title="Ask Career Advisor"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="sr-only">Open Career Advisor Chat</span>
      </Button>
    </>
  );
}