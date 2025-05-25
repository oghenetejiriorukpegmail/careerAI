# Google Drive Integration Setup Guide

## Prerequisites
- Google account
- Access to Google Cloud Console

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name: "CareerAI" (or your preferred name)
4. Click "Create"

## Step 2: Enable Google Drive API

1. Navigate to "APIs & Services" → "Library"
2. Search for "Google Drive API"
3. Click on it and press "Enable"

## Step 3: Configure OAuth Consent Screen

**This is crucial for the picker to work!**

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type
3. Fill in the following:
   - App name: CareerAI
   - User support email: your email
   - Developer contact: your email
4. Add Authorized domains:
   - For Replit: `repl.co`
   - For local dev: Skip this (localhost is automatically allowed)
   - For custom domain: Add your domain
5. Add scopes:
   - Click "Add or Remove Scopes"
   - Search and select: `https://www.googleapis.com/auth/drive.readonly`
6. Add test users (while in development):
   - Add your email and any test user emails
7. Save and continue through all steps

## Step 4: Create OAuth 2.0 Client ID

1. Go to "APIs & Services" → "Credentials"
2. Click "+ CREATE CREDENTIALS" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "CareerAI Web Client"
5. Authorized JavaScript origins (add all that apply):
   ```
   http://localhost:3000
   https://your-app-name.your-username.repl.co
   https://yourdomain.com
   ```
6. Authorized redirect URIs (same as origins):
   ```
   http://localhost:3000
   https://your-app-name.your-username.repl.co
   https://yourdomain.com
   ```
7. Click "Create"
8. Copy the Client ID (ends with .apps.googleusercontent.com)

## Step 5: Create API Key

1. Go to "APIs & Services" → "Credentials"
2. Click "+ CREATE CREDENTIALS" → "API key"
3. Copy the API key
4. Click "Restrict Key"
5. Application restrictions:
   - HTTP referrers (web sites)
   - Add allowed referrers:
     ```
     http://localhost:3000/*
     https://*.repl.co/*
     https://yourdomain.com/*
     ```
6. API restrictions:
   - Restrict key to: Google Drive API
7. Save

## Step 6: Add to Environment Variables

Add to your `.env.local` or Replit Secrets:

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_API_KEY=your-api-key-here
```

## Common Issues & Solutions

### "Failed to initialize Google Drive"
- Check that both CLIENT_ID and API_KEY are set correctly
- Verify OAuth consent screen is configured
- Make sure your domain is in the authorized origins

### "Sign in error"
- Add your email to test users in OAuth consent screen
- Check that the redirect URI matches exactly
- Clear browser cookies and try again

### "Unauthorized origin"
- Add your current URL to both Authorized JavaScript origins AND redirect URIs
- For Replit, use the full URL including subdomain
- Wait a few minutes for changes to propagate

### CORS/CSP Errors
- These are normal in development with localhost
- Should not occur in production with proper domain setup

## Testing

1. Click "Google Drive" button
2. Sign in with a Google account (must be in test users list)
3. Grant permissions when prompted
4. Select a PDF or DOCX file
5. File should be downloaded and processed

## Production Considerations

1. Verify your app with Google (removes "unverified app" warning)
2. Move from "Testing" to "In production" status
3. Consider implementing refresh token handling
4. Add proper error handling and user feedback

## Security Notes

- Never commit API keys to version control
- Use environment variables
- Restrict API key to specific domains
- Regularly rotate credentials
- Monitor usage in Google Cloud Console