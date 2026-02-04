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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Eye, Sparkles, Zap, Star } from 'lucide-react';

export interface VisionModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  speed: 'fast' | 'medium' | 'slow';
  accuracy: 'high' | 'medium' | 'good';
  cost: 'free' | 'low' | 'medium' | 'high';
  recommended?: boolean;
}

// Vision-enabled models available via OpenRouter
export const VISION_MODELS: VisionModel[] = [
  // Latest 2025 Models - Premium Vision
  {
    id: 'google/gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    provider: 'Google',
    description: 'Latest Gemini with PhD-level reasoning and advanced visual processing',
    speed: 'fast',
    accuracy: 'high',
    cost: 'low',
    recommended: true,
  },
  {
    id: 'google/gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview',
    provider: 'Google',
    description: 'Frontier multimodal model with state-of-the-art vision (81.2% MMMU Pro)',
    speed: 'medium',
    accuracy: 'high',
    cost: 'medium',
  },
  {
    id: 'anthropic/claude-opus-4.5',
    name: 'Claude Opus 4.5',
    provider: 'Anthropic',
    description: 'Frontier reasoning with multimodal vision - best for complex tasks',
    speed: 'medium',
    accuracy: 'high',
    cost: 'high',
  },
  {
    id: 'anthropic/claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    description: 'Latest Claude with excellent vision and coding capabilities',
    speed: 'fast',
    accuracy: 'high',
    cost: 'medium',
  },
  {
    id: 'anthropic/claude-haiku-4.5',
    name: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    description: 'Fastest Claude with strong vision - perfect for real-time analysis',
    speed: 'fast',
    accuracy: 'high',
    cost: 'low',
  },
  {
    id: 'openai/gpt-5',
    name: 'GPT-5',
    provider: 'OpenAI',
    description: 'Natively multimodal with advanced spatial reasoning',
    speed: 'medium',
    accuracy: 'high',
    cost: 'high',
  },
  {
    id: 'openai/gpt-5.1',
    name: 'GPT-5.1',
    provider: 'OpenAI',
    description: 'Enhanced GPT-5 with improved vision and reasoning',
    speed: 'medium',
    accuracy: 'high',
    cost: 'high',
  },
  {
    id: 'openai/gpt-5.2',
    name: 'GPT-5.2',
    provider: 'OpenAI',
    description: 'Latest flagship - strongest vision model with chart/interface understanding',
    speed: 'medium',
    accuracy: 'high',
    cost: 'high',
  },
  {
    id: 'openai/gpt-5.2-pro',
    name: 'GPT-5.2 Pro',
    provider: 'OpenAI',
    description: 'Professional tier with 512K context and advanced visual reasoning',
    speed: 'medium',
    accuracy: 'high',
    cost: 'high',
  },
  {
    id: 'x-ai/grok-4',
    name: 'Grok 4',
    provider: 'xAI',
    description: 'Multimodal model with vision, voice, and text understanding',
    speed: 'medium',
    accuracy: 'high',
    cost: 'medium',
  },
  {
    id: 'x-ai/grok-4-fast',
    name: 'Grok 4 Fast',
    provider: 'xAI',
    description: '2M context with vision - 40% more efficient than Grok 4',
    speed: 'fast',
    accuracy: 'high',
    cost: 'low',
  },

  // Previous Generation - Still Reliable
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    description: 'Previous gen with enhanced vision capabilities and reasoning',
    speed: 'medium',
    accuracy: 'high',
    cost: 'medium',
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    description: 'Previous gen fast model with excellent vision capabilities',
    speed: 'fast',
    accuracy: 'high',
    cost: 'low',
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash (Free)',
    provider: 'Google',
    description: 'Fast and efficient vision model with good accuracy',
    speed: 'fast',
    accuracy: 'good',
    cost: 'free',
  },
  {
    id: 'anthropic/claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    description: 'Balanced performance and accuracy for job parsing',
    speed: 'medium',
    accuracy: 'high',
    cost: 'medium',
  },
  {
    id: 'anthropic/claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    description: 'Fast and cost-effective with good vision capabilities',
    speed: 'fast',
    accuracy: 'good',
    cost: 'low',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'GPT-4 optimized with vision capabilities',
    speed: 'medium',
    accuracy: 'high',
    cost: 'medium',
  },
];

interface AIVisionSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (modelId: string) => void;
  defaultModel?: string;
}

export function AIVisionSelector({
  open,
  onOpenChange,
  onSelect,
  defaultModel = 'google/gemini-3-flash-preview',
}: AIVisionSelectorProps) {
  const [selectedModel, setSelectedModel] = useState(defaultModel);

  const handleConfirm = () => {
    onSelect(selectedModel);
    onOpenChange(false);
  };

  const getSpeedIcon = (speed: string) => {
    switch (speed) {
      case 'fast':
        return <Zap className="h-3 w-3" />;
      case 'medium':
        return <Sparkles className="h-3 w-3" />;
      case 'slow':
        return <Star className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case 'fast':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'slow':
        return 'text-red-600';
      default:
        return '';
    }
  };

  const getCostColor = (cost: string) => {
    switch (cost) {
      case 'free':
        return 'bg-green-100 text-green-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Select AI Model for Job Extraction
          </DialogTitle>
          <DialogDescription>
            Choose a vision-enabled AI model to analyze the job listing screenshot. 
            Models vary in speed, accuracy, and cost.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup value={selectedModel} onValueChange={setSelectedModel}>
            <div className="space-y-3">
              {VISION_MODELS.map((model) => (
                <div
                  key={model.id}
                  className="relative flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                >
                  <RadioGroupItem
                    value={model.id}
                    id={model.id}
                    className="mt-1"
                  />
                  <Label
                    htmlFor={model.id}
                    className="flex-1 cursor-pointer space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {model.provider}
                      </Badge>
                      {model.recommended && (
                        <Badge className="text-xs">Recommended</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {model.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className={`flex items-center gap-1 text-xs ${getSpeedColor(model.speed)}`}>
                        {getSpeedIcon(model.speed)}
                        <span className="capitalize">{model.speed}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Accuracy: <span className="capitalize font-medium">{model.accuracy}</span>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getCostColor(model.cost)}`}
                      >
                        {model.cost === 'free' ? 'FREE' : model.cost.toUpperCase()}
                      </Badge>
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Use Selected Model
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}