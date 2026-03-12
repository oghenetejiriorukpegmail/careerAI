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

// Vision-enabled models available via OpenRouter — Updated March 2026
export const VISION_MODELS: VisionModel[] = [
  // 🏆 S-Tier — March 2026 Frontier Vision
  {
    id: 'anthropic/claude-opus-4-6',
    name: 'Claude Opus 4.6',
    provider: 'Anthropic',
    description: 'SoTA — #1 multimodal reasoning, best for complex document & image analysis',
    speed: 'medium',
    accuracy: 'high',
    cost: 'high',
    recommended: true,
  },
  {
    id: 'openai/gpt-5.4',
    name: 'GPT-5.4',
    provider: 'OpenAI',
    description: 'Latest flagship — PhD-level reasoning with advanced spatial vision',
    speed: 'medium',
    accuracy: 'high',
    cost: 'high',
  },
  {
    id: 'google/gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro Preview',
    provider: 'Google',
    description: 'Frontier multimodal — 2M context, best for large document sets',
    speed: 'medium',
    accuracy: 'high',
    cost: 'medium',
  },
  {
    id: 'google/gemini-3-flash',
    name: 'Gemini 3 Flash',
    provider: 'Google',
    description: 'Sub-second latency with excellent vision — best speed/quality balance',
    speed: 'fast',
    accuracy: 'high',
    cost: 'low',
  },

  // 🔥 A-Tier — High Performance Vision
  {
    id: 'anthropic/claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'Anthropic',
    description: 'Fast + powerful vision — great balance of speed and quality',
    speed: 'fast',
    accuracy: 'high',
    cost: 'medium',
  },
  {
    id: 'anthropic/claude-4.5-sonnet',
    name: 'Claude 4.5 Sonnet',
    provider: 'Anthropic',
    description: 'Best agentic coding + strong vision — fast and reliable',
    speed: 'fast',
    accuracy: 'high',
    cost: 'medium',
  },
  {
    id: 'anthropic/claude-opus-4.5',
    name: 'Claude Opus 4.5',
    provider: 'Anthropic',
    description: 'Frontier reasoning with multimodal vision — previous gen flagship',
    speed: 'medium',
    accuracy: 'high',
    cost: 'high',
  },
  {
    id: 'openai/gpt-5.2',
    name: 'GPT-5.2',
    provider: 'OpenAI',
    description: 'Generalist workhorse — strong vision with chart/interface understanding',
    speed: 'medium',
    accuracy: 'high',
    cost: 'medium',
  },
  {
    id: 'x-ai/grok-4.2',
    name: 'Grok 4.2',
    provider: 'xAI',
    description: 'Speed king — multimodal with real-time X data integration',
    speed: 'fast',
    accuracy: 'high',
    cost: 'medium',
  },
  {
    id: 'x-ai/grok-4-fast',
    name: 'Grok 4 Fast',
    provider: 'xAI',
    description: '2M context with vision — fast and efficient',
    speed: 'fast',
    accuracy: 'high',
    cost: 'low',
  },
  {
    id: 'google/gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview',
    provider: 'Google',
    description: '2M context multimodal — excellent for complex visual analysis',
    speed: 'medium',
    accuracy: 'high',
    cost: 'medium',
  },

  // ⚡ Cost-Effective & Previous Gen
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    description: 'Strong vision with 1M context — great value',
    speed: 'medium',
    accuracy: 'high',
    cost: 'low',
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    description: 'Fast model with excellent vision — budget friendly',
    speed: 'fast',
    accuracy: 'high',
    cost: 'low',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Legacy multimodal — still solid for standard vision tasks',
    speed: 'medium',
    accuracy: 'high',
    cost: 'low',
  },

  // 🆓 Free Vision Models
  {
    id: 'qwen/qwen2.5-vl-72b-instruct:free',
    name: 'Qwen 2.5 VL 72B (Free)',
    provider: 'Qwen',
    description: 'Best free vision model — 72B params with strong accuracy',
    speed: 'medium',
    accuracy: 'good',
    cost: 'free',
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash (Free)',
    provider: 'Google',
    description: 'Fast and efficient free vision model',
    speed: 'fast',
    accuracy: 'good',
    cost: 'free',
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