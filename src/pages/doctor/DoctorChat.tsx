import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import {
  careRelationAPI,
  type CareRelation,
} from '@/lib/supabase';
import { chatService, type ChatMessage } from '@/lib/chat';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface PatientWithRelation extends CareRelation {
  patient?: {
    id: string;
    email: string;
    full_name?: string;
    role?: string;
  };
}

interface Conversation {
  patient_id: string;
  patient?: {
    id: string;
    email: string;
    full_name?: string;
  };
  last_message?: ChatMessage;
  unread_count: number;
}

export default function DoctorChat() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [relations, setRelations] = useState<PatientWithRelation[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientWithRelation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized callback to handle new messages
  const handleNewMessage = useCallback((message: ChatMessage) => {
    console.log('🎯 DoctorChat: handleNewMessage called with:', message.id);
    
    // Only process messages relevant to current conversation
    if (selectedPatient && message.sender_id !== selectedPatient.patient_id && message.receiver_id !== selectedPatient.patient_id) {
      console.log('⚠️ DoctorChat: Message not for current conversation, skipping:', message.id);
      return;
    }
    
    setMessages(prevMessages => {
      // Check if message already exists
      const exists = prevMessages.some(m => m.id === message.id);
      if (exists) {
        console.log('⚠️ DoctorChat: Message already exists, skipping:', message.id);
        return prevMessages;
      }
      
      console.log('✅ DoctorChat: Adding new message to state:', message.id);
      const newMessages = [...prevMessages, message];
      
      // Mark as read if it's from the patient
      if (message.sender_id !== user?.id && message.sender_id === selectedPatient?.patient_id) {
        console.log('📖 DoctorChat: Marking message as read:', message.id);
        chatService.markAsRead([message.id]);
      }
      
      return newMessages;
    });

    // Update conversations list
    loadConversations();
  }, [user?.id, selectedPatient]);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedPatient && user) {
      console.log('🔄 DoctorChat: Setting up chat for patient:', selectedPatient.patient_id);
      loadMessages();
      
      // Subscribe to real-time messages
      const cleanup = chatService.subscribeToMessages(
        user.id,
        handleNewMessage
      );

      return () => {
        console.log('🧹 DoctorChat: Cleaning up subscription');
        cleanup();
      };
    }
  }, [selectedPatient?.id, user?.id, handleNewMessage]);

  const loadConversations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get all care relations (patients)
      const relationsData = await careRelationAPI.getAllForCaregiver(user.id);
      setRelations(relationsData);
      
      // Load last message and unread count for each patient
      const conversations: Conversation[] = await Promise.all(
        relationsData.map(async (relation) => {
          // Load messages with this patient
          const msgs = await chatService.loadConversation(user.id, relation.patient_id);
          const unreadCount = msgs.filter(
            (m) => m.receiver_id === user.id && !m.is_read
          ).length;
          const lastMessage = msgs.length > 0 ? msgs[msgs.length - 1] : undefined;

          return {
            patient_id: relation.patient_id,
            patient: relation.patient,
            last_message: lastMessage,
            unread_count: unreadCount,
          };
        })
      );

      // Sort by last message time (most recent first)
      conversations.sort((a, b) => {
        if (!a.last_message && !b.last_message) return 0;
        if (!a.last_message) return 1;
        if (!b.last_message) return -1;
        return (
          new Date(b.last_message!.created_at).getTime() -
          new Date(a.last_message!.created_at).getTime()
        );
      });

      setConversations(conversations);

      // If no patient is selected but there are conversations, select the first one
      if (!selectedPatient && conversations.length > 0) {
        const firstRelation = relationsData.find(r => r.patient_id === conversations[0].patient_id);
        if (firstRelation) {
          setSelectedPatient(firstRelation);
        }
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Failed to load conversations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!user || !selectedPatient) return;
    
    console.log('📜 DoctorChat: Loading messages for conversation');
    try {
      const msgs = await chatService.loadConversation(
        user.id,
        selectedPatient.patient_id
      );
      console.log('📜 DoctorChat: Setting', msgs.length, 'messages to state');
      setMessages(msgs);

      // Mark unread messages as read
      const unreadIds = msgs
        .filter((m) => m.receiver_id === user.id && !m.is_read)
        .map((m) => m.id);
      
      if (unreadIds.length > 0) {
        await chatService.markAsRead(unreadIds);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Failed to load messages. Please try again.');
    }
  };

  const selectPatient = async (patientRelation: PatientWithRelation) => {
    try {
      setSelectedPatient(patientRelation);
      setError(null);

      // Messages will be loaded via useEffect when selectedPatient changes
      // Update conversations to reflect read status
      setConversations((prev) =>
        prev.map((c) =>
          c.patient_id === patientRelation.patient_id ? { ...c, unread_count: 0 } : c
        )
      );
    } catch (err) {
      console.error('Error selecting patient:', err);
      setError('Failed to select patient. Please try again.');
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedPatient || !user) return;

    try {
      setSending(true);
      setError(null);
      
      const sentMessage = await chatService.sendMessage(
        user.id,
        selectedPatient.patient_id,
        message
      );

      if (sentMessage) {
        console.log('✅ DoctorChat: Message sent, will be added via real-time');
        // Message will be added via real-time subscription
        // Update last message in conversations
        loadConversations();
      } else {
        throw new Error('Failed to send message');
      }
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
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/doctor/dashboard')}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{t('chat.title', 'Patient Messages')}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('chat.doctor_description', 'Chat with your patients')}
          </p>
        </div>
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
                {conversations.map((conv) => {
                  const patientRelation = relations.find(r => r.patient_id === conv.patient_id) || {
                    id: conv.patient_id,
                    patient_id: conv.patient_id,
                    caregiver_id: user!.id,
                    patient: conv.patient,
                  } as PatientWithRelation;
                  
                  return (
                    <button
                      key={conv.patient_id}
                      onClick={() => selectPatient(patientRelation)}
                      className={`w-full p-4 text-left hover:bg-blue-500/10 dark:hover:bg-blue-500/10 transition-colors ${
                        selectedPatient?.patient_id === conv.patient_id
                          ? 'bg-blue-500/10 dark:bg-blue-500/10'
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-blue-600 text-white">
                            {getInitials(conv.patient?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium truncate">
                              {conv.patient?.full_name || conv.patient?.email || 'Patient'}
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
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className="md:col-span-2 flex flex-col">
          {selectedPatient ? (
            <>
              <ChatHeader 
                user={{
                  id: selectedPatient.patient_id,
                  email: selectedPatient.patient?.email || '',
                  full_name: selectedPatient.patient?.full_name,
                }}
              />
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