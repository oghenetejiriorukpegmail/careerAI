"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Briefcase, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface Resume {
  id: string;
  file_name: string;
  created_at: string;
}

interface JobMatch {
  id: string;
  title: string;
  company: string;
  location: string;
  relevanceScore: number;
  matchReasons: string[];
  missingSkills: string[];
  skillsScore?: number;
  experienceScore?: number;
  educationScore?: number;
  locationScore?: number;
}

interface JobMatchingPanelProps {
  jobDescriptionIds?: string[];
  onMatchComplete?: (matches: JobMatch[]) => void;
}

export function JobMatchingPanel({ jobDescriptionIds, onMatchComplete }: JobMatchingPanelProps) {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string>('');
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Fetch resumes for current user

      const { data, error } = await supabase
        .from('resumes')
        .select('id, file_name, created_at, processing_status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      // Filter completed resumes

      if (error) throw error;

      // Filter for completed resumes if needed
      const completedResumes = (data || []).filter(
        (resume: any) => !resume.processing_status || resume.processing_status === 'completed'
      );
      
      setResumes(completedResumes);
      // Set the first resume as selected if none selected
      if (completedResumes.length > 0 && !selectedResume) {
        setSelectedResume(completedResumes[0].id);
        // Auto-select first resume
      }
    } catch (error) {
      // Error fetching resumes
      toast({
        title: 'Error',
        description: 'Failed to fetch resumes',
        variant: 'destructive',
      });
    }
  };

  const runMatching = async () => {
    if (!selectedResume) {
      toast({
        title: 'No resume selected',
        description: 'Please select a resume to match against',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setError(null);
    setMatches([]);

    try {
      // Start job matching
      
      const response = await fetch('/api/jobs/match-stored', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeId: selectedResume,
          jobDescriptionIds: jobDescriptionIds,
          matchAll: !jobDescriptionIds || jobDescriptionIds.length === 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to match jobs');
      }

      const data = await response.json();
      setMatches(data.matches || []);
      setAiModel(data.aiModel || '');

      toast({
        title: 'Matching complete',
        description: `Found ${data.matches.length} matches out of ${data.totalJobsAnalyzed} jobs`,
      });
      
      // Notify completion

      if (onMatchComplete) {
        onMatchComplete(data.matches);
      }
    } catch (error) {
      // Handle matching error
      setError(error instanceof Error ? error.message : 'Failed to match jobs');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to match jobs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'outline' => {
    if (score >= 80) return 'default';
    if (score >= 70) return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Job Matching</CardTitle>
          <CardDescription>
            Match your resume against stored job descriptions to find the best opportunities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Resume</label>
            <Select value={selectedResume} onValueChange={(value) => {
              // Update selected resume
              setSelectedResume(value);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a resume" />
              </SelectTrigger>
              <SelectContent>
                {resumes.map((resume) => (
                  <SelectItem key={resume.id} value={resume.id}>
                    {resume.file_name} (ID: {resume.id.substring(0, 8)}...)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {resumes.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <p>No resumes found. Please upload a resume first.</p>
            </div>
          )}

          <Button
            onClick={runMatching}
            disabled={loading || !selectedResume}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Matching Jobs...
              </>
            ) : (
              <>
                <Briefcase className="mr-2 h-4 w-4" />
                Run Job Matching
              </>
            )}
          </Button>

          {aiModel && (
            <p className="text-xs text-muted-foreground text-center">
              Using AI model: {aiModel}
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {matches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Match Results</CardTitle>
            <CardDescription>
              Found {matches.length} matching job opportunities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {matches.map((match, index) => (
              <Card key={match.id || index} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-semibold">{match.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {match.company} • {match.location}
                      </p>
                    </div>
                    <Badge
                      variant={getScoreBadgeVariant(match.relevanceScore)}
                      className={getScoreColor(match.relevanceScore)}
                    >
                      {match.relevanceScore}% Match
                    </Badge>
                  </div>

                  {/* Score Breakdown */}
                  {(match.skillsScore !== undefined || 
                    match.experienceScore !== undefined ||
                    match.educationScore !== undefined ||
                    match.locationScore !== undefined) && (
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {match.skillsScore !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Skills:</span>
                          <Progress value={match.skillsScore} className="h-1 mt-1" />
                        </div>
                      )}
                      {match.experienceScore !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Experience:</span>
                          <Progress value={match.experienceScore} className="h-1 mt-1" />
                        </div>
                      )}
                      {match.educationScore !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Education:</span>
                          <Progress value={match.educationScore} className="h-1 mt-1" />
                        </div>
                      )}
                      {match.locationScore !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Location:</span>
                          <Progress value={match.locationScore} className="h-1 mt-1" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Match Reasons */}
                  {match.matchReasons.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                        Why this is a good match:
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-5">
                        {match.matchReasons.map((reason, idx) => (
                          <li key={idx} className="list-disc">
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Missing Skills */}
                  {match.missingSkills.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium flex items-center">
                        <XCircle className="h-4 w-4 mr-1 text-orange-600" />
                        Skills to develop:
                      </p>
                      <div className="flex flex-wrap gap-1 ml-5">
                        {match.missingSkills.map((skill, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}