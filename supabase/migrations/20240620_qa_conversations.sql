-- Create qa_conversations table
CREATE TABLE IF NOT EXISTS qa_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT, -- For non-authenticated users
  job_description_id UUID REFERENCES job_descriptions(id) ON DELETE SET NULL,
  application_id UUID REFERENCES job_applications(id) ON DELETE SET NULL,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create qa_messages table
CREATE TABLE IF NOT EXISTS qa_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES qa_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_qa_conversations_user_id ON qa_conversations(user_id);
CREATE INDEX idx_qa_conversations_session_id ON qa_conversations(session_id);
CREATE INDEX idx_qa_conversations_job_description_id ON qa_conversations(job_description_id);
CREATE INDEX idx_qa_conversations_application_id ON qa_conversations(application_id);
CREATE INDEX idx_qa_messages_conversation_id ON qa_messages(conversation_id);
CREATE INDEX idx_qa_messages_created_at ON qa_messages(created_at);

-- Enable RLS
ALTER TABLE qa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for qa_conversations
CREATE POLICY "Users can view their own conversations" ON qa_conversations
  FOR SELECT USING (
    auth.uid() = user_id OR
    session_id IS NOT NULL
  );

CREATE POLICY "Users can create conversations" ON qa_conversations
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    (user_id IS NULL AND session_id IS NOT NULL)
  );

CREATE POLICY "Users can update their own conversations" ON qa_conversations
  FOR UPDATE USING (
    auth.uid() = user_id OR
    session_id IS NOT NULL
  );

-- RLS policies for qa_messages
CREATE POLICY "Users can view messages in their conversations" ON qa_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM qa_conversations
      WHERE qa_conversations.id = qa_messages.conversation_id
      AND (qa_conversations.user_id = auth.uid() OR qa_conversations.session_id IS NOT NULL)
    )
  );

CREATE POLICY "Users can create messages in their conversations" ON qa_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM qa_conversations
      WHERE qa_conversations.id = qa_messages.conversation_id
      AND (qa_conversations.user_id = auth.uid() OR qa_conversations.session_id IS NOT NULL)
    )
  );

-- Service role can do everything
CREATE POLICY "Service role has full access to conversations" ON qa_conversations
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to messages" ON qa_messages
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');