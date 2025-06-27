'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  MessageSquare,
  Target,
  Briefcase,
  Users,
  TrendingUp,
  Code,
  Brain,
  Plus,
  Play,
  RefreshCw,
  BookOpen,
  ChevronRight
} from 'lucide-react';

interface InterviewTopic {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  sampleQuestions: string[];
}

const predefinedTopics: InterviewTopic[] = [
  {
    id: 'behavioral',
    name: 'Behavioral Questions',
    icon: <Users className="w-5 h-5" />,
    description: 'STAR method questions about past experiences',
    sampleQuestions: [
      'Tell me about a time you overcame a challenge',
      'Describe a situation where you showed leadership',
      'How do you handle conflict with teammates?'
    ]
  },
  {
    id: 'technical',
    name: 'Technical Skills',
    icon: <Code className="w-5 h-5" />,
    description: 'Questions about your technical expertise',
    sampleQuestions: [
      'Explain your experience with [specific technology]',
      'How would you approach debugging a complex issue?',
      'Describe a technical project you\'re proud of'
    ]
  },
  {
    id: 'situational',
    name: 'Situational Questions',
    icon: <Brain className="w-5 h-5" />,
    description: 'Hypothetical scenarios and problem-solving',
    sampleQuestions: [
      'How would you handle a tight deadline?',
      'What would you do if you disagreed with your manager?',
      'How would you prioritize multiple urgent tasks?'
    ]
  },
  {
    id: 'company-fit',
    name: 'Company & Culture Fit',
    icon: <Target className="w-5 h-5" />,
    description: 'Questions about alignment with company values',
    sampleQuestions: [
      'Why do you want to work here?',
      'What attracts you to our company culture?',
      'How do you see yourself contributing to our mission?'
    ]
  },
  {
    id: 'career',
    name: 'Career Goals',
    icon: <TrendingUp className="w-5 h-5" />,
    description: 'Questions about your career trajectory',
    sampleQuestions: [
      'Where do you see yourself in 5 years?',
      'What are your long-term career goals?',
      'Why are you leaving your current position?'
    ]
  },
  {
    id: 'role-specific',
    name: 'Role-Specific',
    icon: <Briefcase className="w-5 h-5" />,
    description: 'Questions specific to the job position',
    sampleQuestions: [
      'What experience do you have in this industry?',
      'How would you approach the key responsibilities?',
      'What makes you the ideal candidate for this role?'
    ]
  }
];

export default function InterviewPrepPage() {
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['behavioral']);
  const [customTopic, setCustomTopic] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionTranscript, setSessionTranscript] = useState<Array<{question: string, answer: string, feedback: string}>>([]);
  const { toast } = useToast();

  const handleTopicToggle = (topicId: string) => {
    setSelectedTopics(prev =>
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleAddCustomTopic = () => {
    if (customTopic.trim()) {
      const customId = `custom-${Date.now()}`;
      setSelectedTopics(prev => [...prev, customId]);
      toast({
        title: 'Custom topic added',
        description: customTopic,
      });
      setCustomTopic('');
    }
  };

  const startPracticeSession = async () => {
    if (selectedTopics.length === 0) {
      toast({
        title: 'Select topics',
        description: 'Please select at least one topic to practice',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/interview-prep/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics: selectedTopics,
          jobDescription,
          companyName,
          role
        })
      });

      if (!response.ok) throw new Error('Failed to start session');
      
      const data = await response.json();
      setCurrentQuestion(data.question);
      setSessionActive(true);
      setUserAnswer('');
      setFeedback('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start practice session',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim()) {
      toast({
        title: 'Provide an answer',
        description: 'Please provide your answer before submitting',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/interview-prep/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion,
          answer: userAnswer,
          context: { jobDescription, companyName, role }
        })
      });

      if (!response.ok) throw new Error('Failed to evaluate answer');
      
      const data = await response.json();
      setFeedback(data.feedback);
      
      // Add to transcript
      if (data.feedback) {
        setSessionTranscript(prev => [...prev, {
          question: currentQuestion,
          answer: userAnswer,
          feedback: data.feedback
        }]);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to evaluate answer',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSession = async () => {
    if (sessionTranscript.length === 0) {
      toast({
        title: 'No session to save',
        description: 'Complete at least one question before saving',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch('/api/interview-prep/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: sessionTranscript,
          topics: selectedTopics,
          context: { jobDescription, companyName, role }
        })
      });

      if (!response.ok) throw new Error('Failed to save session');
      
      toast({
        title: 'Session saved',
        description: 'Your practice session has been saved to history',
      });
      
      // Reset session
      setSessionActive(false);
      setSessionTranscript([]);
      setCurrentQuestion('');
      setUserAnswer('');
      setFeedback('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save session',
        variant: 'destructive'
      });
    }
  };

  const nextQuestion = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/interview-prep/next-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics: selectedTopics,
          previousQuestion: currentQuestion,
          context: { jobDescription, companyName, role }
        })
      });

      if (!response.ok) throw new Error('Failed to get next question');
      
      const data = await response.json();
      setCurrentQuestion(data.question);
      setUserAnswer('');
      setFeedback('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get next question',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Interview Preparation</h1>
        <p className="text-muted-foreground">
          Practice common interview questions and get AI-powered feedback to improve your responses
        </p>
      </div>

      {!sessionActive ? (
        <div className="space-y-6">
          {/* Context Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Interview Context (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="company">Company Name</Label>
                  <Input
                    id="company"
                    placeholder="e.g., Google"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role/Position</Label>
                  <Input
                    id="role"
                    placeholder="e.g., Senior Software Engineer"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="jd">Job Description</Label>
                  <Textarea
                    id="jd"
                    placeholder="Paste job description for tailored questions..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Topic Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Select Practice Topics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {predefinedTopics.map((topic) => (
                  <Card
                    key={topic.id}
                    className={`cursor-pointer transition-all ${
                      selectedTopics.includes(topic.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => handleTopicToggle(topic.id)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {topic.icon}
                          {topic.name}
                        </div>
                        {selectedTopics.includes(topic.id) && (
                          <Badge variant="default" className="ml-2">
                            Selected
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        {topic.description}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        Example: {topic.sampleQuestions[0]}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Custom Topic */}
              <div className="mt-6 flex gap-2">
                <Input
                  placeholder="Add a custom topic (e.g., 'System Design', 'Product Management')"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomTopic()}
                />
                <Button onClick={handleAddCustomTopic} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Start Session */}
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={startPracticeSession}
              disabled={loading || selectedTopics.length === 0}
              className="gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Start Practice Session
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Practice Session */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Interview Question
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSessionActive(false)}
                  >
                    End Session
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={saveSession}
                    disabled={sessionTranscript.length === 0}
                  >
                    Save & End Session
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-lg font-medium">{currentQuestion}</p>
              </div>

              {sessionTranscript.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Questions answered in this session: {sessionTranscript.length}
                </div>
              )}

              <div>
                <Label htmlFor="answer">Your Answer</Label>
                <Textarea
                  id="answer"
                  placeholder="Type your answer here..."
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="min-h-[200px] mt-2"
                />
              </div>

              {feedback && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      AI Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap">{feedback}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={submitAnswer}
                  disabled={loading || !userAnswer.trim() || !!feedback}
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Get Feedback
                </Button>
                <Button
                  onClick={nextQuestion}
                  disabled={loading}
                  className="gap-2"
                >
                  Next Question
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}