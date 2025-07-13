"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { FileDown, FileText, ExternalLink, Eye, MessageSquare, ChevronDown, ChevronUp, Search, Filter, SortAsc, X } from "lucide-react";
import ApplicationQAIntegrated from "@/components/application-qa-integrated";

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
  const [expandedApplication, setExpandedApplication] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search on Ctrl/Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
      // Clear search on Escape
      if (e.key === 'Escape' && searchTerm) {
        setSearchTerm("");
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchTerm]);
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
          
          console.log('Fetched applications:', transformedData.map((app: any) => ({ id: app.id, company: app.company_name })));
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

  const downloadDocument = async (doc: GeneratedDocument) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('User not authenticated');
      }

      // Try to download directly from Supabase Storage
      const { data, error } = await supabase.storage
        .from('user_files')
        .download(doc.file_path);
      
      if (error) {
        console.error('Storage download error:', error);
        
        // Fallback to API endpoint if direct download fails
        const response = await fetch(`/api/documents/${doc.id}/download`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to download document');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.file_name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Create blob URL and trigger download
        const blob = new Blob([data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.file_name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      toast({
        title: "Download Complete",
        description: `Downloaded ${doc.file_name}`,
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download document. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const viewDocument = async (doc: GeneratedDocument) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('User not authenticated');
      }

      // Get signed URL for viewing
      const { data: urlData, error: urlError } = await supabase.storage
        .from('user_files')
        .createSignedUrl(doc.file_path, 3600); // 1 hour expiry

      if (urlError || !urlData?.signedUrl) {
        console.error('Signed URL error:', urlError);
        
        // Fallback: Use view API endpoint
        const viewUrl = `/api/documents/${doc.id}/view`;
        const newWindow = window.open(viewUrl, '_blank');
        
        if (!newWindow) {
          throw new Error('Pop-up blocked. Please allow pop-ups for this site.');
        }
      } else {
        // Open signed URL in new tab
        const newWindow = window.open(urlData.signedUrl, '_blank');
        if (!newWindow) {
          throw new Error('Pop-up blocked. Please allow pop-ups for this site.');
        }
      }

      toast({
        title: "Document Opened",
        description: `Viewing ${doc.file_name}`,
      });
    } catch (error: any) {
      console.error('View error:', error);
      toast({
        title: "View Failed",
        description: error.message || "Failed to view document. Try downloading instead.",
        variant: "destructive",
      });
    }
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

  // Filter and sort applications
  const filteredApplications = applications.filter(app => {
    const matchesStatus = filterStatus === "all" || app.status === filterStatus;
    
    if (searchTerm === "") return matchesStatus;
    
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch = 
      app.job_title.toLowerCase().includes(searchTermLower) ||
      app.company_name.toLowerCase().includes(searchTermLower) ||
      app.location.toLowerCase().includes(searchTermLower) ||
      app.status.toLowerCase().replace('_', ' ').includes(searchTermLower) ||
      // Also search by date strings
      (app.applied_date && new Date(app.applied_date).toLocaleDateString().includes(searchTermLower)) ||
      new Date(app.created_at).toLocaleDateString().includes(searchTermLower);
    
    return matchesStatus && matchesSearch;
  });

  const sortedApplications = [...filteredApplications].sort((a, b) => {
    switch (sortBy) {
      case "job_title":
        return a.job_title.localeCompare(b.job_title);
      case "company_name":
        return a.company_name.localeCompare(b.company_name);
      case "status":
        return a.status.localeCompare(b.status);
      case "applied_date":
        const dateA = a.applied_date ? new Date(a.applied_date).getTime() : 0;
        const dateB = b.applied_date ? new Date(b.applied_date).getTime() : 0;
        return dateB - dateA;
      case "created_at":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Applications</h1>
          <p className="text-muted-foreground">
            Track the status of your job applications
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {sortedApplications.length} of {applications.length} applications
          {(searchTerm || filterStatus !== "all") && (
            <span className="ml-2 text-xs bg-muted px-2 py-1 rounded">
              {searchTerm && `"${searchTerm}"`}
              {searchTerm && filterStatus !== "all" && " • "}
              {filterStatus !== "all" && `${filterStatus.replace('_', ' ')}`}
            </span>
          )}
        </div>
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
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by job title, company, or location... (Ctrl+K)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="sm:max-w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="to_apply">To Apply</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="interviewing">Interviewing</SelectItem>
                <SelectItem value="offered">Offered</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="sm:max-w-[180px]">
                <SortAsc className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Date Created</SelectItem>
                <SelectItem value="applied_date">Date Applied</SelectItem>
                <SelectItem value="job_title">Job Title</SelectItem>
                <SelectItem value="company_name">Company</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Applications List */}
          {sortedApplications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-40 text-center p-6">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No applications found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || filterStatus !== "all" 
                    ? "Try adjusting your search or filters" 
                    : "No applications match your criteria"}
                </p>
                {(searchTerm || filterStatus !== "all") && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm("");
                      setFilterStatus("all");
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {sortedApplications.map((application) => (
            <Card key={application.id}>
              <div className="flex flex-col sm:flex-row">
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
                          <div key={doc.id} className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center"
                              onClick={() => viewDocument(doc)}
                              title={`View ${doc.doc_type === 'resume' ? 'Resume' : 'Cover Letter'}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {doc.doc_type === 'resume' ? 'Resume' : 'Cover Letter'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center px-2"
                              onClick={() => downloadDocument(doc)}
                              title={`Download ${doc.doc_type === 'resume' ? 'Resume' : 'Cover Letter'}`}
                            >
                              <FileDown className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        
                        {application.job_url && (
                          <a href={application.job_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="flex items-center">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Job
                            </Button>
                          </a>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center"
                          onClick={() => setExpandedApplication(
                            expandedApplication === application.id ? null : application.id
                          )}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Q&A
                          {expandedApplication === application.id ? (
                            <ChevronUp className="h-4 w-4 ml-1" />
                          ) : (
                            <ChevronDown className="h-4 w-4 ml-1" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </div>
                
                <div className="shrink-0 p-4 sm:p-6 bg-muted/10 flex flex-col justify-center space-y-3 sm:min-w-[220px]">
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
              
              {/* Q&A Section */}
              {expandedApplication === application.id && (
                <div className="border-t bg-muted/10 p-6">
                  <ApplicationQAIntegrated applicationId={application.id} />
                </div>
              )}
            </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}