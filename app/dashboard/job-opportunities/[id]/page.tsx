"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export default function JobOpportunityDetailPage() {
  const [opportunity, setOpportunity] = useState<JobOpportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [generatingResume, setGeneratingResume] = useState(false);
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
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

      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: jobId,
          sessionId: sessionId,
          userId: sessionId ? null : userId, // Use userId only for authenticated users
        }),
      });

      if (response.ok) {
        // Download the PDF
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'resume.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Success",
          description: "Resume generated and downloaded successfully!"
        });
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

      const response = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: jobId,
          sessionId: sessionId,
          userId: sessionId ? null : userId, // Use userId only for authenticated users
        }),
      });

      if (response.ok) {
        // Download the PDF
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'cover-letter.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Success",
          description: "Cover letter generated and downloaded successfully!"
        });
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
              <Button 
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                onClick={handleGenerateResume}
                disabled={generatingResume}
              >
                {generatingResume ? (
                  <Loader className="h-5 w-5 mr-3 animate-spin" />
                ) : (
                  <FileText className="h-5 w-5 mr-3" />
                )}
                Generate Tailored Resume
              </Button>
              <Button 
                variant="outline" 
                className="w-full h-12 text-base font-semibold border-2 hover:bg-blue-50 dark:hover:bg-blue-950"
                onClick={handleGenerateCoverLetter}
                disabled={generatingCoverLetter}
              >
                {generatingCoverLetter ? (
                  <Loader className="h-5 w-5 mr-3 animate-spin" />
                ) : (
                  <Download className="h-5 w-5 mr-3" />
                )}
                Generate Cover Letter
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
    </div>
  );
}