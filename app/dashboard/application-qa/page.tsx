'use client';

import { ApplicationQAStandalone } from '@/components/application-qa-standalone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function ApplicationQAPage() {
  const searchParams = useSearchParams();
  
  // Get parameters from URL (these would typically be passed from another page)
  const jobDescriptionId = searchParams.get('jobId') || '';
  const resumeId = searchParams.get('resumeId') || undefined;
  const coverLetterId = searchParams.get('coverLetterId') || undefined;

  if (!jobDescriptionId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Application Q&A Assistant</CardTitle>
            <CardDescription>
              Get help answering job application questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                Please select a job description to use the Q&A assistant. 
                You can access this feature from the job details page.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Application Q&A Assistant</h1>
          <p className="text-muted-foreground mt-2">
            Get professional, tailored responses to interview and application questions
          </p>
        </div>

        <ApplicationQAStandalone
          jobDescriptionId={jobDescriptionId}
          resumeId={resumeId}
          coverLetterId={coverLetterId}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Our AI assistant helps you craft professional responses to common interview 
              and application questions based on your actual experience and qualifications.
            </p>
            <ul className="space-y-2 list-disc pl-5">
              <li>
                <strong>Truthful responses:</strong> All answers are based solely on information 
                from your resume and cover letter
              </li>
              <li>
                <strong>Tailored to the role:</strong> Responses highlight your most relevant 
                experience for the specific position
              </li>
              <li>
                <strong>Confidence scoring:</strong> See how well your experience matches the 
                question requirements
              </li>
              <li>
                <strong>History tracking:</strong> Review past Q&As to prepare for interviews
              </li>
            </ul>
            <Alert className="mt-4">
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                Remember: These responses are suggestions. Always personalize them with your 
                own voice and be prepared to elaborate in interviews.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}