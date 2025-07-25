// Example: How to integrate the Application Q&A component into an existing page
// This example shows how to add the Q&A component to the job opportunity detail page

import { ApplicationQAStandalone } from '@/components/application-qa-standalone';

// In your existing page component:
export default function JobOpportunityDetailPage() {
  const [opportunity, setOpportunity] = useState<JobOpportunity | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [selectedCoverLetterId, setSelectedCoverLetterId] = useState<string>('');
  
  // ... existing code ...

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Existing job details content */}
      <Card>
        <CardHeader>
          <CardTitle>{opportunity?.job_title}</CardTitle>
          <CardDescription>{opportunity?.company_name}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Job details */}
        </CardContent>
      </Card>

      {/* Add the Q&A component */}
      {opportunity && (
        <ApplicationQAStandalone
          jobDescriptionId={opportunity.id}
          resumeId={selectedResumeId}
          coverLetterId={selectedCoverLetterId}
          className="mt-6"
        />
      )}
    </div>
  );
}

// Alternative: Add it as a tab in a tabbed interface
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function JobDetailsWithTabs() {
  return (
    <Tabs defaultValue="details">
      <TabsList>
        <TabsTrigger value="details">Job Details</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="qa">Q&A Assistant</TabsTrigger>
      </TabsList>
      
      <TabsContent value="details">
        {/* Job details content */}
      </TabsContent>
      
      <TabsContent value="documents">
        {/* Resume and cover letter generation */}
      </TabsContent>
      
      <TabsContent value="qa">
        <ApplicationQAStandalone
          jobDescriptionId={jobId}
          resumeId={selectedResumeId}
          coverLetterId={selectedCoverLetterId}
        />
      </TabsContent>
    </Tabs>
  );
}

// Alternative: Add it in a modal/dialog
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function JobDetailsWithQAModal() {
  const [qaModalOpen, setQaModalOpen] = useState(false);
  
  return (
    <>
      <Button onClick={() => setQaModalOpen(true)}>
        <MessageCircle className="mr-2 h-4 w-4" />
        Q&A Assistant
      </Button>
      
      <Dialog open={qaModalOpen} onOpenChange={setQaModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Application Q&A Assistant</DialogTitle>
          </DialogHeader>
          <ApplicationQAStandalone
            jobDescriptionId={jobId}
            resumeId={selectedResumeId}
            coverLetterId={selectedCoverLetterId}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// Alternative: Minimal integration - just the question input
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function MinimalQAIntegration({ jobDescriptionId, resumeId }: { jobDescriptionId: string; resumeId?: string }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleAskQuestion = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/application-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          jobDescriptionId,
          resumeId
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setAnswer(data.response.answer);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <Textarea
        placeholder="Ask a question about this job application..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <Button onClick={handleAskQuestion} disabled={loading || !question}>
        {loading ? 'Thinking...' : 'Get Answer'}
      </Button>
      {answer && (
        <Card>
          <CardContent className="pt-4">
            <p className="whitespace-pre-wrap">{answer}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}