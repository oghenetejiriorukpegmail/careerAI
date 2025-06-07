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
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
// import { SubscriptionManager } from '@/components/subscription-manager'; // Disabled for now
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Disabled for now

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
    { id: 'anthropic/claude-opus-4', name: 'Claude 4 Opus (Latest)' },
    { id: 'anthropic/claude-sonnet-4', name: 'Claude 4 Sonnet (Latest)' },
    { id: 'coding/gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro Preview (Coding)' },
    { id: 'google/gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash Preview (Fast)' },
    { id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'anthropic/claude-3-7-sonnet', name: 'Claude 3.7 Sonnet' },
    { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku (Fast)' },
    { id: 'meta/llama-3-70b-instruct', name: 'Llama 3 70B' },
    { id: 'mistral/mistral-large', name: 'Mistral Large' },
  ],
  openrouter: [
    { id: 'anthropic/claude-opus-4', name: 'Claude 4 Opus (Latest)' },
    { id: 'anthropic/claude-sonnet-4', name: 'Claude 4 Sonnet (Latest)' },
    { id: 'deepseek/deepseek-r1-0528:free', name: 'DeepSeek R1 (Free)' },
    { id: 'deepseek/deepseek-r1-0528', name: 'DeepSeek R1' },
    { id: 'qwen/qwen3-235b-a22b:free', name: 'Qwen3 235B (Recommended)' },
    { id: 'mistralai/devstral-small:free', name: 'Mistral Devstral Small (Free)' },
    { id: 'mistralai/devstral-small', name: 'Mistral Devstral Small' },
    { id: 'google/gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro Preview' },
    { id: 'google/gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash Preview (Latest)' },
    { id: 'google/gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash Preview (April)' },
    { id: 'anthropic/claude-3-7-sonnet', name: 'Claude 3.7 Sonnet' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
  ],
  anthropic: [
    { id: 'claude-opus-4', name: 'Claude 4 Opus (Latest)' },
    { id: 'claude-sonnet-4', name: 'Claude 4 Sonnet (Latest)' },
    { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
  ],
  google: [
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-pro', name: 'Gemini Pro' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  ],
  vertex: [
    { id: 'vertex/anthropic/claude-opus-4@us-east5', name: 'Claude 4 Opus (Vertex)' },
    { id: 'vertex/anthropic/claude-sonnet-4@us-east5', name: 'Claude 4 Sonnet (Vertex)' },
    { id: 'vertex/anthropic/claude-3-7-sonnet-20250219@us-east5', name: 'Claude 3.7 Sonnet (Vertex)' },
    { id: 'vertex/anthropic/claude-3-opus-latest@us-east5', name: 'Claude 3 Opus (Vertex)' },
    { id: 'vertex/anthropic/claude-3-sonnet-latest@us-east5', name: 'Claude 3 Sonnet (Vertex)' },
    { id: 'vertex/gemini-1.5-pro-latest@us-east5', name: 'Gemini 1.5 Pro (Vertex)' },
  ],
};

interface UserSettings {
  aiProvider: string;
  aiModel: string;
  documentAiOnly: boolean;
  enableLogging: boolean;
  showAiAttribution: boolean;
  tokenLimits?: {
    resumeParsing?: number;
    coverLetter?: number;
    jobMatching?: number;
    general?: number;
  };
  updatedAt?: number;
}

// Default settings
const defaultSettings: UserSettings = {
  aiProvider: 'openrouter',
  aiModel: 'qwen/qwen3-235b-a22b:free',
  documentAiOnly: true,
  enableLogging: true,
  showAiAttribution: false,
  tokenLimits: {
    resumeParsing: 0, // 0 means use automatic
    coverLetter: 0,
    jobMatching: 0,
    general: 0
  } as {
    resumeParsing: number;
    coverLetter: number;
    jobMatching: number;
    general: number;
  },
  updatedAt: Date.now()
};

export default function SettingsPage() {
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingCache, setResettingCache] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('openrouter');
  const [selectedModel, setSelectedModel] = useState<string>('qwen/qwen3-235b-a22b:free');
  const [documentAiOnly, setDocumentAiOnly] = useState<boolean>(true);
  const [enableLogging, setEnableLogging] = useState<boolean>(true);
  const [showAiAttribution, setShowAiAttribution] = useState<boolean>(false);
  const [tokenLimits, setTokenLimits] = useState({
    resumeParsing: 0,
    coverLetter: 0,
    jobMatching: 0,
    general: 0
  });
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
            setDocumentAiOnly(settings.documentAiOnly !== undefined ? settings.documentAiOnly : defaultSettings.documentAiOnly);
            setEnableLogging(settings.enableLogging !== undefined ? settings.enableLogging : defaultSettings.enableLogging);
            setShowAiAttribution(settings.showAiAttribution !== undefined ? settings.showAiAttribution : defaultSettings.showAiAttribution);
            setTokenLimits({
              resumeParsing: settings.tokenLimits?.resumeParsing ?? defaultSettings.tokenLimits!.resumeParsing,
              coverLetter: settings.tokenLimits?.coverLetter ?? defaultSettings.tokenLimits!.coverLetter,
              jobMatching: settings.tokenLimits?.jobMatching ?? defaultSettings.tokenLimits!.jobMatching,
              general: settings.tokenLimits?.general ?? defaultSettings.tokenLimits!.general
            });
            
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
            setTokenLimits({
              resumeParsing: defaultSettings.tokenLimits!.resumeParsing ?? 0,
              coverLetter: defaultSettings.tokenLimits!.coverLetter ?? 0,
              jobMatching: defaultSettings.tokenLimits!.jobMatching ?? 0,
              general: defaultSettings.tokenLimits!.general ?? 0
            });
            setDbStorageStatus('error');
          } else {
            console.error('API returned error status:', response.status);
            setDbStorageStatus('error');
            
            // Use defaults as fallback
            setSelectedProvider(defaultSettings.aiProvider);
            setSelectedModel(defaultSettings.aiModel);
            setDocumentAiOnly(defaultSettings.documentAiOnly);
            setEnableLogging(defaultSettings.enableLogging);
            setShowAiAttribution(defaultSettings.showAiAttribution);
            setTokenLimits({
              resumeParsing: defaultSettings.tokenLimits!.resumeParsing ?? 0,
              coverLetter: defaultSettings.tokenLimits!.coverLetter ?? 0,
              jobMatching: defaultSettings.tokenLimits!.jobMatching ?? 0,
              general: defaultSettings.tokenLimits!.general ?? 0
            });
          }
        } catch (error) {
          console.error('Error fetching settings from API:', error);
          setDbStorageStatus('error');
          
          // Fallback to defaults
          setSelectedProvider(defaultSettings.aiProvider);
          setSelectedModel(defaultSettings.aiModel);
          setDocumentAiOnly(defaultSettings.documentAiOnly);
          setEnableLogging(defaultSettings.enableLogging);
          setShowAiAttribution(defaultSettings.showAiAttribution);
          setTokenLimits({
            resumeParsing: defaultSettings.tokenLimits!.resumeParsing ?? 0,
            coverLetter: defaultSettings.tokenLimits!.coverLetter ?? 0,
            jobMatching: defaultSettings.tokenLimits!.jobMatching ?? 0,
            general: defaultSettings.tokenLimits!.general ?? 0
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        
        // Use defaults on error
        setSelectedProvider(defaultSettings.aiProvider);
        setSelectedModel(defaultSettings.aiModel);
        setDocumentAiOnly(defaultSettings.documentAiOnly);
        setEnableLogging(defaultSettings.enableLogging);
        setShowAiAttribution(defaultSettings.showAiAttribution);
        setTokenLimits({
          resumeParsing: defaultSettings.tokenLimits!.resumeParsing ?? 0,
          coverLetter: defaultSettings.tokenLimits!.coverLetter ?? 0,
          jobMatching: defaultSettings.tokenLimits!.jobMatching ?? 0,
          general: defaultSettings.tokenLimits!.general ?? 0
        });
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
        showAiAttribution,
        tokenLimits,
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
        documentAiOnly,
        enableLogging,
        showAiAttribution,
        tokenLimits,
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
          <p className="text-muted-foreground mt-1">Manage your subscription and application preferences</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button onClick={() => window.location.href = '/dashboard'} variant="outline" className="mr-2">
            Back to Dashboard
          </Button>
        </div>
      </div>
      
      {/* Subscription tabs disabled for now */}
      {/* <Tabs defaultValue="subscription" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="ai-settings">AI Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="subscription">
          <SubscriptionManager />
        </TabsContent>
        
        <TabsContent value="ai-settings"> */}
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
                
                {/* Token Limits Section */}
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label>Token Limits</Label>
                    <p className="text-sm text-gray-500">
                      Set custom token limits for different operations. Set to 0 to use automatic optimal limits.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="token-resume" className="text-sm">Resume Parsing</Label>
                        <span className="text-sm text-muted-foreground">
                          {tokenLimits.resumeParsing === 0 ? 'Auto' : tokenLimits.resumeParsing.toLocaleString()}
                        </span>
                      </div>
                      <Slider
                        id="token-resume"
                        min={0}
                        max={128000}
                        step={1000}
                        value={[tokenLimits.resumeParsing]}
                        onValueChange={(value) => setTokenLimits({...tokenLimits, resumeParsing: value[0]})}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="token-cover" className="text-sm">Cover Letter Generation</Label>
                        <span className="text-sm text-muted-foreground">
                          {tokenLimits.coverLetter === 0 ? 'Auto' : tokenLimits.coverLetter.toLocaleString()}
                        </span>
                      </div>
                      <Slider
                        id="token-cover"
                        min={0}
                        max={32000}
                        step={500}
                        value={[tokenLimits.coverLetter]}
                        onValueChange={(value) => setTokenLimits({...tokenLimits, coverLetter: value[0]})}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="token-job" className="text-sm">Job Matching</Label>
                        <span className="text-sm text-muted-foreground">
                          {tokenLimits.jobMatching === 0 ? 'Auto' : tokenLimits.jobMatching.toLocaleString()}
                        </span>
                      </div>
                      <Slider
                        id="token-job"
                        min={0}
                        max={32000}
                        step={500}
                        value={[tokenLimits.jobMatching]}
                        onValueChange={(value) => setTokenLimits({...tokenLimits, jobMatching: value[0]})}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="token-general" className="text-sm">General Operations</Label>
                        <span className="text-sm text-muted-foreground">
                          {tokenLimits.general === 0 ? 'Auto' : tokenLimits.general.toLocaleString()}
                        </span>
                      </div>
                      <Slider
                        id="token-general"
                        min={0}
                        max={16000}
                        step={500}
                        value={[tokenLimits.general]}
                        onValueChange={(value) => setTokenLimits({...tokenLimits, general: value[0]})}
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Higher token limits allow for longer responses but increase costs. Our system automatically optimizes based on the model and task when set to Auto.
                  </p>
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
                <li>For free usage: OpenRouter with DeepSeek R1 (Free)</li>
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
        {/* </TabsContent>
      </Tabs> */}
    </div>
  );
}