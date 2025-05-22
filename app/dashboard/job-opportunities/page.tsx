"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  Building2, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  Plus, 
  FileText, 
  Loader,
  Briefcase,
  DollarSign,
  Clock,
  Target
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

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
};

export default function JobOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<JobOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchJobOpportunities();
  }, []);

  const fetchJobOpportunities = async () => {
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
            // No user found, redirect to create first job opportunity
            router.push("/dashboard/job-description/new");
            return;
          }
          userId = sessionUserId;
        }
      } catch {
        const sessionUserId = localStorage.getItem('sessionUserId');
        if (!sessionUserId) {
          router.push("/dashboard/job-description/new");
          return;
        }
        userId = sessionUserId;
      }

      const { data, error } = await supabase
        .from("job_descriptions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching job opportunities:", error);
        throw error;
      }

      setOpportunities(data || []);
    } catch (error) {
      console.error("Failed to fetch job opportunities:", error);
      toast({
        title: "Error",
        description: "Failed to load job opportunities",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOpportunity = async (id: string) => {
    try {
      const { error } = await supabase
        .from("job_descriptions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setOpportunities(opportunities.filter(opp => opp.id !== id));
      toast({
        title: "Success",
        description: "Job opportunity deleted successfully"
      });
    } catch (error) {
      console.error("Failed to delete job opportunity:", error);
      toast({
        title: "Error",
        description: "Failed to delete job opportunity",
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
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesStatus = filterStatus === "all" || opp.processing_status === filterStatus;
    const matchesSearch = searchTerm === "" || 
      opp.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const sortedOpportunities = [...filteredOpportunities].sort((a, b) => {
    switch (sortBy) {
      case "job_title":
        return a.job_title.localeCompare(b.job_title);
      case "company_name":
        return a.company_name.localeCompare(b.company_name);
      case "match_score":
        return (b.match_score || 0) - (a.match_score || 0);
      case "created_at":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Opportunities</h1>
          <p className="text-muted-foreground">
            Manage your job applications and generate tailored documents
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/job-description/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Job Opportunity
        </Button>
      </div>

      {opportunities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-60 text-center p-6">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Job Opportunities Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start by adding your first job opportunity to generate tailored resumes and cover letters
            </p>
            <Button onClick={() => router.push("/dashboard/job-description/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Job Opportunity
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search jobs or companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="sm:max-w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Processing</SelectItem>
                <SelectItem value="completed">Ready</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="sm:max-w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Date Added</SelectItem>
                <SelectItem value="job_title">Job Title</SelectItem>
                <SelectItem value="company_name">Company</SelectItem>
                <SelectItem value="match_score">Match Score</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Job Opportunities Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedOpportunities.map((opportunity) => (
              <Card key={opportunity.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <CardTitle className="text-lg line-clamp-2">
                        {opportunity.job_title}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{opportunity.company_name}</span>
                      </div>
                    </div>
                    {getStatusBadge(opportunity.processing_status)}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{opportunity.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>Added {formatDate(opportunity.created_at)}</span>
                    </div>
                    {opportunity.employment_type && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span>{opportunity.employment_type}</span>
                      </div>
                    )}
                    {opportunity.salary_range && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-4 w-4 flex-shrink-0" />
                        <span>{opportunity.salary_range}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    {getInputMethodBadge(opportunity.input_method)}
                    {opportunity.match_score && (
                      <div className="text-xs text-muted-foreground">
                        Match: {Math.round(opportunity.match_score)}%
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => router.push(`/dashboard/job-opportunities/${opportunity.id}`)}
                    >
                      View Details
                    </Button>
                    {opportunity.url && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(opportunity.url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}