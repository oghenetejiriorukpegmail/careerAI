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
- Primary: Qwen 3 30B model via OpenRouter
- Secondary: Gemini 2.5 Pro Exp
- Models are used for document parsing, content generation, and job matching

### External Services
- Bright Data MCP for web scraping LinkedIn profiles and job boards (Indeed, LinkedIn, Dice)

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

