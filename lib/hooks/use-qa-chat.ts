'use client';

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ApplicationQAChat from '@/components/application-qa-chat';

interface UseQAChatOptions {
  jobDescriptionId?: string;
  jobApplicationId?: string;
  documentType?: 'resume' | 'cover_letter';
}

export function useQAChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<UseQAChatOptions>({});

  const openChat = useCallback((options?: UseQAChatOptions) => {
    if (options) {
      setContext(options);
    }
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const ChatWidget = useCallback(() => {
    if (!isOpen || typeof window === 'undefined') return null;

    return createPortal(
      <ApplicationQAChat
        context={context}
        isFloating
        onClose={closeChat}
      />,
      document.body
    );
  }, [isOpen, context, closeChat]);

  return {
    openChat,
    closeChat,
    ChatWidget,
    isOpen,
  };
}