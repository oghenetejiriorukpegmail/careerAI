'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Sparkles, RefreshCw, Info } from 'lucide-react';

interface RewriteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionTitle: string;
  currentContent: string;
  onAccept: (newContent: string) => void;
  fullResumeData?: any;
}

// Helper function to get contextual placeholder text
function getPlaceholderForSection(sectionTitle: string): string {
  const title = sectionTitle.toLowerCase();
  
  if (title.includes('summary')) {
    return 'e.g., Make it more impactful, emphasize leadership experience, focus on technical expertise...';
  } else if (title.includes('experience') || title.includes('description')) {
    return 'e.g., Quantify achievements, use stronger action verbs, highlight results and impact...';
  } else if (title.includes('skills')) {
    return 'e.g., Group by categories, prioritize relevant skills, add emerging technologies...';
  } else if (title.includes('project')) {
    return 'e.g., Emphasize technical challenges solved, highlight team collaboration, focus on outcomes...';
  } else {
    return 'e.g., Make it more concise, emphasize key achievements, use stronger language...';
  }
}

export function RewriteDialog({
  open,
  onOpenChange,
  sectionTitle,
  currentContent,
  onAccept,
  fullResumeData,
}: RewriteDialogProps) {
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewrittenContent, setRewrittenContent] = useState('');
  const [instructions, setInstructions] = useState('');
  const { toast } = useToast();

  const handleRewrite = async () => {
    if (!currentContent.trim()) {
      toast({
        title: 'Error',
        description: 'No content to rewrite',
        variant: 'destructive',
      });
      return;
    }

    setIsRewriting(true);
    try {
      const response = await fetch('/api/rewrite-section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sectionTitle,
          content: currentContent,
          instructions,
          fullResumeData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to rewrite section');
      }

      const data = await response.json();
      setRewrittenContent(data.rewrittenContent);
    } catch (error) {
      console.error('Error rewriting section:', error);
      toast({
        title: 'Error',
        description: 'Failed to rewrite section. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRewriting(false);
    }
  };

  const handleAccept = () => {
    if (rewrittenContent) {
      onAccept(rewrittenContent);
      handleClose();
    }
  };

  const handleClose = () => {
    setRewrittenContent('');
    setInstructions('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Rewrite: {sectionTitle}
          </DialogTitle>
          <DialogDescription>
            Use AI to enhance and rewrite this section of your resume
          </DialogDescription>
          <div className="flex items-start gap-2 mt-2 p-3 bg-blue-50 rounded-md text-sm text-blue-800">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p>The AI will improve your content while preserving all factual information.</p>
              <p>Your entire resume is analyzed to ensure consistency and alignment.</p>
              <p>You can review and edit the suggestions before accepting them.</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="current">Current Content</Label>
            <Textarea
              id="current"
              value={currentContent}
              readOnly
              className="mt-2 bg-muted min-h-[100px]"
            />
          </div>

          <div>
            <Label htmlFor="instructions">
              Instructions for AI (optional)
            </Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={getPlaceholderForSection(sectionTitle)}
              className="mt-2 min-h-[80px]"
            />
          </div>

          {rewrittenContent && (
            <div>
              <Label htmlFor="rewritten">AI Rewritten Content</Label>
              <Textarea
                id="rewritten"
                value={rewrittenContent}
                onChange={(e) => setRewrittenContent(e.target.value)}
                className="mt-2 min-h-[150px] border-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                You can edit the AI-generated content before accepting
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {!rewrittenContent ? (
            <Button onClick={handleRewrite} disabled={isRewriting}>
              {isRewriting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rewriting...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Rewrite with AI
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleRewrite}
                disabled={isRewriting}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={handleAccept}>
                Accept Changes
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}