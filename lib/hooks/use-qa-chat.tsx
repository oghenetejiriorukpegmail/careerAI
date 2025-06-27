'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ApplicationQAChat } from '@/components/application-qa-chat';

interface UseQAChatOptions {
  title?: string;
  subtitle?: string;
  jobDescriptionId?: string;
  applicationId?: string;
  documentType?: 'resume' | 'cover-letter';
}

export function useQAChat(options: UseQAChatOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openChat = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const ChatWidget = mounted && isOpen ? createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={closeChat}
      />
      
      {/* Chat positioned in bottom-right */}
      <div className="absolute bottom-4 right-4 w-full max-w-md h-[600px] animate-in slide-in-from-bottom-5 duration-300">
        <ApplicationQAChat
          isOpen={isOpen}
          onClose={closeChat}
          title={options.title}
          subtitle={options.subtitle}
          jobDescriptionId={options.jobDescriptionId}
          applicationId={options.applicationId}
          initialContext={options.documentType ? {
            page: 'generate',
            documentType: options.documentType
          } : undefined}
        />
      </div>
    </div>,
    document.body
  ) : null;

  return {
    ChatWidget,
    openChat,
    closeChat,
    isOpen,
  };
}