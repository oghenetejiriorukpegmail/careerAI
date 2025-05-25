'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cloud } from 'lucide-react';

interface GoogleDrivePickerProps {
  onFilePicked: (file: File) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

export function GoogleDrivePicker({ onFilePicked, disabled }: GoogleDrivePickerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Google API configuration
  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

  // Show a simple file input if Google Drive API is not configured
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFilePicked(file);
    }
  };

  useEffect(() => {
    // Only load Google API if credentials are configured
    if (CLIENT_ID && API_KEY) {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client:picker', () => {
          setIsLoaded(true);
        });
      };
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, [CLIENT_ID, API_KEY]);

  const createPicker = () => {
    if (!CLIENT_ID || !API_KEY) {
      console.error('Google Drive API credentials not configured');
      alert('Google Drive integration is not configured. Please contact your administrator to enable this feature.');
      return;
    }

    const pickerCallback = async (data: any) => {
      if (data.action === window.google.picker.Action.PICKED) {
        const file = data.docs[0];
        setIsPickerOpen(false);

        try {
          // Get access token
          const authInstance = window.gapi.auth2.getAuthInstance();
          const currentUser = authInstance.currentUser.get();
          const authResponse = currentUser.getAuthResponse();
          const accessToken = authResponse.access_token;

          // Download the file
          const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (!response.ok) {
            throw new Error('Failed to download file from Google Drive');
          }

          const blob = await response.blob();
          const downloadedFile = new File([blob], file.name, { type: file.mimeType });
          
          onFilePicked(downloadedFile);
        } catch (error) {
          console.error('Error downloading file from Google Drive:', error);
          alert('Failed to download file from Google Drive. Please try again.');
        }
      }
    };

    // Initialize the picker
    window.gapi.client.init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      scope: SCOPES,
    }).then(() => {
      return window.gapi.client.load('drive', 'v3');
    }).then(() => {
      // Sign in the user if needed
      const authInstance = window.gapi.auth2.getAuthInstance();
      if (!authInstance.isSignedIn.get()) {
        return authInstance.signIn();
      }
    }).then(() => {
      // Create and show the picker
      const picker = new window.google.picker.PickerBuilder()
        .setAppId(CLIENT_ID)
        .setOAuthToken(window.gapi.auth.getToken().access_token)
        .addView(
          new window.google.picker.DocsView()
            .setMimeTypes('application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        )
        .setCallback(pickerCallback)
        .build();

      picker.setVisible(true);
      setIsPickerOpen(true);
    }).catch((error: any) => {
      console.error('Error initializing Google Drive picker:', error);
      alert('Failed to connect to Google Drive. Please try again.');
    });
  };

  const openPicker = () => {
    if (!isLoaded) {
      alert('Google Drive picker is still loading. Please try again in a moment.');
      return;
    }

    createPicker();
  };


  return (
    <Button
      variant="outline"
      onClick={openPicker}
      disabled={disabled || isPickerOpen}
      className="w-full"
    >
      <Cloud className="mr-2 h-4 w-4" />
      Google Drive
    </Button>
  );
}