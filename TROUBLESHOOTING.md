# Troubleshooting Guide

## Common Issues and Solutions

### SSL Certificate Errors

If you encounter SSL certificate errors like "self-signed certificate in certificate chain":

**For Development Only:**
```bash
# Use the modified dev script that bypasses SSL verification
npm run dev

# Or if you need SSL verification
npm run dev:secure
```

**Note:** The `npm run dev` command now includes `NODE_TLS_REJECT_UNAUTHORIZED=0` which disables SSL certificate validation. This is only for development and should NEVER be used in production.

### Rate Limiting Issues

If you see "429 Too Many Requests" errors from Supabase:

1. **Wait for the rate limit to expire** - The login page shows a countdown timer
2. **Check your Supabase dashboard** for rate limit settings
3. **Clear browser cache and cookies** if the issue persists
4. **Use a different email** for testing if one is rate-limited

The app includes automatic rate limit detection and displays a user-friendly countdown timer.

### Authentication Issues

1. **Check Supabase credentials** in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

2. **Verify email confirmation** - New accounts may need email verification

3. **Check Supabase Auth settings** - Ensure email/password auth is enabled

### Font Loading Errors

If Google Fonts fail to load due to SSL issues, the app will automatically fall back to system fonts.

### Development Server Issues

1. **Clear Next.js cache**:
   ```bash
   rm -rf .next
   npm run dev
   ```

2. **Check port availability**:
   ```bash
   # Check if port 3000 is in use
   lsof -i :3000
   ```

3. **Update dependencies**:
   ```bash
   npm install
   ```

## Contact Support

If issues persist, please check the project's issue tracker or contact the development team.