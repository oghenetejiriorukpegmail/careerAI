# Application Q&A Feature Documentation

## Overview

The Application Q&A feature provides intelligent, context-aware responses to job application questions based on the user's resume, cover letter, and job description. It ensures all responses are truthful and based solely on the user's actual experience.

## Features

- **Contextual Responses**: Generates answers based on your actual resume and job description
- **Confidence Scoring**: Shows how well your experience supports each answer
- **Key Points Tracking**: Highlights which parts of your resume were used
- **Question History**: Saves all Q&As for future reference
- **Suggested Questions**: Common interview questions to practice with
- **Follow-up Suggestions**: Recommends related questions to prepare for

## API Endpoints

### POST /api/application-qa
Generate a response to an application question.

**Request Body:**
```json
{
  "question": "Why are you interested in this position?",
  "jobDescriptionId": "uuid",
  "resumeId": "uuid (optional - uses latest if not provided)",
  "coverLetterId": "uuid (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "response": {
    "answer": "Professional response text...",
    "confidenceScore": 0.85,
    "keyPointsUsed": [
      "5 years of experience in similar role",
      "Relevant certification in the field"
    ],
    "suggestedFollowUp": "What specific projects have you led?"
  }
}
```

### GET /api/application-qa
Retrieve Q&A history for a user.

**Query Parameters:**
- `jobDescriptionId` (optional): Filter by specific job

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "id": "uuid",
      "question": "Question text",
      "answer": "Answer text",
      "confidence_score": 0.85,
      "created_at": "2024-01-20T10:30:00Z",
      "metadata": {
        "keyPointsUsed": [...],
        "suggestedFollowUp": "..."
      }
    }
  ]
}
```

## Component Usage

### Basic Integration

```tsx
import { ApplicationQAStandalone } from '@/components/application-qa-standalone';

function YourPage() {
  return (
    <ApplicationQAStandalone
      jobDescriptionId="job-uuid"
      resumeId="resume-uuid" // optional
      coverLetterId="cover-letter-uuid" // optional
      className="mt-6"
    />
  );
}
```

### Minimal Integration

For a simpler integration, you can use the API directly:

```tsx
const response = await fetch('/api/application-qa', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: "Your question here",
    jobDescriptionId: "job-id"
  })
});
```

## Confidence Score Interpretation

- **0.9-1.0**: High Confidence - Answer fully supported by strong, directly relevant experience
- **0.7-0.8**: Medium Confidence - Answer well-supported with relevant but not exact matches
- **0.5-0.6**: Moderate Confidence - Answer partially supported, using transferable skills
- **0.3-0.4**: Low Confidence - Limited support, focusing on potential and willingness to learn
- **0.0-0.2**: Very Low Confidence - Very limited relevant information available

## Database Schema

The feature uses the `application_qa_history` table:

```sql
CREATE TABLE application_qa_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  job_description_id UUID NOT NULL,
  resume_id UUID,
  cover_letter_id UUID,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Security & Integrity

### Truthfulness Guarantee

The system implements multiple layers of protection against fabrication:

1. **System Prompts**: Explicitly instruct the AI to use only provided information
2. **Validation**: Responses are checked against source documents
3. **Confidence Scoring**: Low scores indicate when information is limited
4. **Key Points Tracking**: Every claim can be traced to source material

### Privacy & Access Control

- Users can only access their own Q&A history
- Job descriptions must belong to the user
- Row-level security (RLS) policies enforce access control

## Common Use Cases

1. **Interview Preparation**: Practice answering common interview questions
2. **Application Forms**: Get help with open-ended application questions
3. **Cover Letter Ideas**: Generate talking points for cover letters
4. **Self-Assessment**: Understand how well you match job requirements

## Best Practices

1. **Review Generated Answers**: Always personalize AI suggestions with your own voice
2. **Practice Aloud**: Use the responses as a starting point for verbal practice
3. **Track Confidence**: Focus extra preparation on low-confidence areas
4. **Save Important Q&As**: The history feature helps you prepare consistently

## Troubleshooting

### Low Confidence Scores
- Add more details to your resume
- Ensure job description is complete
- Consider highlighting transferable skills

### Generic Responses
- Ask more specific questions
- Reference particular requirements from the job
- Include context in your questions

### API Errors
- Ensure you're authenticated
- Check that job description exists
- Verify resume has been uploaded

## Future Enhancements

- Bulk question generation for specific interviews
- Interview simulation mode
- Response improvement suggestions
- Multi-language support
- Voice input/output for practice