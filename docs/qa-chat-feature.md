# Q&A Chat Feature Documentation

## Overview

The Q&A Chat feature provides a real-time, conversational interface for users to get career advice, ask questions about job applications, and receive guidance throughout their job search process. The chat uses a messenger-style UI with streaming responses for better user experience.

## Features

### 1. Real-time Streaming Chat
- Server-Sent Events (SSE) for real-time message streaming
- Typing indicators show when the AI is composing a response
- Smooth animations and transitions
- Message history with timestamps

### 2. Context-Aware Responses
- Automatically understands the context (job description, application, document type)
- References specific job details when available
- Maintains conversation history for coherent dialogue
- Provides relevant suggestions based on the current page/task

### 3. Quick Reply Buttons
- Dynamic quick reply suggestions based on conversation flow
- Common actions like "Generate Resume", "Interview Questions", etc.
- One-click access to frequently asked questions

### 4. Floating Widget Support
- Can be used as a standalone component or floating widget
- Minimize/maximize functionality
- Persistent across page navigation when used as a widget

### 5. Conversation Management
- Export conversations as text files
- Archive old conversations
- Persistent storage in database
- Support for both authenticated and session-based users

## Usage

### 1. As a Floating Widget (Recommended for job pages)

```typescript
import { useQAChat } from '@/lib/hooks/use-qa-chat';

export default function JobDetailPage() {
  const { openChat, ChatWidget } = useQAChat();
  
  return (
    <>
      {/* Your page content */}
      <Button onClick={() => openChat({ jobDescriptionId: jobId })}>
        Ask Career Advisor
      </Button>
      
      {/* Render the chat widget */}
      <ChatWidget />
    </>
  );
}
```

### 2. As an Embedded Component

```typescript
import ApplicationQAChat from '@/components/application-qa-chat';

export default function DocumentGenerationPage() {
  return (
    <Card>
      <CardContent className="h-[500px]">
        <ApplicationQAChat
          context={{
            documentType: 'resume',
            jobDescriptionId: selectedJob,
          }}
          className="h-full"
        />
      </CardContent>
    </Card>
  );
}
```

### 3. Context Options

The chat accepts the following context options:

```typescript
interface ConversationContext {
  jobDescriptionId?: string;      // ID of the job being viewed
  jobApplicationId?: string;      // ID of an existing application
  documentType?: 'resume' | 'cover_letter';  // Type of document being generated
}
```

## Database Schema

The feature uses two main tables:

### qa_conversations
- Stores conversation metadata
- Links to job descriptions and applications
- Tracks conversation status (active/archived)

### qa_messages
- Stores individual messages
- Includes role (user/assistant)
- Metadata for quick replies and other features

## API Endpoints

### POST /api/application-qa-stream
- Creates new conversations
- Streams chat responses in real-time
- Handles message sending with SSE

### GET /api/application-qa-stream
- Retrieves conversation history
- Lists user's conversations
- Exports conversations

## Setup Instructions

1. **Apply Database Migration**
   ```bash
   node scripts/apply-qa-migration.js
   ```

2. **Environment Variables**
   Ensure your AI provider credentials are set:
   ```
   OPENROUTER_API_KEY=your_key
   GEMINI_API_KEY=your_key
   ```

3. **Import Components**
   The chat components are ready to use - just import and integrate as shown above.

## Best Practices

1. **Context is Key**: Always provide relevant context (job ID, application ID) when opening the chat
2. **Persistent Widget**: Use the floating widget for job-related pages to maintain conversation across navigation
3. **Embedded for Focus**: Use embedded mode for dedicated help sections or document generation flows
4. **Export Important Conversations**: Users can export conversations for future reference

## Customization

### Styling
The component uses Tailwind CSS and can be customized via:
- The `className` prop for container styling
- CSS variables for theme colors
- Component-specific classes for fine-tuning

### Quick Replies
Quick replies are dynamically generated based on:
- Current conversation context
- Keywords in user messages
- AI response content

### AI Behavior
The AI assistant behavior can be customized by modifying the system prompt in `/lib/ai/qa-conversation.ts`

## Security Considerations

- All conversations are scoped to the user (authenticated or session-based)
- RLS policies ensure users can only access their own conversations
- Session IDs are used for non-authenticated users
- No sensitive data is exposed through the streaming endpoint