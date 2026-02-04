# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development & Build
```bash
npm run dev              # Start dev server on port 3000 with SSL cert warnings bypassed
npm run dev:secure       # Start dev server with TLS enforcement (for OAuth callbacks)
npm run build            # Create production build (run before deployment)
npm run lint             # Run ESLint with Next.js & Tailwind rules
```

### Testing
```bash
npx vitest run test/application-qa.test.ts  # Run AI Q&A scoring tests
npx vitest run                               # Run all tests
npx vitest run --watch                       # Watch mode for TDD
```

### Production & Workers
```bash
npm run start            # Production server from build artifacts
npm run start:replit     # Replit-specific production server
npm run worker           # Run job processing worker (scripts/job-worker-entry.js)
npm run dev:all          # Run dev server + worker concurrently
```

### Database Migrations
```bash
node scripts/run-migration.js check    # Check current schema status
node scripts/run-migration.js migrate  # Apply missing columns
```

### Path Aliases
Use `@/*` for imports (e.g., `import { queryAI } from '@/lib/ai/config'`)

## High-Level Architecture

### AI Document Generation Pipeline
The system uses a multi-model approach with user-configurable preferences:

1. **Model Selection** (`/lib/ai/token-manager.ts`):
   - Primary: User's selected model from settings (devstral-small:free by default)
   - Free Options: Kimi K2, Grok-4-fast:free (2M tokens), Qwen models, GLM-4.7:free (128K), DeepSeek-R1-Zero, devstral-small
   - Paid Options: GPT-5.2, GPT-5.2 Pro (512K), Claude Opus 4.5, Claude Sonnet 4.5, Claude Haiku 4.5 (Latest), GPT-5, GPT-5.1, Gemini 3 Preview, Gemini 3 Flash Preview, Grok-4, Grok-4-fast, GLM-4.7 (200K), GPT-4o
   - Fallback: Claude Sonnet 4 via OpenRouter on errors only
   - Vision Models: Latest multimodal including GPT-5.2, Gemini 3 Flash/Pro, Claude 4.5 series, Grok-4
   - Settings stored in `user_settings` table and synced to localStorage

2. **Resume Generation** (`/lib/ai/document-generator.ts`):
   - Extracts user data from uploaded resume (NEVER fabricates)
   - Analyzes job description for ATS keywords
   - Creates tailored resume maintaining 100% truthfulness
   - Generates in multiple formats (PDF, DOCX, TXT)

3. **Job Processing** (`/lib/utils/job-processor.ts`):
   - Queue-based async processing with status tracking
   - Handles specific job requests vs queue processing
   - Saves all document formats to Supabase storage

### AI Provider Configuration
The `queryAI()` function in `/lib/ai/config.ts` routes to different AI providers:
- **OpenRouter**: Primary routing layer supporting multiple models (Claude, GPT, Qwen, etc.)
- **Requesty Router**: Alternative router for Claude/Anthropic models
- **Direct Providers**: Google (Gemini), OpenAI, Anthropic can be used directly
- **Settings Loading**: Client-side loads from localStorage first, then API; server-side uses cached settings or defaults
- **Streaming Support**: OpenRouter uses streaming for long-running requests to prevent TCP timeouts
- **Response Cleaning**: All providers strip markdown code blocks, normalize JSON, and fix common formatting issues

### File Naming Convention
All generated documents follow strict naming:
`{Company}_{LASTNAME}_{JobTitle}_{DocumentType}_{YYYY-MM-DD}_{HHMM}.{ext}`

### Authentication & Session Management
- Supabase Auth with both UUID and session-based user IDs
- Row Level Security (RLS) policies on all user data
- Session persistence across dashboard navigation
- **Flexible Auth**: Core features work without authentication; login enables persistent settings and history

### Web Scraping & Data Extraction
- Bright Data MCP for job board scraping (Indeed, LinkedIn, Dice)
- Puppeteer MCP for browser automation
- Jina.ai Reader API for intelligent content extraction (via `/lib/scraping/jina-scraper.ts`)

### Document Processing Flow
1. User uploads resume → PDF/DOCX parsing → AI extraction → Store in `resumes` table
2. Job description input → Extract requirements → Store in `job_descriptions` table
3. Generate documents → Save to storage → Track in `generated_resumes` table
4. Download via API routes with proper content types (PDF/DOCX/TXT)

**Important Implementation Details:**
- **Chronological Sorting**: All experience entries are automatically sorted by most recent first across all formats (PDF, DOCX, TXT, and view page)
- **Format Parity**: PDF, DOCX, and TXT generators produce identical information including:
  - Experience: title, company, location, dates, summary, descriptions, technologies
  - Education: degree, field, institution, location, graduation date/year, GPA
  - Projects: name, description, date, technologies, URL
  - Languages: language name and proficiency level
- **TXT Generation**: Reconstructed from resume data (NOT PDF conversion) to ensure exact parity
- See `/lib/documents/` for PDF/DOCX generators and `/app/api/documents/[id]/txt/route.ts` for TXT extraction

## Critical Requirements

### Resume Truthfulness (NEVER VIOLATE)
The AI MUST maintain absolute truthfulness when generating documents:
- Use ONLY information from user's uploaded resume
- NEVER invent experiences, skills, or achievements
- NEVER add qualifications the user doesn't have
- Allowed: Reword for ATS, reorganize, use synonyms

### AI Response Handling
When processing AI responses (especially for resume parsing):
- Responses may contain `<think>` tags that must be stripped before JSON parsing
- Markdown code blocks (```json) should be removed
- Extract JSON from first `{` to last `}` if wrapped in other content
- Location: `/app/api/resumeupload/route.ts` - see `extractJSONFromResponse()` function
- All AI providers in `/lib/ai/config.ts` include automatic response cleaning and JSON normalization

### Resume Editing Features
- **Stored Resumes**: Users can edit stored resumes directly from the resume view page
- **Add Experience**: "Add Experience" button allows adding new jobs to existing resumes
- **Manual Edit Dialog**: Supports editing arrays, objects, and nested fields with drag-and-drop reordering
- **Field Validation**: Proper initialization of array fields (e.g., description bullets) to prevent crashes
- **Empty States**: User-friendly messages when sections have no content yet

## Project Structure
```
app/
├── api/               # Next.js API routes
├── dashboard/         # Protected user pages
└── auth/              # Authentication flows

lib/
├── ai/                # AI model orchestration (config, token-manager, document-generator)
├── documents/         # PDF/DOCX/TXT generators
├── supabase/          # Database client & types
├── scraping/          # Jina.ai web scraper
└── utils/             # Job processing, helpers

components/
├── ui/                # shadcn primitives
└── [features]/        # Domain components

scripts/               # Job worker entry point, migrations
supabase/              # SQL migrations, storage policies
docs/                  # Reviewer guides
test/                  # Vitest test suites
mcp-servers/           # MCP server implementations (GitHub, Puppeteer)
```

## Environment Variables
Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_SECRET` for admin operations
- `OPENROUTER_API_KEY` for AI models
- `GOOGLE_GENERATIVE_AI_API_KEY` or `GEMINI_API_KEY` for Gemini
- `ANTHROPIC_API_KEY` for direct Claude access (optional)
- `OPENAI_API_KEY` for direct OpenAI access (optional)
- `ROUTER_API_KEY` for Requesty Router (optional)
- `BRIGHT_DATA_USERNAME` & `BRIGHT_DATA_PASSWORD` for web scraping
- `JINA_API_KEY` for content extraction

## Testing Strategy
- Unit tests for AI prompt validation in `test/application-qa.test.ts`
- Manual testing of document generation with truthfulness checks
- Verify all formats (PDF, DOCX, TXT) have identical content
- Test job-specific processing with queue disabled
- Test files follow `*.test.ts` naming convention
- Run tests with `npx vitest run` or `npx vitest run --watch`

## Code Style Guidelines
- TypeScript with 2-space indentation, strict mode enabled
- React components: PascalCase
- Hooks/utilities: camelCase
- Feature folders: kebab-case (e.g., `career-tracker/`)
- Favor Tailwind utility composition; promote repeated patterns into `components/ui/`
- Read environment variables in `lib/` helpers to keep server/client boundaries explicit
- Conventional Commit prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
- Keep commits scoped and single-purpose, under ~72 characters

## Pull Request Guidelines
- Summarize intent, list verification commands, link issues
- Attach UI captures for visual changes
- Call out Supabase schema or policy updates explicitly with relevant SQL from `supabase/`
