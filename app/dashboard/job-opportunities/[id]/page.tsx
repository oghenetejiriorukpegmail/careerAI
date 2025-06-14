"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  ArrowLeft, 
  FileText, 
  Loader,
  Briefcase,
  DollarSign,
  Clock,
  User,
  Star,
  Download,
  Edit,
  Trash2,
  Plus,
  Code,
  X
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

type JobOpportunity = {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
  description: string;
  url?: string;
  input_method: string;
  employment_type?: string;
  salary_range?: string;
  posted_date?: string;
  application_deadline?: string;
  processing_status: string;
  match_score?: number;
  created_at: string;
  parsed_data?: any;
  raw_content?: string;
};

type Resume = {
  id: string;
  file_name: string;
  created_at: string;
};

export default function JobOpportunityDetailPage() {
  const [opportunity, setOpportunity] = useState<JobOpportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [generatingResume, setGeneratingResume] = useState(false);
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resumeSelectionModal, setResumeSelectionModal] = useState(false);
  const [regenerateConfirmModal, setRegenerateConfirmModal] = useState(false);
  const [documentType, setDocumentType] = useState<'resume' | 'coverLetter'>('resume');
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [checkingApplication, setCheckingApplication] = useState(false);
  const [editFormData, setEditFormData] = useState({
    job_title: '',
    company_name: '',
    location: '',
    description: '',
    url: '',
    employment_type: '',
    salary_range: ''
  });
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const jobId = params.id as string;

  useEffect(() => {
    if (jobId) {
      fetchJobOpportunity();
      checkExistingApplication();
    }
  }, [jobId]);

  const fetchJobOpportunity = async () => {
    try {
      setLoading(true);
      
      // Get current user - support both authenticated and session users
      let userId: string;
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          userId = userData.user.id;
        } else {
          const sessionUserId = localStorage.getItem('sessionUserId');
          if (!sessionUserId) {
            router.push("/dashboard/job-opportunities");
            return;
          }
          userId = sessionUserId;
        }
      } catch {
        const sessionUserId = localStorage.getItem('sessionUserId');
        if (!sessionUserId) {
          router.push("/dashboard/job-opportunities");
          return;
        }
        userId = sessionUserId;
      }

      const { data, error } = await supabase
        .from("job_descriptions")
        .select("*")
        .eq("id", jobId)
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Error fetching job opportunity:", error);
        if (error.code === 'PGRST116') {
          // Not found
          toast({
            title: "Job Not Found",
            description: "The requested job opportunity could not be found.",
            variant: "destructive"
          });
          router.push("/dashboard/job-opportunities");
          return;
        }
        throw error;
      }

      setOpportunity(data);
      
      // Initialize edit form data
      setEditFormData({
        job_title: data.job_title || '',
        company_name: data.company_name || '',
        location: data.location || '',
        description: data.description || '',
        url: data.url || '',
        employment_type: data.employment_type || '',
        salary_range: data.salary_range || ''
      });
    } catch (error) {
      console.error("Failed to fetch job opportunity:", error);
      toast({
        title: "Error",
        description: "Failed to load job opportunity details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!opportunity) return;
    
    const confirmed = confirm("Are you sure you want to delete this job opportunity? This action cannot be undone.");
    if (!confirmed) return;

    try {
      setDeleting(true);
      
      // Use the API endpoint to handle cascading deletes
      const response = await fetch(`/api/job-descriptions/${opportunity.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete');
      }

      toast({
        title: "Success",
        description: "Job opportunity and all associated documents deleted successfully"
      });
      
      router.push("/dashboard/job-opportunities");
    } catch (error) {
      console.error("Failed to delete job opportunity:", error);
      toast({
        title: "Error",
        description: "Failed to delete job opportunity",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  const checkExistingApplication = async () => {
    try {
      setCheckingApplication(true);
      const { data: userData } = await supabase.auth.getUser();
      
      if (userData && userData.user) {
        const { data: appData, error: appError } = await supabase
          .from("job_applications")
          .select("*, generated_documents!inner(id, doc_type, file_name)")
          .eq("user_id", userData.user.id)
          .eq("job_description_id", jobId)
          .single();
          
        if (!appError && appData) {
          setExistingApplication(appData);
        }
      }
    } catch (error) {
      console.error("Error checking application:", error);
    } finally {
      setCheckingApplication(false);
    }
  };

  const fetchUserResumes = async () => {
    try {
      setLoadingResumes(true);
      const { data: userData } = await supabase.auth.getUser();
      
      if (userData && userData.user) {
        const { data: resumeData, error: resumeError } = await supabase
          .from("resumes")
          .select("id, file_name, created_at, processing_status")
          .eq("user_id", userData.user.id)
          .eq("processing_status", "completed")
          .order("created_at", { ascending: false });
          
        if (resumeError) throw resumeError;
        
        if (resumeData && resumeData.length > 0) {
          setResumes(resumeData);
          setSelectedResumeId(resumeData[0].id); // Select the most recent by default
        } else {
          toast({
            title: "No Resumes Found",
            description: "Please upload a resume before generating documents.",
            variant: "destructive"
          });
          setResumeSelectionModal(false);
        }
      }
    } catch (error) {
      console.error("Error fetching resumes:", error);
      toast({
        title: "Error",
        description: "Failed to load resumes",
        variant: "destructive"
      });
    } finally {
      setLoadingResumes(false);
    }
  };

  const handleGenerateButtonClick = async (type: 'resume' | 'coverLetter') => {
    // Check if document already exists
    const hasExistingDocument = type === 'resume' 
      ? existingApplication?.resume_id 
      : existingApplication?.cover_letter_id;
    
    setDocumentType(type);
    
    if (hasExistingDocument) {
      // Show confirmation dialog for regeneration
      setRegenerateConfirmModal(true);
    } else {
      // No existing document, proceed with generation
      setResumeSelectionModal(true);
      await fetchUserResumes();
    }
  };
  
  const handleConfirmRegenerate = async () => {
    setRegenerateConfirmModal(false);
    setResumeSelectionModal(true);
    await fetchUserResumes();
  };
  
  const handleCancelRegenerate = () => {
    setRegenerateConfirmModal(false);
    
    // Navigate to applications page to see existing documents
    toast({
      title: "View Existing Documents",
      description: "Redirecting to Applications page where you can download existing documents.",
    });
    
    setTimeout(() => {
      router.push('/dashboard/applications');
    }, 1000);
  };

  const handleConfirmGenerate = async () => {
    if (!selectedResumeId) {
      toast({
        title: "No Resume Selected",
        description: "Please select a resume to continue",
        variant: "destructive"
      });
      return;
    }

    setResumeSelectionModal(false);
    
    if (documentType === 'resume') {
      await handleGenerateResume();
    } else {
      await handleGenerateCoverLetter();
    }
  };

  const handleGenerateResume = async () => {
    setGeneratingResume(true);
    try {
      // Get current user - support both authenticated and session users
      let userId: string;
      let sessionId: string | null = null;
      
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          userId = userData.user.id;
        } else {
          // Use session-based user ID for non-authenticated users
          const sessionUserId = localStorage.getItem('sessionUserId') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('sessionUserId', sessionUserId);
          sessionId = sessionUserId;
          userId = sessionUserId;
        }
      } catch {
        // Fallback to session user
        const sessionUserId = localStorage.getItem('sessionUserId') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('sessionUserId', sessionUserId);
        sessionId = sessionUserId;
        userId = sessionUserId;
      }

      const response = await fetch('/api/generate-resume-async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: jobId,
          resumeId: selectedResumeId,
          sessionId: sessionId,
          userId: sessionId ? null : userId, // Use userId only for authenticated users
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const jobProcessingId = result.jobId;
        
        toast({
          title: "Resume Generation Started",
          description: "Your resume is being generated. You'll be notified when it's ready.",
        });
        
        // Poll for job status
        const checkJobStatus = setInterval(async () => {
          try {
            const statusResponse = await fetch(`/api/job-status/${jobProcessingId}`);
            const statusData = await statusResponse.json();
            
            if (statusData.status === 'completed') {
              clearInterval(checkJobStatus);
              
              // Get the generated document - check both result and results fields
              const documentId = statusData.result?.documentId || statusData.results?.documentId;
              const fileName = statusData.result?.fileName || statusData.results?.fileName || 'resume.pdf';
              
              if (documentId) {
                const docResponse = await fetch(`/api/documents/${documentId}/download`);
                if (docResponse.ok) {
                  const blob = await docResponse.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.style.display = 'none';
                  a.href = url;
                  a.download = fileName;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  
                  toast({
                    title: "Success",
                    description: "Resume generated and downloaded successfully!"
                  });
                  
                  // Refresh application status
                  checkExistingApplication();
                } else {
                  toast({
                    title: "Download Failed",
                    description: "Resume was generated but download failed. Please check the Applications page.",
                    variant: "destructive"
                  });
                }
              } else {
                toast({
                  title: "Success",
                  description: "Resume generated successfully! Check the Applications page to download.",
                });
                
                // Refresh application status
                checkExistingApplication();
              }
            } else if (statusData.status === 'failed') {
              clearInterval(checkJobStatus);
              toast({
                title: "Generation Failed",
                description: statusData.error || 'Failed to generate resume. Please try again.',
                variant: "destructive"
              });
            }
          } catch (error) {
            console.error('Error checking job status:', error);
          }
        }, 2000); // Check every 2 seconds
        
        // Stop checking after 2 minutes
        setTimeout(() => clearInterval(checkJobStatus), 120000);
      } else {
        const errorData = await response.json();
        console.error('Failed to generate resume:', errorData.error);
        toast({
          title: "Error",
          description: errorData.error || 'Failed to generate resume',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error generating resume:', error);
      toast({
        title: "Error",
        description: "Error generating resume. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGeneratingResume(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    setGeneratingCoverLetter(true);
    try {
      // Get current user - support both authenticated and session users
      let userId: string;
      let sessionId: string | null = null;
      
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          userId = userData.user.id;
        } else {
          // Use session-based user ID for non-authenticated users
          const sessionUserId = localStorage.getItem('sessionUserId') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('sessionUserId', sessionUserId);
          sessionId = sessionUserId;
          userId = sessionUserId;
        }
      } catch {
        // Fallback to session user
        const sessionUserId = localStorage.getItem('sessionUserId') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('sessionUserId', sessionUserId);
        sessionId = sessionUserId;
        userId = sessionUserId;
      }

      const response = await fetch('/api/generate-cover-letter-async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: jobId,
          resumeId: selectedResumeId,
          sessionId: sessionId,
          userId: sessionId ? null : userId, // Use userId only for authenticated users
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const jobProcessingId = result.jobId;
        
        toast({
          title: "Cover Letter Generation Started",
          description: "Your cover letter is being generated. You'll be notified when it's ready.",
        });
        
        // Poll for job status
        const checkJobStatus = setInterval(async () => {
          try {
            const statusResponse = await fetch(`/api/job-status/${jobProcessingId}`);
            const statusData = await statusResponse.json();
            
            if (statusData.status === 'completed') {
              clearInterval(checkJobStatus);
              
              // Get the generated document - check both result and results fields
              const documentId = statusData.result?.documentId || statusData.results?.documentId;
              const fileName = statusData.result?.fileName || statusData.results?.fileName || 'cover-letter.pdf';
              
              if (documentId) {
                const docResponse = await fetch(`/api/documents/${documentId}/download`);
                if (docResponse.ok) {
                  const blob = await docResponse.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.style.display = 'none';
                  a.href = url;
                  a.download = fileName;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  
                  toast({
                    title: "Success",
                    description: "Cover letter generated and downloaded successfully!"
                  });
                  
                  // Refresh application status
                  checkExistingApplication();
                } else {
                  toast({
                    title: "Download Failed",
                    description: "Cover letter was generated but download failed. Please check the Applications page.",
                    variant: "destructive"
                  });
                }
              } else {
                toast({
                  title: "Success",
                  description: "Cover letter generated successfully! Check the Applications page to download.",
                });
                
                // Refresh application status
                checkExistingApplication();
              }
            } else if (statusData.status === 'failed') {
              clearInterval(checkJobStatus);
              toast({
                title: "Generation Failed",
                description: statusData.error || 'Failed to generate cover letter. Please try again.',
                variant: "destructive"
              });
            }
          } catch (error) {
            console.error('Error checking job status:', error);
          }
        }, 2000); // Check every 2 seconds
        
        // Stop checking after 2 minutes
        setTimeout(() => clearInterval(checkJobStatus), 120000);
      } else {
        const errorData = await response.json();
        console.error('Failed to generate cover letter:', errorData.error);
        toast({
          title: "Error",
          description: errorData.error || 'Failed to generate cover letter',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error generating cover letter:', error);
      toast({
        title: "Error",
        description: "Error generating cover letter. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGeneratingCoverLetter(false);
    }
  };

  const handleEditJob = () => {
    setEditModalOpen(true);
  };

  const handleSaveJob = async () => {
    if (!opportunity) return;

    try {
      const { data, error } = await supabase
        .from('job_descriptions')
        .update(editFormData)
        .eq('id', opportunity.id)
        .select()
        .single();

      if (error) throw error;

      setOpportunity(data);
      setEditModalOpen(false);
      
      toast({
        title: "Success",
        description: "Job details updated successfully!"
      });

      // Refresh the page data
      fetchJobOpportunity();
    } catch (error) {
      console.error('Error updating job:', error);
      toast({
        title: "Error",
        description: "Failed to update job details",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Processing", variant: "secondary" as const },
      processing: { label: "Processing", variant: "secondary" as const },
      completed: { label: "Ready", variant: "default" as const },
      failed: { label: "Failed", variant: "destructive" as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getInputMethodBadge = (method: string) => {
    const methodConfig = {
      url: { label: "From URL", icon: ExternalLink },
      text_paste: { label: "Pasted Text", icon: FileText },
      manual: { label: "Manual Entry", icon: Briefcase }
    };

    const config = methodConfig[method as keyof typeof methodConfig] || methodConfig.text_paste;
    const Icon = config.icon;
    
    return (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{config.label}</span>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push("/dashboard/job-opportunities")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-60 text-center p-6">
            <h3 className="text-xl font-semibold mb-2">Job Not Found</h3>
            <p className="text-muted-foreground mb-6">
              The requested job opportunity could not be found.
            </p>
            <Button onClick={() => router.push("/dashboard/job-opportunities")}>
              Return to Job Opportunities
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const parsedData = opportunity.parsed_data || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back Button */}
      <div>
        <Button variant="outline" onClick={() => router.push("/dashboard/job-opportunities")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>
      </div>

      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg p-6 border">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight">{opportunity.job_title}</h1>
              {getStatusBadge(opportunity.processing_status)}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground mb-3">
              <Building2 className="h-4 w-4" />
              <span className="font-medium">{opportunity.company_name}</span>
              <span>•</span>
              <MapPin className="h-4 w-4" />
              <span>{opportunity.location}</span>
              {parsedData.employment_type && (
                <>
                  <span>•</span>
                  <span>{parsedData.employment_type}</span>
                </>
              )}
            </div>
            {parsedData.salary_range && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold">
                <DollarSign className="h-4 w-4" />
                <span>{parsedData.salary_range}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {opportunity.url && (
              <Button variant="outline" size="sm" onClick={() => window.open(opportunity.url, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Original
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-4">
        {/* Main Content */}
        <div className="xl:col-span-3 space-y-6">
          {/* Job Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Job Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {parsedData.job_summary && (
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Job Summary
                  </h4>
                  <p className="text-sm leading-relaxed">{parsedData.job_summary}</p>
                </div>
              )}
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Company Details</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{opportunity.company_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <span>{opportunity.location}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Position Details</h4>
                  <div className="space-y-2">
                    {parsedData.employment_type && (
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-purple-600" />
                        <span>{parsedData.employment_type}</span>
                      </div>
                    )}
                    {parsedData.salary_range && (
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-green-700 dark:text-green-400">{parsedData.salary_range}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Requirements */}
          {(parsedData.required_qualifications || parsedData.preferred_qualifications) && (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {parsedData.required_qualifications && (
                  <div>
                    <h4 className="font-medium mb-2 text-red-600">Required Qualifications</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {parsedData.required_qualifications.map((req: string, index: number) => (
                        <li key={index}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {parsedData.preferred_qualifications && (
                  <div>
                    <h4 className="font-medium mb-2 text-blue-600">Preferred Qualifications</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {parsedData.preferred_qualifications.map((req: string, index: number) => (
                        <li key={index}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Skills */}
          {(parsedData.required_skills || parsedData.preferred_skills || parsedData.technologies) && (
            <Card>
              <CardHeader>
                <CardTitle>Skills & Technologies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {parsedData.required_skills && (
                  <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 border border-red-200 dark:border-red-800">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-red-700 dark:text-red-400">
                      <Star className="h-4 w-4" />
                      Required Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {parsedData.required_skills.map((skill: string, index: number) => (
                        <Badge key={index} className="bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {parsedData.preferred_skills && (
                  <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                      <Plus className="h-4 w-4" />
                      Preferred Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {parsedData.preferred_skills.map((skill: string, index: number) => (
                        <Badge key={index} className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {parsedData.technologies && (
                  <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-purple-700 dark:text-purple-400">
                      <Code className="h-4 w-4" />
                      Technologies
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {parsedData.technologies.map((tech: string, index: number) => (
                        <Badge key={index} className="bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200">{tech}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Responsibilities */}
          {parsedData.responsibilities && (
            <Card>
              <CardHeader>
                <CardTitle>Responsibilities</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {parsedData.responsibilities.map((resp: string, index: number) => (
                    <li key={index}>{resp}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Enhanced Sidebar */}
        <div className="space-y-6">
          {/* Primary Actions */}
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Show existing documents info if available */}
              {(existingApplication?.resume_id || existingApplication?.cover_letter_id) && (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                    Documents already generated:
                  </p>
                  <div className="space-y-1">
                    {existingApplication?.resume_id && (
                      <p className="text-xs text-green-700 dark:text-green-300">
                        ✓ Tailored Resume
                      </p>
                    )}
                    {existingApplication?.cover_letter_id && (
                      <p className="text-xs text-green-700 dark:text-green-300">
                        ✓ Cover Letter
                      </p>
                    )}
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    className="px-0 h-auto mt-2 text-xs"
                    onClick={() => router.push('/dashboard/applications')}
                  >
                    View in Applications →
                  </Button>
                </div>
              )}
              
              <Button 
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                onClick={() => handleGenerateButtonClick('resume')}
                disabled={generatingResume || checkingApplication}
              >
                {generatingResume ? (
                  <Loader className="h-5 w-5 mr-3 animate-spin" />
                ) : (
                  <FileText className="h-5 w-5 mr-3" />
                )}
                {existingApplication?.resume_id ? 'Regenerate' : 'Generate'} Tailored Resume
              </Button>
              <Button 
                variant="outline" 
                className="w-full h-12 text-base font-semibold border-2 hover:bg-blue-50 dark:hover:bg-blue-950"
                onClick={() => handleGenerateButtonClick('coverLetter')}
                disabled={generatingCoverLetter || checkingApplication}
              >
                {generatingCoverLetter ? (
                  <Loader className="h-5 w-5 mr-3 animate-spin" />
                ) : (
                  <Download className="h-5 w-5 mr-3" />
                )}
                {existingApplication?.cover_letter_id ? 'Regenerate' : 'Generate'} Cover Letter
              </Button>
            </CardContent>
          </Card>

          {/* Management Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start"
                onClick={handleEditJob}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Job Details
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Job
              </Button>
            </CardContent>
          </Card>

          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Added:</span>
                  <span>{formatDate(opportunity.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source:</span>
                  <div>{getInputMethodBadge(opportunity.input_method)}</div>
                </div>
                {opportunity.posted_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Posted:</span>
                    <span>{formatDate(opportunity.posted_date)}</span>
                  </div>
                )}
                {opportunity.application_deadline && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deadline:</span>
                    <span>{formatDate(opportunity.application_deadline)}</span>
                  </div>
                )}
                {opportunity.match_score && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Match Score:</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span>{Math.round(opportunity.match_score)}%</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Benefits */}
          {parsedData.benefits && (
            <Card>
              <CardHeader>
                <CardTitle>Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {parsedData.benefits.map((benefit: string, index: number) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="text-green-500">•</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Job Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setEditModalOpen(false)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Job Details</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setEditModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={editFormData.job_title}
                    onChange={(e) => setEditFormData({...editFormData, job_title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={editFormData.company_name}
                    onChange={(e) => setEditFormData({...editFormData, company_name: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({...editFormData, location: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employment_type">Employment Type</Label>
                  <Input
                    id="employment_type"
                    value={editFormData.employment_type}
                    onChange={(e) => setEditFormData({...editFormData, employment_type: e.target.value})}
                    placeholder="e.g. Full-time, Part-time, Contract"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary_range">Salary Range</Label>
                  <Input
                    id="salary_range"
                    value={editFormData.salary_range}
                    onChange={(e) => setEditFormData({...editFormData, salary_range: e.target.value})}
                    placeholder="e.g. $80,000 - $100,000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">Job URL (Optional)</Label>
                  <Input
                    id="url"
                    value={editFormData.url}
                    onChange={(e) => setEditFormData({...editFormData, url: e.target.value})}
                    placeholder="https://..."
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Job Description</Label>
                <Textarea
                  id="description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                  rows={8}
                  placeholder="Enter the complete job description..."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveJob}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Selection Modal */}
      <Dialog open={resumeSelectionModal} onOpenChange={setResumeSelectionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Select Resume for {documentType === 'resume' ? 'Tailored Resume' : 'Cover Letter'}
            </DialogTitle>
            <DialogDescription>
              Choose which resume to use as the base for generating your {documentType === 'resume' ? 'tailored resume' : 'cover letter'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loadingResumes ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="h-6 w-6 animate-spin" />
              </div>
            ) : resumes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No resumes found</p>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setResumeSelectionModal(false);
                    router.push("/dashboard/resume/new");
                  }}
                >
                  Upload Resume
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="resume-select">Choose a resume to use as the base:</Label>
                  <Select
                    value={selectedResumeId}
                    onValueChange={setSelectedResumeId}
                  >
                    <SelectTrigger id="resume-select">
                      <SelectValue placeholder="Select a resume" />
                    </SelectTrigger>
                    <SelectContent>
                      {resumes.map((resume) => (
                        <SelectItem key={resume.id} value={resume.id}>
                          {resume.file_name} - Uploaded {new Date(resume.created_at).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">
                  The selected resume will be used to generate a {documentType === 'resume' ? 'tailored resume' : 'customized cover letter'} for the {opportunity?.job_title} position at {opportunity?.company_name}.
                </p>
              </>
            )}
          </div>
          {resumes.length > 0 && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setResumeSelectionModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmGenerate} disabled={!selectedResumeId}>
                Generate {documentType === 'resume' ? 'Resume' : 'Cover Letter'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Regeneration Confirmation Modal */}
      <Dialog open={regenerateConfirmModal} onOpenChange={setRegenerateConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {documentType === 'resume' ? 'Resume' : 'Cover Letter'} Already Exists
            </DialogTitle>
            <DialogDescription>
              You have already generated a {documentType} for this job opportunity.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              A {documentType === 'resume' ? 'resume' : 'cover letter'} has already been generated for this job opportunity.
            </p>
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Regenerating will create a new document and replace the existing one.
              </p>
            </div>
            <p className="text-sm">
              Would you like to:
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={handleCancelRegenerate}
              className="w-full sm:w-auto"
            >
              View Existing Document
            </Button>
            <Button 
              onClick={handleConfirmRegenerate}
              className="w-full sm:w-auto"
            >
              Regenerate {documentType === 'resume' ? 'Resume' : 'Cover Letter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}