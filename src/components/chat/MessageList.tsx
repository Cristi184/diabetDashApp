import { useEffect, useRef } from 'react';
import { DirectMessage } from '@/lib/supabase';
import { MessageBubble } from './MessageBubble';
import { format, isToday, isYesterday } from 'date-fns';

interface MessageListProps {
  messages: DirectMessage[];
  currentUserId: string;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  let lastDate: string | null = null;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No messages yet. Start the conversation!</p>
        </div>
      ) : (
        <>
          {messages.map((message) => {
            const messageDate = new Date(message.created_at);
            const dateLabel = getDateLabel(messageDate);
            const showDateLabel = dateLabel !== lastDate;
            lastDate = dateLabel;

            return (
              <div key={message.id}>
                {showDateLabel && (
                  <div className="flex justify-center my-4">
                    <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full">
                      {dateLabel}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={message}
                  isOwn={message.sender_id === currentUserId}
                />
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}