'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { MessageSquare, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface InterviewSession {
  id: string;
  topics: string[];
  context: any;
  transcript: Array<{
    question: string;
    answer: string;
    feedback: string;
  }>;
  created_at: string;
  completed_at: string;
}

export default function InterviewHistoryPage() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSession = (sessionId: string) => {
    setExpandedSession(expandedSession === sessionId ? null : sessionId);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Interview Practice History</h1>
        <p className="text-muted-foreground">
          Review your past interview practice sessions and feedback
        </p>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No practice sessions yet. Start practicing to see your history!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(session.created_at), 'PPP')}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {session.transcript.length} questions answered
                      {session.context?.companyName && ` • ${session.context.companyName}`}
                      {session.context?.role && ` - ${session.context.role}`}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSession(session.id)}
                  >
                    {expandedSession === session.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <div className="flex gap-2 mt-2">
                  {session.topics.map((topic) => (
                    <Badge key={topic} variant="secondary">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              
              {expandedSession === session.id && (
                <CardContent className="space-y-6">
                  {session.transcript.map((item, index) => (
                    <div key={index} className="space-y-3 border-b pb-6 last:border-0">
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 mt-1 text-primary" />
                          <div className="flex-1">
                            <p className="font-medium">Question {index + 1}:</p>
                            <p className="text-muted-foreground">{item.question}</p>
                          </div>
                        </div>
                        
                        <div className="ml-6">
                          <p className="font-medium text-sm mb-1">Your Answer:</p>
                          <p className="text-sm bg-muted p-3 rounded-md">{item.answer}</p>
                        </div>
                        
                        <div className="ml-6">
                          <p className="font-medium text-sm mb-1">AI Feedback:</p>
                          <div className="text-sm bg-primary/5 border border-primary/20 p-3 rounded-md whitespace-pre-wrap">
                            {item.feedback}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}