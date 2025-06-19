"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle, XCircle, Clock, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Resume = {
  id: string;
  file_name: string;
  file_type: string;
  created_at: string;
  parsed_data: any;
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  job_id?: string;
};

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingJobs, setProcessingJobs] = useState<Map<string, any>>(new Map());
  const router = useRouter();
  const { toast } = useToast();

  // Check job status
  const checkJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/job-status/${jobId}`);
      if (response.ok) {
        const jobData = await response.json();
        setProcessingJobs(prev => new Map(prev).set(jobId, jobData));
        
        if (jobData.status === 'completed') {
          // Refresh resumes list
          fetchResumes();
          toast({
            title: "Resume Processed",
            description: "Your resume has been successfully processed.",
          });
        } else if (jobData.status === 'failed') {
          toast({
            title: "Processing Failed",
            description: jobData.error || "Failed to process resume.",
            variant: "destructive",
          });
        }
        
        return jobData;
      }
    } catch (error) {
      console.error('Error checking job status:', error);
    }
  };

  const fetchResumes = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (userData && userData.user) {
        // Fetch resumes
        const { data, error } = await supabase
          .from("resumes")
          .select("*")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: false });
          
        if (error) {
          throw error;
        }
        
        setResumes(data || []);
        
        // Fetch processing jobs
        const { data: jobs } = await supabase
          .from("job_processing")
          .select("*")
          .eq("user_id", userData.user.id)
          .eq("type", "resume_parse")
          .in("status", ["pending", "processing"]);
          
        if (jobs) {
          const jobsMap = new Map();
          jobs.forEach((job: any) => {
            jobsMap.set(job.id, job);
          });
          setProcessingJobs(jobsMap);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load resumes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, [toast]);
  
  // Poll for job status updates
  useEffect(() => {
    const interval = setInterval(() => {
      processingJobs.forEach((job, jobId) => {
        if (job.status === 'pending' || job.status === 'processing') {
          checkJobStatus(jobId);
        }
      });
    }, 60000); // Poll every 60 seconds (1 minute)
    
    return () => clearInterval(interval);
  }, [processingJobs]);

  const deleteResume = async (id: string) => {
    try {
      const { error } = await supabase
        .from("resumes")
        .delete()
        .eq("id", id);
        
      if (error) {
        throw error;
      }
      
      setResumes(resumes.filter(resume => resume.id !== id));
      
      toast({
        title: "Success",
        description: "Resume deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete resume",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading resumes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="max-w-full">
          <h1 className="text-3xl font-bold tracking-tight">Resumes</h1>
          <p className="text-muted-foreground break-words">
            Upload and manage your resumes to create tailored applications
          </p>
        </div>
        <Link href="/dashboard/resume/new" passHref className="w-full md:w-auto">
          <Button className="w-full md:w-auto">Upload New Resume</Button>
        </Link>
      </div>

      {resumes.length === 0 && processingJobs.size === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-60 text-center p-6">
            <h3 className="text-xl font-semibold mb-2">No Resumes Yet</h3>
            <p className="text-muted-foreground mb-6">
              Upload your resume to get started with creating tailored job applications
            </p>
            <Link href="/dashboard/resume/new" passHref>
              <Button>Upload Your Resume</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          {resumes.map((resume) => {
            // Check if there's a processing job for this resume
            const processingJob = Array.from(processingJobs.values()).find(
              job => job.metadata?.originalFileName === resume.file_name
            );
            
            const isProcessing = processingJob && (processingJob.status === 'pending' || processingJob.status === 'processing');
            const isFailed = processingJob && processingJob.status === 'failed';
            
            return (
              <Card key={resume.id} className={isProcessing ? "border-blue-200 bg-blue-50/50" : ""}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg md:text-xl break-all">{resume.file_name}</CardTitle>
                      <CardDescription>
                        Uploaded on {new Date(resume.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    {isProcessing && (
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Processing
                      </Badge>
                    )}
                    {isFailed && (
                      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                    {!isProcessing && !isFailed && resume.parsed_data && (
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Processed
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">File Type:</span>
                      <span className="text-sm ml-2">{resume.file_type}</span>
                    </div>
                    {isProcessing && (
                      <div className="text-sm text-blue-600">
                        <Clock className="h-3 w-3 inline mr-1" />
                        Your resume is being analyzed...
                      </div>
                    )}
                    {isFailed && processingJob && (
                      <div className="text-sm text-red-600">
                        Error: {processingJob.error_message || "Processing failed"}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteResume(resume.id)}
                    disabled={isProcessing}
                  >
                    Delete
                  </Button>
                  <div className="flex gap-2">
                    {resume.parsed_data && !isProcessing && (
                      <Link href={`/dashboard/resume/${resume.id}?print=true`} passHref>
                        <Button variant="outline" size="sm">
                          <Printer className="h-4 w-4 mr-1" />
                          Print
                        </Button>
                      </Link>
                    )}
                    <Link href={`/dashboard/resume/${resume.id}`} passHref>
                      <Button size="sm" disabled={isProcessing || !resume.parsed_data}>
                        {isProcessing ? "Processing..." : "View & Edit"}
                      </Button>
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
          {/* Show processing jobs that don't have resume records yet */}
          {Array.from(processingJobs.values())
            .filter(job => 
              (job.status === 'pending' || job.status === 'processing') &&
              !resumes.some(r => r.file_name === job.metadata?.originalFileName)
            )
            .map((job) => (
              <Card key={job.id} className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg md:text-xl break-all">{job.metadata?.originalFileName || 'Processing...'}</CardTitle>
                      <CardDescription>
                        Started {new Date(job.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      {job.status === 'pending' ? 'Queued' : 'Processing'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">File Type:</span>
                      <span className="text-sm ml-2">{job.metadata?.fileType || 'Unknown'}</span>
                    </div>
                    <div className="text-sm text-blue-600">
                      <Clock className="h-3 w-3 inline mr-1" />
                      Your resume is being analyzed...
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                  >
                    Delete
                  </Button>
                  <Button size="sm" disabled>
                    Processing...
                  </Button>
                </CardFooter>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}