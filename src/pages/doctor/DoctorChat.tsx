import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  directMessageAPI,
  careRelationAPI,
  DirectMessage,
  UserProfile,
  Conversation,
} from '@/lib/supabase';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

export default function DoctorChat() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadConversations();

      // Subscribe to new messages
      const channel = directMessageAPI.subscribeToMessages((newMessage) => {
        // Update conversations list
        loadConversations();

        // If the message is for the currently selected patient, add it to messages
        if (
          selectedPatient &&
          (newMessage.sender_id === selectedPatient.id ||
            newMessage.receiver_id === selectedPatient.id)
        ) {
          setMessages((prev) => [...prev, newMessage]);

          // Mark as read if it's from the patient
          if (newMessage.sender_id === selectedPatient.id) {
            directMessageAPI.markAsRead(selectedPatient.id);
          }
        }
      });

      return () => {
        channel.unsubscribe();
      };
    }
  }, [user, selectedPatient?.id]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all conversations
      const convs = await directMessageAPI.getConversations();
      
      // Filter to only show patients (those with care relations)
      const relations = await careRelationAPI.getAllForCaregiver(user!.id);
      const patientIds = new Set(relations.map((r) => r.patient_id));
      
      const patientConversations = convs.filter((c) =>
        patientIds.has(c.other_user.id)
      );

      setConversations(patientConversations);

      // If no patient is selected but there are conversations, select the first one
      if (!selectedPatient && patientConversations.length > 0) {
        selectPatient(patientConversations[0].other_user);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Failed to load conversations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectPatient = async (patient: UserProfile) => {
    try {
      setSelectedPatient(patient);
      setError(null);

      // Load messages with this patient
      const msgs = await directMessageAPI.getMessages(patient.id);
      setMessages(msgs);

      // Mark messages as read
      await directMessageAPI.markAsRead(patient.id);

      // Update conversations to reflect read status
      setConversations((prev) =>
        prev.map((c) =>
          c.other_user.id === patient.id ? { ...c, unread_count: 0 } : c
        )
      );
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages. Please try again.');
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedPatient) return;

    try {
      setSending(true);
      const newMessage = await directMessageAPI.send(selectedPatient.id, message);
      setMessages((prev) => [...prev, newMessage]);
      
      // Update last message in conversations
      loadConversations();
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('chat.title', 'Patient Messages')}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('chat.doctor_description', 'Chat with your patients')}
        </p>
      </div>

      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-16rem)]">
        {/* Conversations List */}
        <Card className="md:col-span-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold">{t('chat.conversations', 'Conversations')}</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                <MessageSquare className="h-12 w-12 mb-2" />
                <p className="text-center">
                  {t('chat.no_conversations', 'No conversations yet')}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conv) => (
                  <button
                    key={conv.other_user.id}
                    onClick={() => selectPatient(conv.other_user)}
                    className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      selectedPatient?.id === conv.other_user.id
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-blue-600 text-white">
                          {getInitials(conv.other_user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium truncate">
                            {conv.other_user.full_name || conv.other_user.email}
                          </p>
                          {conv.unread_count > 0 && (
                            <Badge variant="destructive" className="ml-2">
                              {conv.unread_count}
                            </Badge>
                          )}
                        </div>
                        {conv.last_message && (
                          <>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {conv.last_message.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {format(
                                new Date(conv.last_message.created_at),
                                'MMM d, HH:mm'
                              )}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className="md:col-span-2 flex flex-col">
          {selectedPatient ? (
            <>
              <ChatHeader user={selectedPatient} />
              <MessageList messages={messages} currentUserId={user!.id} />
              <MessageInput onSend={handleSendMessage} disabled={sending} />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4" />
                <p>{t('chat.select_patient', 'Select a patient to start chatting')}</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}