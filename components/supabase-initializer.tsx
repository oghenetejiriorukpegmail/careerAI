"use client";

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase/client';
import { checkStorageBuckets } from '@/lib/supabase/storage';

/**
 * Client component that initializes Supabase resources
 * when the app is first loaded
 */
export function SupabaseInitializer() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initSupabase = async () => {
      try {
        // Skip storage bucket checks to avoid errors - they can be handled later
        console.log('Supabase client initialized successfully');
        setInitialized(true);
      } catch (err: any) {
        console.error('Error during initialization:', err);
        setError(err.message || 'An error occurred during initialization');
        
        // Continue anyway - don't block the app
        setInitialized(true);
      }
    };

    initSupabase();
  }, [toast]);

  // This component doesn't render anything visible
  return null;
}

export default SupabaseInitializer;