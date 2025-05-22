"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { FileDown, FileText, ExternalLink } from "lucide-react";

type Application = {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
  status: string;
  applied_date: string | null;
  created_at: string;
  resume_id: string | null;
  cover_letter_id: string | null;
  job_url: string | null;
};

type GeneratedDocument = {
  id: string;
  doc_type: string;
  file_name: string;
  file_path: string;
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [documents, setDocuments] = useState<Record<string, GeneratedDocument[]>>({});
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData && userData.user) {
          // Use the new applications API
          const response = await fetch(`/api/applications?userId=${userData.user.id}`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch applications');
          }
          
          const { applications: appData } = await response.json();
          
          // Transform the data for easier use in the UI
          const transformedData = (appData || []).map((app: any) => ({
            id: app.id,
            job_title: app.job_descriptions?.job_title || "Unknown Position",
            company_name: app.job_descriptions?.company_name || "Unknown Company",
            location: app.job_descriptions?.location || "Unknown Location",
            status: app.status,
            applied_date: app.applied_date,
            created_at: app.created_at,
            resume_id: app.resume?.id || null,
            cover_letter_id: app.cover_letter?.id || null,
            job_url: app.job_descriptions?.url || null,
          }));
          
          setApplications(transformedData);
          
          // Process documents from the API response
          const docsByApp: Record<string, GeneratedDocument[]> = {};
          
          appData?.forEach((app: any) => {
            docsByApp[app.id] = [];
            
            if (app.resume) {
              docsByApp[app.id].push({
                id: app.resume.id,
                doc_type: 'resume',
                file_name: app.resume.file_name,
                file_path: app.resume.file_path
              });
            }
            
            if (app.cover_letter) {
              docsByApp[app.id].push({
                id: app.cover_letter.id,
                doc_type: 'cover_letter', 
                file_name: app.cover_letter.file_name,
                file_path: app.cover_letter.file_path
              });
            }
          });
          
          setDocuments(docsByApp);
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load applications",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [toast]);

  const updateApplicationStatus = async (id: string, status: string) => {
    try {
      setStatusUpdating(id);
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('User not authenticated');
      }
      
      const updates: any = {
        applicationId: id,
        userId: userData.user.id,
        status,
      };
      
      // If status is 'applied', set applied_date to now
      if (status === 'applied' && applications.find(app => app.id === id)?.status !== 'applied') {
        updates.applied_date = new Date().toISOString();
      }
      
      const response = await fetch('/api/applications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }
      
      // Update local state
      setApplications(apps => 
        apps.map(app => 
          app.id === id 
            ? { ...app, status, applied_date: updates.applied_date || app.applied_date } 
            : app
        )
      );
      
      toast({
        title: "Status Updated",
        description: `Application status changed to ${status.replace('_', ' ')}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setStatusUpdating(null);
    }
  };

  const downloadDocument = (document: GeneratedDocument) => {
    // In a real implementation, this would get the file from Supabase Storage
    toast({
      title: "Download Started",
      description: `Downloading ${document.file_name}`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'to_apply':
        return 'bg-blue-100 text-blue-800';
      case 'applied':
        return 'bg-yellow-100 text-yellow-800';
      case 'interviewing':
        return 'bg-purple-100 text-purple-800';
      case 'offered':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Job Applications</h1>
        <p className="text-muted-foreground">
          Track the status of your job applications
        </p>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-60 text-center p-6">
            <h3 className="text-xl font-semibold mb-2">No Applications Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start by creating a tailored resume for a job posting
            </p>
            <Button onClick={() => router.push("/dashboard/job-matching")}>
              Find Jobs
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {applications.map((application) => (
            <Card key={application.id}>
              <div className="md:flex">
                <div className="flex-1">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{application.job_title}</CardTitle>
                        <CardDescription className="mt-1">
                          {application.company_name} • {application.location}
                        </CardDescription>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusColor(application.status)}`}>
                        {application.status.replace('_', ' ')}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">Created:</span>{" "}
                          {new Date(application.created_at).toLocaleDateString()}
                        </div>
                        {application.applied_date && (
                          <div className="text-sm">
                            <span className="font-medium">Applied:</span>{" "}
                            {new Date(application.applied_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {documents[application.id]?.map((doc) => (
                          <Button
                            key={doc.id}
                            variant="outline"
                            size="sm"
                            className="flex items-center"
                            onClick={() => downloadDocument(doc)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            {doc.doc_type === 'resume' ? 'Resume' : 'Cover Letter'}
                            <FileDown className="h-4 w-4 ml-2" />
                          </Button>
                        ))}
                        
                        {application.job_url && (
                          <a href={application.job_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="flex items-center">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Job
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </div>
                
                <div className="shrink-0 p-6 bg-muted/10 flex flex-col justify-center space-y-3 min-w-[220px]">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Update Status</h3>
                    <Select
                      value={application.status}
                      onValueChange={(value) => updateApplicationStatus(application.id, value)}
                      disabled={statusUpdating === application.id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Update status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="to_apply">To Apply</SelectItem>
                        <SelectItem value="applied">Applied</SelectItem>
                        <SelectItem value="interviewing">Interviewing</SelectItem>
                        <SelectItem value="offered">Offered</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}