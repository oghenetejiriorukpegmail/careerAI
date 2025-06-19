"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader, MapPin, Building, Search, ExternalLink } from "lucide-react";

type JobMatch = {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
  job_url: string;
  description: string;
  source: string;
  matched_at: string;
  relevance_score: number;
};

export default function JobMatchingPage() {
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchJobMatches = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData && userData.user) {
          const { data, error } = await supabase
            .from("job_matches")
            .select("*")
            .eq("user_id", userData.user.id)
            .order("matched_at", { ascending: false });
            
          if (error) {
            throw error;
          }
          
          setJobMatches(data || []);
          setFilteredMatches(data || []);
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load job matches",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchJobMatches();
  }, [toast]);

  const handleSearch = () => {
    if (!keywords && !location) {
      setFilteredMatches(jobMatches);
      return;
    }
    
    const filtered = jobMatches.filter(job => {
      const matchesKeywords = !keywords || 
        job.job_title.toLowerCase().includes(keywords.toLowerCase()) || 
        job.company_name.toLowerCase().includes(keywords.toLowerCase()) ||
        job.description.toLowerCase().includes(keywords.toLowerCase());
        
      const matchesLocation = !location || 
        job.location.toLowerCase().includes(location.toLowerCase());
        
      return matchesKeywords && matchesLocation;
    });
    
    setFilteredMatches(filtered);
  };

  const findNewJobs = async () => {
    setSearching(true);
    
    try {
      // In a real implementation, this would trigger the Bright Data MCP service
      // to crawl job boards and find new matches
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simulate finding new jobs
      const newJobs: JobMatch[] = [
        {
          id: "new-1",
          job_title: "Frontend Developer",
          company_name: "Tech Innovations Inc",
          location: "Remote",
          job_url: "https://example.com/job1",
          description: "We're looking for a skilled Frontend Developer...",
          source: "linkedin",
          matched_at: new Date().toISOString(),
          relevance_score: 0.92,
        },
        {
          id: "new-2",
          job_title: "Full Stack Engineer",
          company_name: "Growth Startup",
          location: "New York, NY",
          job_url: "https://example.com/job2",
          description: "Join our team as a Full Stack Engineer...",
          source: "indeed",
          matched_at: new Date().toISOString(),
          relevance_score: 0.87,
        },
      ];
      
      setJobMatches([...newJobs, ...jobMatches]);
      setFilteredMatches([...newJobs, ...filteredMatches]);
      
      toast({
        title: "Success",
        description: `Found ${newJobs.length} new job matches`,
      });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to find new jobs",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const createJobDescription = (job: JobMatch) => {
    // In a real implementation, this would create a job description
    // from the job match data, possibly using the AI service to enrich it
    router.push(`/dashboard/job-description/new?prefill=${job.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading job matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Matches</h1>
          <p className="text-muted-foreground">
            Jobs matched to your profile from major job boards
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/job-matching/stored">
            <Button variant="outline">
              Match Stored Jobs
            </Button>
          </Link>
          <Button onClick={findNewJobs} disabled={searching}>
            {searching ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              "Find New Jobs"
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>
            Narrow down the job matches by keywords and location
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="keywords">Keywords</Label>
              <div className="flex mt-1">
                <Input
                  id="keywords"
                  placeholder="Job title, company, skills..."
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1">
              <Label htmlFor="location">Location</Label>
              <div className="flex mt-1">
                <Input
                  id="location"
                  placeholder="City, state, remote..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch}>
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredMatches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-60 text-center p-6">
            <h3 className="text-xl font-semibold mb-2">No Job Matches Found</h3>
            <p className="text-muted-foreground mb-6">
              We couldn't find any jobs matching your criteria
            </p>
            <Button onClick={findNewJobs} disabled={searching}>
              {searching ? "Searching..." : "Find New Jobs"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredMatches.map((job) => (
            <Card key={job.id} className="overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                <div className="flex-1">
                  <CardHeader>
                    <CardTitle>{job.job_title}</CardTitle>
                    <CardDescription>
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-1" />
                        {job.company_name}
                      </div>
                      <div className="flex items-center mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {job.location}
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {job.description || "No description available"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        {Math.round(job.relevance_score * 100)}% Match
                      </span>
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 capitalize">
                        {job.source || "Job Board"}
                      </span>
                    </div>
                  </CardContent>
                </div>
                <div className="shrink-0 p-4 sm:p-6 flex flex-col justify-center space-y-3 bg-muted/10 sm:min-w-[200px]">
                  <a href={job.job_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Job
                    </Button>
                  </a>
                  <Link href={`/dashboard/generate?job_desc_id=${job.id}`} passHref>
                    <Button className="w-full">Apply Now</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}