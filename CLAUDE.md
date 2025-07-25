# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

For maximum efficiency, whenever you need to perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially
## Project Overview

CareerAI is an AI-Assisted Job Application App that helps users optimize their job search process. The application:

1. Processes user resumes and LinkedIn profiles
2. Analyzes job descriptions
3. Generates ATS-optimized resumes and cover letters
4. Matches users with relevant job opportunities
5. Provides LinkedIn profile optimization suggestions
6. Offers a dashboard to track job applications

## Technical Architecture

### Database
- Supabase PostgreSQL database for storing user data, resumes, and job application tracking
- Connection details are available in PRD.md and prompt files

### AI Models
- Primary: User-configurable via settings page (currently anthropic/claude-sonnet-4 via OpenRouter)
- Default fallback options: mistralai/devstral-small-2505:free, moonshotai/kimi-k2:free via OpenRouter
- Fallback: anthropic/claude-sonnet-4 via OpenRouter (200K context for large resumes)
- Models are used for document parsing, content generation, and job matching
- Note: Claude Sonnet 4 is provided by OpenRouter, not Requesty
- ✅ Fixed Architecture Updates:
  1. Respects user choice: Always uses the AI model selected in user settings (e.g., Grok-4)
  2. No preemptive fallback: Doesn't force Claude Sonnet 4 based on content size
  3. Error-based fallback: Only falls back to Claude Sonnet 4 if the selected model fails with an error
  4. Proper token limits: Each model now has correct context limits (Grok-4: 256K, Kimi-K2: 60K, etc.)

  🔄 Flow:
  1. Load user's preferred model from settings
  2. Try to generate resume with that model
  3. If it fails (network error, token limit exceeded, etc.), the existing fallback logic in queryAI will try Claude Sonnet 4
  4. Only then would it fall back

### External Services
- Bright Data MCP for web scraping LinkedIn profiles and job boards (Indeed, LinkedIn, Dice)
- Puppeteer MCP for browser automation and advanced web scraping capabilities
- Jina.ai Reader API for intelligent web content extraction and job description scraping

### Deployment
- Application will be deployed on Replit
- Consider serverless function limitations (execution time, memory)

## Development Guidelines

### Code Structure
- No single file should exceed 500 lines to maintain modularity and readability
- AI functionality should be modular (separate functions for parsing, analysis, generation)

### Security Considerations
- Never commit API keys or credentials (they should be in environment variables)
- Follow secure practices for handling user data
- Implement protection against common web vulnerabilities (XSS, CSRF, SQLi)

### 🔒 CRITICAL: Resume Integrity & Truthfulness

**This is the most important requirement in the entire codebase:**

The AI document generation system MUST maintain absolute truthfulness. When generating resumes or cover letters:

1. **STRICT RULES - NEVER VIOLATE:**
   - Use ONLY information from the user's uploaded resume
   - NEVER invent experiences, skills, or achievements
   - NEVER add qualifications the user doesn't have
   - NEVER embellish metrics or accomplishments
   - NEVER create false employment history

2. **ALLOWED OPERATIONS:**
   - Reword existing content for ATS optimization
   - Reorganize information for better impact
   - Use professional synonyms for existing skills
   - Format achievements with action verbs
   - Connect real experience to job requirements

3. **IMPLEMENTATION:**
   - Location: `/lib/ai/document-generator.ts`
   - Functions: `generateAtsResume()` and `generateCoverLetter()`
   - Both system and user prompts enforce these rules
   - Multiple layers of instructions prevent fabrication

4. **WHY THIS MATTERS:**
   - Users must defend claims in interviews
   - False info = immediate termination risk
   - Legal and ethical implications
   - Trust and reputation protection

**Testing:** Any modifications to AI prompts MUST be tested to ensure no fabrication is possible.

## Data Flow

1. **User Data Ingestion**:
   - Parse uploaded resumes (PDF, DOCX)
   - Extract LinkedIn profile data via Bright Data MCP
   - Structure and store user information in Supabase

2. **Job Description Analysis**:
   - Parse job descriptions (text or via URL)
   - Extract key requirements and ATS keywords

3. **Document Generation**:
   - Create customized, ATS-optimized resumes
   - Generate targeted cover letters
   - Format as downloadable PDFs

4. **Job Matching**:
   - Crawl job boards using Bright Data MCP
   - Match postings to user profiles
   - Present curated job opportunities

5. **Profile Optimization**:
   - Analyze LinkedIn profiles
   - Provide actionable improvement suggestions

6. **Application Tracking**:
   - Manage job application lifecycle
   - Track status of applications
   - Store generated documents