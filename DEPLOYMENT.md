# CareerAI Production Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Domain name (optional)

## Environment Setup

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Fill in your environment variables:
- **Required**: Supabase URL, Anon Key, and Service Role Key
- **Optional**: AI provider keys (users can configure in app settings)

## Database Setup

1. Run the Supabase migrations:
```bash
# Apply the schema
psql -h <your-supabase-host> -U postgres -d postgres < lib/supabase/schema.sql
```

2. Set up storage buckets and policies:
```bash
# Apply storage policies
psql -h <your-supabase-host> -U postgres -d postgres < supabase/storage-policies.sql
```

## Build for Production

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Test the production build locally
npm start
```

## Deployment Options

### Vercel (Recommended)
1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Netlify
1. Push your code to GitHub
2. Import project in Netlify
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Add environment variables
6. Deploy

### Self-Hosted
1. Build the application: `npm run build`
2. Start with PM2: `pm2 start npm --name "careerai" -- start`
3. Set up Nginx reverse proxy
4. Configure SSL with Let's Encrypt

## Performance Optimizations

- The app is optimized for mobile-first experience
- Images are served in modern formats (AVIF, WebP)
- JavaScript is minified and compressed
- Static assets are cached

## Security Checklist

- [ ] All API keys are in environment variables
- [ ] Supabase RLS policies are enabled
- [ ] CORS is properly configured
- [ ] Rate limiting is implemented
- [ ] Input validation is in place

## Monitoring

- Set up error tracking (e.g., Sentry)
- Monitor API usage and costs
- Track user analytics (optional)

## Maintenance

- Regularly update dependencies
- Monitor Supabase usage and limits
- Check AI provider quotas
- Review error logs