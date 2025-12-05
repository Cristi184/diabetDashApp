import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { directMessageAPI, careRelationAPI, DirectMessage, UserProfile } from '@/lib/supabase';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MessageSquare } from 'lucide-react';

export default function Chat() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [doctor, setDoctor] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadDoctorAndMessages();
      
      // Subscribe to new messages
      const channel = directMessageAPI.subscribeToMessages((newMessage) => {
        if (newMessage.sender_id === doctor?.id || newMessage.receiver_id === doctor?.id) {
          setMessages((prev) => [...prev, newMessage]);
          
          // Mark as read if it's from the doctor
          if (newMessage.sender_id === doctor?.id) {
            directMessageAPI.markAsRead(doctor.id);
          }
        }
      });

      return () => {
        channel.unsubscribe();
      };
    }
  }, [user, doctor?.id]);

  const loadDoctorAndMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get patient's doctor from care relations
      const relations = await careRelationAPI.getAllForPatient(user!.id);
      const doctorRelation = relations.find((r) => r.relation_type === 'doctor');

      if (!doctorRelation || !doctorRelation.caregiver) {
        setError('No doctor assigned yet. Please connect with a doctor first.');
        setLoading(false);
        return;
      }

      setDoctor(doctorRelation.caregiver);

      // Load messages with doctor
      const msgs = await directMessageAPI.getMessages(doctorRelation.caregiver.id);
      setMessages(msgs);

      // Mark messages as read
      await directMessageAPI.markAsRead(doctorRelation.caregiver.id);
    } catch (err) {
      console.error('Error loading chat:', err);
      setError('Failed to load chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!doctor) return;

    try {
      setSending(true);
      const newMessage = await directMessageAPI.send(doctor.id, message);
      setMessages((prev) => [...prev, newMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !doctor) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Alert>
          <MessageSquare className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('chat.title', 'Chat with Doctor')}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('chat.description', 'Send messages to your doctor')}
        </p>
      </div>

      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="h-[calc(100vh-16rem)] flex flex-col">
        {doctor && <ChatHeader user={doctor} />}
        <MessageList messages={messages} currentUserId={user!.id} />
        <MessageInput onSend={handleSendMessage} disabled={sending} />
      </Card>
    </div>
  );
}