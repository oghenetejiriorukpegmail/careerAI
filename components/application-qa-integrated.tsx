'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Save, Sparkles, Edit2, Check, X, Copy, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { commonApplicationQuestions, detectQuestionCategory } from '@/lib/constants/application-questions';

interface Question {
  question: string;
  answer: string;
  category: string;
}

interface ApplicationQAIntegratedProps {
  applicationId: string;
}

export default function ApplicationQAIntegrated({ applicationId }: ApplicationQAIntegratedProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedAnswer, setEditedAnswer] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchQuestions();
  }, [applicationId]);

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`/api/applications/${applicationId}/questions`);
      
      if (response.status === 404) {
        console.log('Application not found:', applicationId);
        // Don't show error for 404, just keep questions empty
        setQuestions([]);
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch questions');
      }
      
      const data = await response.json();
      setQuestions(data.questions || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load questions',
        variant: 'destructive'
      });
    }
  };

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    
    const category = detectQuestionCategory(newQuestion);
    setQuestions([...questions, { question: newQuestion, answer: '', category }]);
    setNewQuestion('');
  };

  const generateAnswers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/applications/${applicationId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions })
      });

      if (!response.ok) throw new Error('Failed to generate answers');
      
      const data = await response.json();
      setQuestions(data.questions);
      
      toast({
        title: 'Success',
        description: 'Answers generated successfully'
      });
    } catch (error) {
      console.error('Error generating answers:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate answers',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditedAnswer(questions[index].answer);
  };

  const saveEdit = async () => {
    if (editingIndex === null) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/applications/${applicationId}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIndex: editingIndex,
          answer: editedAnswer
        })
      });

      if (!response.ok) throw new Error('Failed to update answer');
      
      const data = await response.json();
      setQuestions(data.questions);
      setEditingIndex(null);
      
      toast({
        title: 'Success',
        description: 'Answer updated successfully'
      });
    } catch (error) {
      console.error('Error updating answer:', error);
      toast({
        title: 'Error',
        description: 'Failed to update answer',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditedAnswer('');
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const copyAnswer = async (answer: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(answer);
        toast({
          title: 'Copied',
          description: 'Answer copied to clipboard'
        });
      } else {
        // Fallback for older browsers or insecure contexts
        const textArea = document.createElement('textarea');
        textArea.value = answer;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast({
          title: 'Copied',
          description: 'Answer copied to clipboard'
        });
      }
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: 'Copy Failed',
        description: 'Unable to copy to clipboard. Please copy manually.',
        variant: 'destructive'
      });
    }
  };

  const exportQuestions = () => {
    const content = questions.map(q => `Q: ${q.question}\nA: ${q.answer}\n`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `application-questions-${applicationId}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const questionsByCategory = questions.reduce((acc, q, index) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push({ ...q, index });
    return acc;
  }, {} as Record<string, Array<Question & { index: number }>>);

  const categoryLabels: Record<string, string> = {
    experience: 'Experience',
    skills: 'Skills',
    behavioral: 'Behavioral',
    company: 'Company Specific',
    other: 'Other'
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Application Questions</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportQuestions}
              disabled={questions.length === 0}
            >
              <FileText className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={generateAnswers}
              disabled={loading || questions.length === 0 || questions.every(q => q.answer)}
              size="sm"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Answers
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add Question Section */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add a custom question..."
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addQuestion()}
            />
            <Button onClick={addQuestion} variant="secondary">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Quick Add Common Questions */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Quick add common questions:</Label>
            <div className="flex flex-wrap gap-2">
              {commonApplicationQuestions.slice(0, 5).map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!questions.find(eq => eq.question === q.question)) {
                      setQuestions([...questions, { 
                        question: q.question, 
                        answer: '', 
                        category: q.category 
                      }]);
                    }
                  }}
                  disabled={questions.find(eq => eq.question === q.question) !== undefined}
                >
                  {q.question.substring(0, 30)}...
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Questions by Category */}
        {questions.length > 0 ? (
          <Tabs defaultValue={Object.keys(questionsByCategory)[0]} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              {Object.entries(questionsByCategory).map(([category, items]) => (
                <TabsTrigger key={category} value={category}>
                  {categoryLabels[category]} ({items.length})
                </TabsTrigger>
              ))}
            </TabsList>
            
            {Object.entries(questionsByCategory).map(([category, items]) => (
              <TabsContent key={category} value={category} className="space-y-4">
                {items.map(({ question, answer, index }) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">{question}</p>
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {editingIndex === index ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedAnswer}
                          onChange={(e) => setEditedAnswer(e.target.value)}
                          rows={3}
                          className="w-full"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdit} disabled={saving}>
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {answer ? (
                          <>
                            <p className="text-sm text-muted-foreground">{answer}</p>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditing(index)}
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyAnswer(answer)}
                              >
                                <Copy className="h-4 w-4 mr-1" />
                                Copy
                              </Button>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            No answer yet. Click "Generate Answers" to create one.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No questions added yet.</p>
            <p className="text-sm mt-2">Add questions manually or use the quick add buttons above.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}