# CareerAI

CareerAI is an AI-powered job application platform that helps users optimize their job search process by generating tailored resumes and cover letters, matching with relevant job opportunities, and providing LinkedIn profile optimization suggestions.

## Features

- **ATS-Optimized Resume Generation**: Create custom resumes tailored to specific job descriptions that will pass through Applicant Tracking Systems.
- **Cover Letter Generation**: Generate personalized cover letters that highlight your relevant skills and express genuine interest in the role.
- **Job Matching**: Discover relevant job opportunities from major job boards (Indeed, LinkedIn, Dice) matched to your profile.
- **Application Tracking**: Centralized dashboard to track all your job applications and their statuses.
- **LinkedIn Profile Optimization**: Get actionable suggestions to improve your LinkedIn profile visibility and attractiveness to recruiters.
- **Flexible Authentication**: Optional user authentication - core features work without login, authentication enables persistent settings and advanced features.

## Tech Stack

- **Frontend**: Next.js, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Serverless with Supabase Functions
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **AI Models**: Qwen 3 30B (via OpenRouter), Gemini 2.5 Pro Exp
- **Web Scraping**: Bright Data MCP (Mobile Carrier Proxies)

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Supabase account
- OpenRouter API key (for Qwen model)
- Gemini API key (optional, for fallback)
- Bright Data MCP account (for web scraping)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/careerai.git
cd careerai
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables by creating a `.env.local` file in the root directory:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_SECRET=your_supabase_service_role_secret
OPENROUTER_API_KEY=your_openrouter_api_key
GEMINI_API_KEY=your_gemini_api_key
BRIGHT_DATA_USERNAME=your_bright_data_username
BRIGHT_DATA_PASSWORD=your_bright_data_password
```

4. Set up the database schema by running the SQL in `lib/supabase/schema.sql` in your Supabase SQL editor.

5. Set up storage bucket policies by running the SQL in `supabase/storage-policies.sql` in your Supabase SQL editor.

6. Run the development server
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Authentication & Data Persistence

CareerAI uses a flexible authentication model:

- **Core Features**: All AI processing, resume generation, and job matching work without authentication
- **Optional Authentication**: User login enables additional features:
  - Persistent AI settings in database
  - Document history and management
  - Job application tracking
  - Profile optimization features

**Settings Persistence:**
- **Without Authentication**: Settings stored in memory during session
- **With Authentication**: Settings automatically saved to Supabase database
- All AI processing respects user-configured provider and model preferences

## Deployment

### Netlify Deployment

1. Push your code to a GitHub repository.
2. Connect your repository to Netlify.
3. Configure the build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
4. Add your environment variables in the Netlify dashboard.
5. Deploy the site.

### Replit Deployment

1. Import your repository to Replit.
2. Configure the run command: `npm run dev`
3. Add your environment variables in the Replit Secrets tab.
4. Run the application.

## Project Structure

```
careerai/
├── app/                       # Next.js App Router
│   ├── dashboard/             # Dashboard pages
│   ├── login/                 # Authentication pages
│   ├── signup/                # User registration
│   └── ...                    
├── components/                # Reusable UI components
│   ├── ui/                    # shadcn/ui components
│   └── ...                    
├── lib/                       # Utilities and shared code
│   ├── supabase/              # Supabase client and schema
│   └── utils.ts               # Utility functions
├── public/                    # Static assets
└── ...
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Troubleshooting

### Storage Upload Errors

If you encounter "Unauthorized" or "row-level security policy" errors when uploading files:

1. Check that you've set up the RLS policies by running the SQL in `supabase/storage-policies.sql`
2. Make sure you're using the `/api/upload` endpoint rather than direct Supabase client uploads
3. Ensure file paths include the user ID as the first folder segment (e.g., `{user_id}/filename.pdf`)

The application implements two approaches to handle file uploads:
- **API-based Upload**: Uses the service role key to bypass RLS policies (`/api/upload` endpoint)
- **Direct Upload**: Requires proper RLS policies to be set up in Supabase

### PDF Parsing Errors

If you encounter errors related to PDF parsing in the browser:

1. The PDF parsing is performed server-side via the `/api/documents/parse` endpoint
2. Make sure you're using the API endpoint rather than trying to parse PDFs directly in the browser

## Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Supabase](https://supabase.com/) - The Open Source Firebase Alternative
- [shadcn/ui](https://ui.shadcn.com/) - Re-usable components built with Radix UI and Tailwind CSS
- [OpenRouter](https://openrouter.ai/) - API access to Qwen model
- [Bright Data](https://brightdata.com/) - Web scraping infrastructure