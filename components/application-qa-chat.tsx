'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, Download, MessageCircle, Sparkles } from 'lucide-react';
import { useSession } from '@/lib/hooks/use-session';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ApplicationQAChatProps {
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  jobDescriptionId?: string;
  applicationId?: string;
  initialContext?: {
    page: string;
    documentType?: string;
  };
  className?: string;
}

export function ApplicationQAChat({
  isOpen = true,
  onClose,
  title = "Career Advisor",
  subtitle = "Ask me anything about your job application",
  jobDescriptionId,
  applicationId,
  initialContext,
  className
}: ApplicationQAChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { session } = useSession();

  // Initialize conversation
  useEffect(() => {
    if (isOpen && !conversationId) {
      initializeConversation();
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const initializeConversation = async () => {
    try {
      const response = await fetch('/api/application-qa-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_conversation',
          jobDescriptionId,
          applicationId,
          context: initialContext
        }),
      });

      const data = await response.json();
      setConversationId(data.conversationId);
      
      // Add welcome message
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: getWelcomeMessage(),
        timestamp: new Date(),
      }]);
      
      // Set initial quick replies
      setQuickReplies(getInitialQuickReplies());
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
    }
  };

  const getWelcomeMessage = () => {
    if (jobDescriptionId) {
      return "I'm here to help you prepare for this job application. What would you like to know?";
    } else if (initialContext?.documentType) {
      return `I see you're working on your ${initialContext.documentType}. How can I help you improve it?`;
    }
    return "Hello! I'm your Career Advisor. I can help you with job applications, interview preparation, and career questions. What's on your mind?";
  };

  const getInitialQuickReplies = () => {
    if (jobDescriptionId) {
      return [
        "Why am I a good fit for this role?",
        "What skills should I highlight?",
        "Help me prepare for interview questions"
      ];
    }
    return [
      "Help me improve my resume",
      "Common interview questions",
      "Career advice"
    ];
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input;
    if (!text.trim() || !conversationId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setQuickReplies([]);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create SSE connection
      const eventSource = new EventSource(
        `/api/application-qa-stream?conversationId=${conversationId}&message=${encodeURIComponent(text)}`
      );
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'token') {
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: msg.content + data.content }
              : msg
          ));
        } else if (data.type === 'complete') {
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, isStreaming: false }
              : msg
          ));
          setQuickReplies(data.quickReplies || []);
          setIsLoading(false);
          eventSource.close();
        } else if (data.type === 'error') {
          console.error('Stream error:', data.error);
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: 'I apologize, but I encountered an error. Please try again.', isStreaming: false }
              : msg
          ));
          setIsLoading(false);
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
        setIsLoading(false);
        eventSource.close();
      };

    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
    }
  };

  const exportConversation = async () => {
    if (!conversationId) return;

    try {
      const response = await fetch(`/api/application-qa-stream?action=export&conversationId=${conversationId}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `career-advisor-chat-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export conversation:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <Card className={cn("flex flex-col h-full shadow-xl", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={exportConversation}
            title="Export conversation"
          >
            <Download className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2",
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.isStreaming && (
                  <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                )}
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && messages[messages.length - 1]?.content === '' && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Replies */}
      {quickReplies.length > 0 && (
        <div className="p-3 border-t">
          <p className="text-xs text-muted-foreground mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {quickReplies.map((reply, index) => (
              <Button
                key={index}
                size="sm"
                variant="outline"
                onClick={() => sendMessage(reply)}
                className="text-xs"
              >
                {reply}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}