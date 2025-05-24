# Replit Deployment Guide for CareerAI

## Prerequisites

1. A Replit account
2. Your Supabase project credentials
3. AI provider API keys (OpenRouter, Gemini, or OpenAI)

## Deployment Steps

### 1. Fork/Import to Replit

1. Log in to your Replit account
2. Click "Create Repl" and select "Import from GitHub"
3. Enter the repository URL or upload the code

### 2. Configure Environment Variables

In the Replit Secrets tab, add the following environment variables:

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key  
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

**AI Provider (at least one required):**
- `AI_PROVIDER`: Set to `openrouter`, `gemini`, or `openai`
- `OPENROUTER_API_KEY`: Your OpenRouter API key (if using OpenRouter)
- `GEMINI_API_KEY`: Your Google Gemini API key (if using Gemini)
- `OPENAI_API_KEY`: Your OpenAI API key (if using OpenAI)

**Optional:**
- `BRIGHT_DATA_USERNAME`: For web scraping features
- `BRIGHT_DATA_PASSWORD`: For web scraping features
- `NEXT_PUBLIC_SITE_URL`: Will be auto-set by Replit

### 3. Install Dependencies

The dependencies will be automatically installed when you run the Repl. If needed, you can manually run:

```bash
npm install
```

### 4. Build and Start

1. Click the "Run" button in Replit
2. The app will build and start automatically
3. Your app will be available at the URL shown in the Replit webview

### 5. Update Site URL

After deployment, update the `NEXT_PUBLIC_SITE_URL` environment variable with your Replit app URL (format: `https://your-app-name.your-username.repl.co`)

## Important Notes

- The app is configured to run on port 3000, which Replit will proxy to port 80
- The `.replit` and `replit.nix` files are pre-configured for optimal performance
- Make sure to set up your Supabase database with the required tables (see `lib/supabase/schema.sql`)
- The app uses Next.js standalone output mode for better Replit compatibility

## Troubleshooting

### Build Errors
- Ensure all required environment variables are set
- Check the console for specific error messages
- Verify your API keys are valid

### Performance Issues
- Replit free tier may have performance limitations
- Consider upgrading to a paid Replit plan for production use
- Enable caching features in the app settings

### Database Connection Issues
- Verify your Supabase credentials are correct
- Check that your Supabase project is active
- Ensure the database schema is properly set up