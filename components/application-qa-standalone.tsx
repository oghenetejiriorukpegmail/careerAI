'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  MessageCircle, 
  AlertCircle, 
  CheckCircle, 
  Lightbulb,
  History,
  HelpCircle,
  Sparkles
} from 'lucide-react';

interface ApplicationQAStandaloneProps {
  jobDescriptionId: string;
  resumeId?: string;
  coverLetterId?: string;
  className?: string;
}

interface QAResponse {
  answer: string;
  confidenceScore: number;
  keyPointsUsed: string[];
  suggestedFollowUp?: string;
}

interface QAHistoryItem {
  id: string;
  question: string;
  answer: string;
  confidence_score: number;
  created_at: string;
  metadata?: {
    keyPointsUsed?: string[];
    suggestedFollowUp?: string;
  };
}

export function ApplicationQAStandalone({ 
  jobDescriptionId, 
  resumeId, 
  coverLetterId,
  className 
}: ApplicationQAStandaloneProps) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<QAResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<QAHistoryItem[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('ask');

  // Fetch Q&A history on mount
  useEffect(() => {
    fetchHistory();
    // You could also fetch suggested questions here
  }, [jobDescriptionId]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`/api/application-qa?jobDescriptionId=${jobDescriptionId}`);
      if (!response.ok) throw new Error('Failed to fetch history');
      
      const data = await response.json();
      if (data.success && data.history) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error('Error fetching Q&A history:', error);
    }
  };

  const handleSubmit = async () => {
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/application-qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          jobDescriptionId,
          resumeId,
          coverLetterId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate response');
      }

      if (data.success && data.response) {
        setResponse(data.response);
        // Refresh history to include the new Q&A
        fetchHistory();
        // Clear the question field
        setQuestion('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) return 'High Confidence';
    if (score >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  const commonQuestions = [
    "Why are you interested in this position?",
    "What makes you a good fit for this role?",
    "Tell me about your relevant experience.",
    "How do your skills align with our requirements?",
    "What are your salary expectations?",
    "When can you start?",
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Application Q&A Assistant
        </CardTitle>
        <CardDescription>
          Get help answering job application questions based on your resume and the job description
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ask">Ask Question</TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="ask" className="space-y-4">
            <div className="space-y-3">
              <Textarea
                placeholder="Type your interview or application question here..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                rows={3}
                className="min-h-[100px]"
              />
              
              <Button 
                onClick={handleSubmit} 
                disabled={isLoading || !question.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Response...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Response
                  </>
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {response && (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Generated Response</CardTitle>
                      <Badge className={getConfidenceColor(response.confidenceScore)}>
                        {getConfidenceLabel(response.confidenceScore)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap">{response.answer}</p>
                    </div>

                    {response.keyPointsUsed.length > 0 && (
                      <div className="pt-3 border-t">
                        <p className="text-sm font-medium mb-2 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Key Points Used:
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {response.keyPointsUsed.map((point, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-muted-foreground mt-0.5">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {response.suggestedFollowUp && (
                      <Alert className="bg-blue-50 border-blue-200">
                        <Lightbulb className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-900">
                          <strong>Prepare for this follow-up:</strong> {response.suggestedFollowUp}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="pt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Confidence Score</span>
                        <span className="text-sm font-medium">
                          {Math.round(response.confidenceScore * 100)}%
                        </span>
                      </div>
                      <Progress value={response.confidenceScore * 100} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Click on any question below to get a tailored response:
              </p>
              {commonQuestions.map((q, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 px-4"
                  onClick={() => {
                    setQuestion(q);
                    setActiveTab('ask');
                  }}
                >
                  <HelpCircle className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground" />
                  <span className="line-clamp-2">{q}</span>
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No Q&A history yet</p>
                <p className="text-sm mt-1">Your questions and responses will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <Card key={item.id} className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setQuestion(item.question);
                      setResponse({
                        answer: item.answer,
                        confidenceScore: item.confidence_score,
                        keyPointsUsed: item.metadata?.keyPointsUsed || [],
                        suggestedFollowUp: item.metadata?.suggestedFollowUp
                      });
                      setActiveTab('ask');
                    }}
                  >
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm line-clamp-2">{item.question}</p>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {new Date(item.created_at).toLocaleDateString()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.answer}
                        </p>
                        <div className="flex items-center gap-2">
                          <Progress value={item.confidence_score * 100} className="h-1 flex-1" />
                          <span className="text-xs text-muted-foreground">
                            {Math.round(item.confidence_score * 100)}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}