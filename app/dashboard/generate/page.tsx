"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { FileText, Loader, CheckCircle2 } from "lucide-react";

type Resume = {
  id: string;
  file_name: string;
  created_at: string;
};

type JobDescription = {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
  created_at: string;
};

export default function GenerateDocumentsPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
  const [selectedResume, setSelectedResume] = useState<string>("");
  const [selectedJobDescription, setSelectedJobDescription] = useState<string>("");
  const [generateResume, setGenerateResume] = useState(true);
  const [generateCoverLetter, setGenerateCoverLetter] = useState(true);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  // Get pre-selected job description from URL if available
  const jobDescId = searchParams?.get("job_desc_id");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData && userData.user) {
          // Fetch user's resumes
          const { data: resumeData, error: resumeError } = await supabase
            .from("resumes")
            .select("id, file_name, created_at")
            .eq("user_id", userData.user.id)
            .order("created_at", { ascending: false });
            
          if (resumeError) throw resumeError;
          setResumes(resumeData || []);
          
          // If we have resumes, select the most recent one by default
          if (resumeData && resumeData.length > 0) {
            setSelectedResume(resumeData[0].id);
          }
          
          // Fetch user's job descriptions
          const { data: jobData, error: jobError } = await supabase
            .from("job_descriptions")
            .select("id, job_title, company_name, location, created_at")
            .eq("user_id", userData.user.id)
            .order("created_at", { ascending: false });
            
          if (jobError) throw jobError;
          setJobDescriptions(jobData || []);
          
          // If job_desc_id parameter is provided, select it
          if (jobDescId && jobData?.find((job: any) => job.id === jobDescId)) {
            setSelectedJobDescription(jobDescId);
          }
          // Otherwise select the most recent one if available
          else if (jobData && jobData.length > 0) {
            setSelectedJobDescription(jobData[0].id);
          }
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load user data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [jobDescId, toast]);

  const handleGenerate = async () => {
    if (!selectedResume || !selectedJobDescription) {
      toast({
        title: "Missing Information",
        description: "Please select a resume and job description to continue",
        variant: "destructive",
      });
      return;
    }
    
    if (!generateResume && !generateCoverLetter) {
      toast({
        title: "Missing Selection",
        description: "Please select at least one document to generate",
        variant: "destructive",
      });
      return;
    }

    try {
      setGenerating(true);
      
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("User not found");
      
      // Get job description details for file naming
      const { data: jobData, error: jobError } = await supabase
        .from("job_descriptions")
        .select("company_name, job_title")
        .eq("id", selectedJobDescription)
        .single();
        
      if (jobError) throw jobError;
      
      // Get user's full name for file naming
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userData.user.id)
        .single();
        
      if (profileError) throw profileError;
      
      const companyName = jobData?.company_name || "Company";
      const userName = profileData?.full_name || "User";
      
      // In a real implementation, we would now call the AI service to generate the documents
      // and store them in Supabase Storage
      
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Record generated documents in the database (in a real implementation these would point to actual files)
      if (generateResume) {
        const resumeFileName = `${companyName.replace(/\s+/g, '_')}_${userName.replace(/\s+/g, '_')}_Resume.pdf`;
        await supabase
          .from("generated_documents")
          .insert({
            user_id: userData.user.id,
            job_description_id: selectedJobDescription,
            doc_type: "resume",
            file_name: resumeFileName,
            file_path: `generated/${userData.user.id}/${resumeFileName}`,
          });
      }
      
      if (generateCoverLetter) {
        const coverLetterFileName = `${companyName.replace(/\s+/g, '_')}_${userName.replace(/\s+/g, '_')}_CoverLetter.pdf`;
        await supabase
          .from("generated_documents")
          .insert({
            user_id: userData.user.id,
            job_description_id: selectedJobDescription,
            doc_type: "cover_letter",
            file_name: coverLetterFileName,
            file_path: `generated/${userData.user.id}/${coverLetterFileName}`,
          });
      }
      
      // Create a job application entry
      await supabase
        .from("job_applications")
        .insert({
          user_id: userData.user.id,
          job_description_id: selectedJobDescription,
          status: "to_apply",
        });
      
      setGenerationComplete(true);
      setGenerating(false);
      
    } catch (error: any) {
      setGenerating(false);
      toast({
        title: "Error",
        description: error.message || "Failed to generate documents",
        variant: "destructive",
      });
    }
  };

  const goToApplications = () => {
    router.push("/dashboard/applications");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (generationComplete) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generation Complete</h1>
          <p className="text-muted-foreground">
            Your documents have been successfully generated
          </p>
        </div>

        <Card className="text-center">
          <CardContent className="pt-6 pb-4">
            <div className="mb-4 flex items-center justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Success!</h2>
            <p className="mb-6 text-muted-foreground">
              Your customized documents are ready to download from the applications page.
            </p>
            <div className="flex flex-col space-y-2">
              {generateResume && (
                <div className="flex items-center justify-center space-x-2 p-2 border rounded-md">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>Tailored Resume</span>
                </div>
              )}
              {generateCoverLetter && (
                <div className="flex items-center justify-center space-x-2 p-2 border rounded-md">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>Customized Cover Letter</span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-center pb-6">
            <Button onClick={goToApplications}>
              View in Applications
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Generate Documents</h1>
        <p className="text-muted-foreground">
          Create tailored application documents based on your resume and the job description
        </p>
      </div>

      {resumes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-60 text-center p-6">
            <h3 className="text-xl font-semibold mb-2">No Resume Found</h3>
            <p className="text-muted-foreground mb-6">
              You need to upload a resume before generating tailored documents
            </p>
            <Button onClick={() => router.push("/dashboard/resume/new")}>
              Upload Resume
            </Button>
          </CardContent>
        </Card>
      ) : jobDescriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-60 text-center p-6">
            <h3 className="text-xl font-semibold mb-2">No Job Description Found</h3>
            <p className="text-muted-foreground mb-6">
              You need to add a job description before generating tailored documents
            </p>
            <Button onClick={() => router.push("/dashboard/job-description/new")}>
              Add Job Description
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Generate Application Documents</CardTitle>
            <CardDescription>
              Select your resume and the job description to create tailored documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="resume">Select Resume</Label>
              <Select
                value={selectedResume}
                onValueChange={setSelectedResume}
                disabled={generating}
              >
                <SelectTrigger id="resume">
                  <SelectValue placeholder="Select a resume" />
                </SelectTrigger>
                <SelectContent>
                  {resumes.map((resume) => (
                    <SelectItem key={resume.id} value={resume.id}>
                      {resume.file_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="jobDescription">Select Job Description</Label>
              <Select
                value={selectedJobDescription}
                onValueChange={setSelectedJobDescription}
                disabled={generating}
              >
                <SelectTrigger id="jobDescription">
                  <SelectValue placeholder="Select a job description" />
                </SelectTrigger>
                <SelectContent>
                  {jobDescriptions.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.job_title} at {job.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-4 pt-4">
              <h3 className="font-medium">Documents to Generate</h3>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="generateResume">Tailored Resume</Label>
                  <p className="text-sm text-muted-foreground">
                    Create an ATS-optimized resume for this specific job
                  </p>
                </div>
                <Switch
                  id="generateResume"
                  checked={generateResume}
                  onCheckedChange={setGenerateResume}
                  disabled={generating}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="generateCoverLetter">Cover Letter</Label>
                  <p className="text-sm text-muted-foreground">
                    Create a personalized cover letter for this application
                  </p>
                </div>
                <Switch
                  id="generateCoverLetter"
                  checked={generateCoverLetter}
                  onCheckedChange={setGenerateCoverLetter}
                  disabled={generating}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={generating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || (!generateResume && !generateCoverLetter)}
            >
              {generating ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Documents"
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}