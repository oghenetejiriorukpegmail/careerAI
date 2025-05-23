# Netlify Environment Variables Setup

Due to AWS Lambda's 4KB limit on environment variables, you need to be selective about which variables to include.

## Required Environment Variables (Add in Netlify Dashboard)

### Essential for App to Function:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Optional AI Providers (Add only the one you use):
Choose ONE of these:
- `OPENROUTER_API_KEY=your_key` (Recommended - supports multiple models)
- `GEMINI_API_KEY=your_key` (Direct Google Gemini access)

### Optional Features:
Only add if you need these features:
- `BRIGHT_DATA_USERNAME` and `BRIGHT_DATA_PASSWORD` (for web scraping)

## Variables NOT to Add

Do not add these in Netlify (they're duplicates or unnecessary):
- `SUPABASE_URL` (use NEXT_PUBLIC_SUPABASE_URL)
- `SUPABASE_ANON_KEY` (use NEXT_PUBLIC_SUPABASE_ANON_KEY)
- `DATABASE_URL` (Supabase handles this)
- `GOOGLE_APPLICATION_CREDENTIALS` (too large for Lambda)
- `PUPPETEER_EXECUTABLE_PATH` (not needed on Netlify)
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` (handled in netlify.toml)

## Configuration Tips

1. Users can configure AI providers through the app's Settings page
2. The app works without Bright Data - it will fall back to basic scraping
3. Google Document AI is optional - basic PDF parsing works without it

## Reducing Environment Variable Size

If you still exceed the 4KB limit:
1. Use shorter variable names
2. Remove any variables with long values
3. Consider using Netlify Functions environment variables instead of site-wide ones