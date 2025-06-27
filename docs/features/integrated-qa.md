# Integrated Q&A Feature

## Overview

The integrated Q&A feature is part of the job application workflow, allowing users to prepare answers for common application questions. These answers are stored with each application for future reference.

## Implementation Details

### Database Schema

Added to `job_applications` table:
- `application_questions` (JSONB): Array of Q&A pairs with structure:
  ```json
  [{
    "question": "string",
    "answer": "string", 
    "generated_at": "timestamp"
  }]
  ```

### API Endpoints

**GET /api/applications/[id]/questions**
- Retrieves all Q&A pairs for an application
- Returns question templates and job information

**POST /api/applications/[id]/questions**
- Generates AI-powered answer for a question
- Parameters: `question` (string), `regenerate` (boolean)
- Uses job description, resume, and cover letter context

**DELETE /api/applications/[id]/questions**
- Removes a specific question/answer pair
- Query parameter: `question` (string)

### Frontend Component

`ApplicationQAIntegrated` component features:
- **Quick Templates**: Pre-defined common questions
- **Custom Questions**: User can input any question
- **Saved Answers**: View/manage all generated answers
- **Actions**: Copy, regenerate, or delete answers

### Question Templates

8 predefined templates across categories:
- Motivation & Interest
- Qualifications & Skills
- Company Knowledge
- Professional Experience
- Achievements
- Behavioral
- Value Proposition
- Career Goals

### AI Generation

The system uses AI to generate contextual answers:
1. Analyzes job description requirements
2. References user's resume and cover letter
3. Maintains truthfulness - only uses actual user information
4. Generates professional, concise answers (2-3 paragraphs)

### User Experience

1. User expands Q&A section from application card
2. Selects template or enters custom question
3. AI generates answer using application context
4. Answer is saved with the application
5. User can copy, regenerate, or delete answers

## Security & Integrity

- All answers are generated from user's actual experience
- No fabrication of skills or achievements
- Answers are user-specific and application-specific
- Authentication required for all operations