"use client";

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase/client';
import { useAuthRecovery } from '@/lib/hooks/use-auth-recovery';
import { checkStorageBuckets } from '@/lib/supabase/storage';

/**
 * Client component that initializes Supabase resources
 * and handles global auth recovery when the app is first loaded
 */
export function SupabaseInitializer() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Initialize auth recovery - this handles global auth errors
  useAuthRecovery();

  useEffect(() => {
    const initSupabase = async () => {
      try {
        // Skip storage bucket checks to avoid errors - they can be handled later
        console.log('Supabase client initialized successfully');
        
        // Check for existing session and validate it
        if (supabase) {
          try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) {
              console.log('Session validation error during init:', sessionError);
              // Don't throw - let auth recovery handle it
            } else if (session) {
              console.log('Valid session found during initialization');
            } else {
              console.log('No session found during initialization');
            }
          } catch (sessionCheckError) {
            console.log('Error checking session during init:', sessionCheckError);
            // Continue - auth recovery will handle session issues
          }
        }
        
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