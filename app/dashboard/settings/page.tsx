'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase/client';
import { VISION_MODELS } from '@/components/ai-vision-selector';

// Define available AI providers
const AI_PROVIDERS = [
  { id: 'requesty', name: 'Requesty Router' },
  { id: 'openrouter', name: 'OpenRouter' },
  { id: 'anthropic', name: 'Anthropic Direct' },
  { id: 'google', name: 'Google AI' },
  { id: 'openai', name: 'OpenAI' },
  { id: 'vertex', name: 'Google Vertex AI' },
];

// Define available AI models by provider
const AI_MODELS = {
  requesty: [
    { id: 'anthropic/claude-opus-4.1', name: 'Claude Opus 4.1 (Latest)' },
    { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
    { id: 'coding/gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro Preview (Coding)' },
    { id: 'google/gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash Preview (Fast)' },
    { id: 'meta/llama-4-maverick', name: 'Llama 4 Maverick (400B MoE)' },
    { id: 'meta/llama-4-scout', name: 'Llama 4 Scout (109B MoE)' },
  ],
  openrouter: [
    // 🔥 Latest 2025 Models - Premium
    { id: 'openai/gpt-5', name: '🔥 GPT-5 (Aug 2025 - Ultimate)' },
    { id: 'anthropic/claude-opus-4.1', name: '🔥 Claude Opus 4.1 (Aug 2025 - 74.5% SWE-bench)' },
    { id: 'moonshotai/kimi-k2', name: '🔥 Kimi K2 (1T params - Best Value)' },
    { id: 'meta/llama-4-maverick', name: '🔥 Llama 4 Maverick (400B MoE)' },
    
    // ⚡ Latest 2025 Models - Cost-Effective
    { id: 'openai/gpt-5-mini', name: '⚡ GPT-5 Mini (Aug 2025 - Fast & Cheap)' },
    { id: 'qwen/qwen3-30b-a3b-instruct-2507', name: '⚡ Qwen3 30B A3B (1M context)' },
    { id: 'zhipu/glm-4.5', name: '⚡ GLM 4.5 (355B MoE - Agent-Native)' },
    { id: 'meta/llama-4-scout', name: '⚡ Llama 4 Scout (109B MoE - Fast)' },
    
    // 🆓 Free Tier Models (2025)
    { id: 'openai/gpt-oss-120b:free', name: '🆕 GPT-OSS 120B (OpenAI Open Source)' },
    { id: 'openai/gpt-oss-20b:free', name: '🆕 GPT-OSS 20B (OpenAI Open Source)' },
    { id: 'moonshotai/kimi-k2:free', name: 'Kimi K2 (Free Tier)' },
    { id: 'x-ai/grok-4-fast:free', name: '🆕 Grok 4 Fast (Free)' },
    { id: 'zhipu/glm-4.5:free', name: 'GLM 4.5 (Free Tier)' },
    { id: 'deepseek/deepseek-r1-zero:free', name: 'DeepSeek R1 Zero (Free)' },
    { id: 'qwen/qwen3-30b-a3b-instruct-2507:free', name: 'Qwen3 30B A3B (Free)' },

    // Reliable Options
    { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
    { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5 (Fast & Cost-Effective)' },
    { id: 'x-ai/grok-4', name: 'Grok 4' },
    { id: 'x-ai/grok-code-fast-1', name: 'Grok Code Fast 1 (Specialized for Code)' },
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    
    // Legacy (for comparison)
    { id: 'qwen/qwen3-235b-a22b:free', name: 'Qwen3 235B (Previous Default)' },
  ],
  anthropic: [
    { id: 'claude-opus-4.1', name: 'Claude Opus 4.1 (Latest - 74.5% SWE-bench)' },
    { id: 'claude-sonnet-4', name: 'Claude Sonnet 4' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (Fast)' },
  ],
  google: [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Latest)' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Latest)' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  ],
  openai: [
    { id: 'gpt-5', name: 'GPT-5 (Aug 2025 - Latest)' },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini (Aug 2025 - Cost Effective)' },
    { id: 'gpt-5-nano', name: 'GPT-5 Nano (Aug 2025 - Ultra Fast)' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  ],
  vertex: [
    { id: 'vertex/anthropic/claude-opus-4.1@us-east5', name: 'Claude Opus 4.1 (Vertex)' },
    { id: 'vertex/anthropic/claude-sonnet-4@us-east5', name: 'Claude Sonnet 4 (Vertex)' },
    { id: 'vertex/gemini-2.5-pro-latest@us-east5', name: 'Gemini 2.5 Pro (Vertex)' },
    { id: 'vertex/gemini-1.5-pro-latest@us-east5', name: 'Gemini 1.5 Pro (Vertex)' },
  ],
};

interface UserSettings {
  aiProvider: string;
  aiModel: string;
  visionModel?: string;
  documentAiOnly: boolean;
  enableLogging: boolean;
  showAiAttribution: boolean;
  updatedAt?: number;
}

// Default settings - Updated for 2025 models
const defaultSettings: UserSettings = {
  aiProvider: 'openrouter',
  aiModel: 'moonshotai/kimi-k2:free', // Best free model in 2025
  visionModel: 'qwen/qwen2.5-vl-72b-instruct:free', // Free vision model
  documentAiOnly: true,
  enableLogging: true,
  showAiAttribution: false,
  updatedAt: Date.now()
};

export default function SettingsPage() {
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingCache, setResettingCache] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('openrouter');
  const [selectedModel, setSelectedModel] = useState<string>('moonshotai/kimi-k2:free');
  const [selectedVisionModel, setSelectedVisionModel] = useState<string>('qwen/qwen2.5-vl-72b-instruct:free');
  const [documentAiOnly, setDocumentAiOnly] = useState<boolean>(true);
  const [enableLogging, setEnableLogging] = useState<boolean>(true);
  const [showAiAttribution, setShowAiAttribution] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [dbStorageStatus, setDbStorageStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const { toast } = useToast();

  // Load settings from API or localStorage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        
        // Check authentication status - authentication is now optional
        const { data } = await supabase.auth.getSession();
        const isAuth = !!data.session;
        setIsAuthenticated(isAuth);
        console.log(`Authentication status on load: ${isAuth ? 'Authenticated' : 'Not authenticated (optional)'}`);
        
        // Authentication is now optional - proceed with loading settings regardless
        
        // Load settings from the API (authentication is optional)
        try {
          const response = await fetch('/api/settings');
          
          if (response.ok) {
            // Check content type first to avoid parsing HTML as JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              console.error('API returned non-JSON content:', contentType);
              setDbStorageStatus('error');
              
              // Use defaults as fallback
              setSelectedProvider(defaultSettings.aiProvider);
              setSelectedModel(defaultSettings.aiModel);
              setDocumentAiOnly(defaultSettings.documentAiOnly);
              setEnableLogging(defaultSettings.enableLogging);
              setShowAiAttribution(defaultSettings.showAiAttribution);
              return;
            }
            
            // Parse settings from API
            const settings = await response.json();
            setSelectedProvider(settings.aiProvider || defaultSettings.aiProvider);
            setSelectedModel(settings.aiModel || defaultSettings.aiModel);
            setSelectedVisionModel(settings.visionModel || defaultSettings.visionModel);
            setDocumentAiOnly(settings.documentAiOnly !== undefined ? settings.documentAiOnly : defaultSettings.documentAiOnly);
            setEnableLogging(settings.enableLogging !== undefined ? settings.enableLogging : defaultSettings.enableLogging);
            setShowAiAttribution(settings.showAiAttribution !== undefined ? settings.showAiAttribution : defaultSettings.showAiAttribution);
            
            // Save to localStorage for backup
            localStorage.setItem('userSettings', JSON.stringify(settings));
            setDbStorageStatus('success');
          } else if (response.status === 401) {
            console.warn('Authentication required for enhanced features');
            // Continue with defaults instead of redirecting
            setSelectedProvider(defaultSettings.aiProvider);
            setSelectedModel(defaultSettings.aiModel);
            setDocumentAiOnly(defaultSettings.documentAiOnly);
            setEnableLogging(defaultSettings.enableLogging);
            setShowAiAttribution(defaultSettings.showAiAttribution);
            setDbStorageStatus('error');
          } else {
            console.error('API returned error status:', response.status);
            setDbStorageStatus('error');
            
            // Use defaults as fallback
            setSelectedProvider(defaultSettings.aiProvider);
            setSelectedModel(defaultSettings.aiModel);
            setDocumentAiOnly(defaultSettings.documentAiOnly);
            setEnableLogging(defaultSettings.enableLogging);
          }
        } catch (error) {
          console.error('Error fetching settings from API:', error);
          setDbStorageStatus('error');
          
          // Fallback to defaults
          setSelectedProvider(defaultSettings.aiProvider);
          setSelectedModel(defaultSettings.aiModel);
          setDocumentAiOnly(defaultSettings.documentAiOnly);
          setEnableLogging(defaultSettings.enableLogging);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        
        // Use defaults on error
        setSelectedProvider(defaultSettings.aiProvider);
        setSelectedModel(defaultSettings.aiModel);
        setDocumentAiOnly(defaultSettings.documentAiOnly);
        setEnableLogging(defaultSettings.enableLogging);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  // Reset cache
  const resetCache = async () => {
    try {
      setResettingCache(true);
      
      // Create settings object with current settings for direct API call
      const settings = {
        aiProvider: selectedProvider,
        aiModel: selectedModel,
        documentAiOnly,
        enableLogging,
        updatedAt: Date.now()
      };
      
      // First try calling the apply settings endpoint instead of reset-cache
      // This is more reliable as it's definitely registered in the Next.js router
      console.log('Applying settings to force cache reset...');
      
      // Check auth status first
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('User not authenticated, cannot reset server cache');
        toast({
          title: 'Settings saved locally',
          description: 'Settings saved to your browser but not to the server. Login to save settings to your account.',
          variant: 'destructive'
        });
        return false;
      }
      
      try {
        const applyResponse = await fetch('/api/settings/apply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings),
          credentials: 'include'
        });
        
        const contentType = applyResponse.headers.get('content-type');
        
        // Check for JSON response
        if (contentType && contentType.includes('application/json')) {
          try {
            const result = await applyResponse.json();
            
            if (applyResponse.ok) {
              console.log('Settings applied with cache reset:', result);
              toast({
                title: 'Settings cache reset successful',
                description: 'AI configuration has been updated. Your settings are now correctly applied.'
              });
              return true;
            } else {
              // Handle specific error cases
              if (applyResponse.status === 401) {
                console.error('Authentication required for settings/apply');
                toast({
                  title: 'Authentication required',
                  description: 'You must be logged in to reset settings cache. Your settings were saved locally.',
                  variant: 'destructive'
                });
              } else {
                console.error('Error from settings/apply:', result);
                toast({
                  title: 'Error resetting cache',
                  description: result.error || 'There was a problem applying your settings.',
                  variant: 'destructive'
                });
              }
              return false;
            }
          } catch (jsonError) {
            console.error('Error parsing JSON from apply response:', jsonError);
            toast({
              title: 'Error parsing response',
              description: 'There was a problem understanding the server response. Settings saved locally only.',
              variant: 'destructive'
            });
            return false;
          }
        } else {
          // Non-JSON response (likely HTML)
          console.error('Non-JSON response from apply API:', applyResponse.status);
          
          // If we got a redirect to login, it means auth is required
          if (applyResponse.status === 302 || applyResponse.url.includes('/login')) {
            toast({
              title: 'Authentication required',
              description: 'You must be logged in to reset settings cache. Your settings were saved locally.',
              variant: 'destructive'
            });
            return false;
          }
          
          // For HTML responses with status 200 (old middleware behavior)
          if (applyResponse.status === 200) {
            try {
              const responseText = await applyResponse.text();
              
              // If it's HTML, it's likely a login page
              if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
                console.error('Apply API returned HTML - authentication likely required');
                toast({
                  title: 'Authentication required',
                  description: 'You must be logged in to reset settings cache. Your settings were saved locally.',
                  variant: 'destructive'
                });
                return false;
              }
            } catch (textError) {
              console.error('Could not read apply response text:', textError);
            }
          }
          
          // Generic failure
          toast({
            title: 'Error resetting cache',
            description: 'There was a problem connecting to the server. Settings were saved locally only.',
            variant: 'destructive'
          });
          return false;
        }
      } catch (applyError) {
        console.error('Failed to apply settings:', applyError);
        
        // Settings apply failed, notify user
        toast({
          title: 'Settings saved locally',
          description: 'Your settings were saved locally but could not be applied to the server.',
          variant: 'destructive'
        });
        
        return false;
      }
    } catch (error) {
      console.error('Error resetting cache:', error);
      
      toast({
        title: 'Error resetting cache',
        description: 'There was a problem connecting to the server. Settings were saved but not immediately applied.',
        variant: 'destructive',
      });
      
      return false;
    } finally {
      setResettingCache(false);
    }
  };

  // Save settings
  const saveSettings = async () => {
    try {
      setSaving(true);
      
      // Create settings object
      const settings: UserSettings = {
        aiProvider: selectedProvider,
        aiModel: selectedModel,
        visionModel: selectedVisionModel,
        documentAiOnly,
        enableLogging,
        showAiAttribution,
        updatedAt: Date.now()
      };
      
      // Check authentication status - authentication is now optional
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log(`Saving settings with authentication: ${session ? 'Yes' : 'No (optional)'}`);
      
      // Authentication is optional - continue with saving
      
      // Debug log to see what settings we're saving
      console.log('Saving settings:', settings);
      
      // Save to localStorage as a backup
      localStorage.setItem('userSettings', JSON.stringify(settings));
      
      // Save to API (authentication is optional)
      const apiResponse = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
        credentials: 'include'
      });
      
      console.log('API response status:', apiResponse.status);
      
      // Handle authentication errors (but continue with local storage)
      if (apiResponse.status === 401) {
        console.warn('Authentication required for enhanced features - settings saved locally only');
        setDbStorageStatus('error');
        toast({
          title: 'Settings saved locally',
          description: 'Settings saved to your browser. Sign in for cloud storage.',
        });
        return;
      }
      
      // Process API response to check database storage status
      if (apiResponse.ok) {
        try {
          // Check content type first to avoid parsing HTML as JSON
          const contentType = apiResponse.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.error('API returned non-JSON content:', contentType);
            setDbStorageStatus('error');
            toast({
              title: 'Error saving settings',
              description: 'Unexpected response from server. Please try again.',
              variant: 'destructive',
            });
            return;
          }
          
          const apiResult = await apiResponse.json();
          console.log('API response data:', apiResult);
          
          // Check database storage status from new API format
          if (apiResult.database?.success) {
            console.log('Settings storage succeeded:', apiResult.database.message);
            setDbStorageStatus('success');
          } else {
            console.warn('Settings storage failed or using memory only:', apiResult.database?.message);
            setDbStorageStatus('error');
          }
        } catch (jsonError) {
          console.error('Error parsing API response:', jsonError);
          setDbStorageStatus('error');
        }
      } else {
        console.error('API returned error status:', apiResponse.status);
        setDbStorageStatus('error');
        
        toast({
          title: 'Error saving settings',
          description: 'There was a problem saving your settings to the database.',
          variant: 'destructive',
        });
        return;
      }
      
      // Also apply to current session
      try {
        const applyResponse = await fetch('/api/settings/apply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings),
          credentials: 'include'
        });
        
        console.log('Apply response status:', applyResponse.status);
        
        if (applyResponse.status === 401) {
          console.warn('Authentication required for apply endpoint - skipping');
          // Continue without applying - settings are already saved
        }
        
        if (!applyResponse.ok) {
          console.warn('Settings saved but not applied immediately:', applyResponse.status);
        }
      } catch (applyError) {
        console.warn('Error applying settings:', applyError);
      }
      
      // Success toast
      toast({
        title: 'Settings saved',
        description: dbStorageStatus === 'success' 
          ? 'Your settings have been updated and saved to your account.' 
          : 'Your settings have been updated but may not be properly saved to your account.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error saving settings',
        description: 'There was a problem saving your settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure AI models and application preferences</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button onClick={() => window.location.href = '/dashboard'} variant="outline" className="mr-2">
            Back to Dashboard
          </Button>
        </div>
      </div>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>AI Configuration</CardTitle>
            <CardDescription>
              Configure AI models and processing settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading settings...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ai-provider">AI Provider</Label>
                  <Select 
                    value={selectedProvider} 
                    onValueChange={(provider) => {
                      setSelectedProvider(provider);
                      // Set default model for the selected provider
                      if (AI_MODELS[provider as keyof typeof AI_MODELS] && AI_MODELS[provider as keyof typeof AI_MODELS].length > 0) {
                        setSelectedModel(AI_MODELS[provider as keyof typeof AI_MODELS][0].id);
                      }
                    }}
                  >
                    <SelectTrigger id="ai-provider">
                      <SelectValue placeholder="Select AI provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_PROVIDERS.map(provider => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-1">
                    Select the AI provider to use for API access.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ai-model">AI Model</Label>
                  <Select 
                    value={selectedModel} 
                    onValueChange={setSelectedModel}
                  >
                    <SelectTrigger id="ai-model">
                      <SelectValue placeholder="Select AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS[selectedProvider as keyof typeof AI_MODELS]?.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-1">
                    Select the AI model to use for resume parsing and content generation.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="vision-model">Vision AI Model (For URL Parsing)</Label>
                  <Select 
                    value={selectedVisionModel} 
                    onValueChange={setSelectedVisionModel}
                  >
                    <SelectTrigger id="vision-model">
                      <SelectValue placeholder="Select vision model" />
                    </SelectTrigger>
                    <SelectContent>
                      {VISION_MODELS.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{model.name}</span>
                            {model.cost === 'free' && (
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">FREE</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-1">
                    Select the vision AI model to use for analyzing job listing screenshots when parsing URLs.
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="document-ai-only">Use Document AI Only</Label>
                    <p className="text-sm text-gray-500">
                      Use only Google Document AI for PDF extraction without fallbacks
                    </p>
                  </div>
                  <Switch
                    id="document-ai-only"
                    checked={documentAiOnly}
                    onCheckedChange={setDocumentAiOnly}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable-logging">Enable Detailed Logging</Label>
                    <p className="text-sm text-gray-500">
                      Log AI responses and extraction results for debugging
                    </p>
                  </div>
                  <Switch
                    id="enable-logging"
                    checked={enableLogging}
                    onCheckedChange={setEnableLogging}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-ai-attribution">Show AI Model Attribution</Label>
                    <p className="text-sm text-gray-500">
                      Display which AI model processed each resume for quality assurance
                    </p>
                  </div>
                  <Switch
                    id="show-ai-attribution"
                    checked={showAiAttribution}
                    onCheckedChange={setShowAiAttribution}
                  />
                </div>
                
                <div className="flex flex-col space-y-2">
                  <Button 
                    onClick={saveSettings} 
                    disabled={saving || resettingCache}
                    className="w-full mt-4"
                  >
                    {saving ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </Button>
                  
                  <div className="flex items-center justify-center mt-2">
                    <Button 
                      onClick={resetCache} 
                      disabled={resettingCache || saving}
                      variant="outline"
                      className="text-sm"
                    >
                      {resettingCache ? (
                        <>
                          <Loader className="mr-2 h-3 w-3 animate-spin" />
                          Resetting Cache...
                        </>
                      ) : (
                        'Reset AI Cache'
                      )}
                    </Button>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    If settings aren't taking effect, use the reset button to clear cached configurations.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Usage Information</CardTitle>
            <CardDescription>
              Information about your current AI model usage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-1">Current AI Provider</h3>
              <p className="text-muted-foreground">{selectedProvider}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-sm mb-1">Current AI Model</h3>
              <p className="text-muted-foreground">{selectedModel}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-sm mb-1">Authentication Status</h3>
              <p className={isAuthenticated ? "text-green-600" : "text-amber-600"}>
                {isAuthenticated ? "Authenticated (settings saved to account)" : "Not authenticated (settings saved locally only)"}
              </p>
            </div>
            
            {isAuthenticated && (
              <div>
                <h3 className="font-semibold text-sm mb-1">Database Storage Status</h3>
                <p className={
                  dbStorageStatus === 'success' ? "text-green-600" : 
                  dbStorageStatus === 'error' ? "text-red-600" : 
                  "text-amber-600"
                }>
                  {dbStorageStatus === 'success' ? "Settings successfully stored in database" : 
                   dbStorageStatus === 'error' ? "Error saving settings to database" : 
                   "Database storage status unknown"}
                </p>
              </div>
            )}
            
            <div>
              <h3 className="font-semibold text-sm mb-1">Recommended Settings</h3>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                <li>For resume parsing: OpenRouter with Qwen3 235B</li>
                <li>For fast responses: Requesty with Gemini 2.5 Flash</li>
                <li>For highest quality: Anthropic with Claude 3.7 Sonnet</li>
              </ul>
            </div>
            
            <div className="border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-900 p-3 rounded-md mt-4">
              <p className="text-sm">
                Changes to AI settings will take effect immediately for new operations. 
                Some operations already in progress may continue using previous settings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}