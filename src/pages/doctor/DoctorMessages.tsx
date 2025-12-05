import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Loader2, Bell, BellOff } from 'lucide-react';
import { careRelationAPI, type CareRelation } from '@/lib/supabase';
import { chatService, type ChatMessage } from '@/lib/chat';
import { toast } from 'sonner';
import DoctorLayout from '@/components/doctor/DoctorLayout';

interface PatientWithRelation extends CareRelation {
  patient?: {
    id: string;
    email: string;
    full_name?: string;
    role?: string;
  };
}

export default function DoctorMessages() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<PatientWithRelation[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientWithRelation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize notification sound
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8bllHAU2jdXvz3oqBSh+zPLaizsKFFm16+mnVBIJQ5zd8sFuJAUuhM/z24k4CBhiuevpoVQSC0yl4fG5ZRwFNo3V789+KgUofszy2os7ChRZtevpp1QSCUOc3fLBbiQFL4TP89uJOAgYYrnr6aFUEgtMpeHxuWUcBTaN1e/PfioFKH3M8tqLOwoUWbXr6adUEglDnN3ywW4kBS+Ez/PbiTgIGGK56+mhVBILTKXh8bllHAU2jdXvz34qBSh9zPLaizsKFFm16+mnVBIJQ5zd8sFuJAUvhM/z24k4CBhiuevpoVQSC0yl4fG5ZRwFNo3V789+KgUofczy2os7ChRZtevpp1QSCUOc3fLBbiQFL4TP89uJOAgYYrnr6aFUEgtMpeHxuWUcBTaN1e/PfioFKH3M8tqLOwoUWbXr6adUEglDnN3ywW4kBS+Ez/PbiTgIGGK56+mhVBILTKXh8bllHAU2jdXvz34qBSh9zPLaizsKFFm16+mnVBIJQ5zd8sFuJAUvhM/z24k4CBhiuevpoVQSC0yl4fG5ZRwFNo3V789+KgUofczy2os7ChRZtevpp1QSCUOc3fLBbiQFL4TP89uJOAgYYrnr6aFUEgtMpeHxuWUcBTaN1e/PfioFKH3M8tqLOwoUWbXr6adUEglDnN3ywW4kBS+Ez/PbiTgIGGK56+mhVBILTKXh8bllHAU2jdXvz34qBSh9zPLaizsKFFm16+mnVBIJQ5zd8sFuJAUvhM/z24k4CBhiuevpoVQSC0yl4fG5ZRwFNo3V789+KgUofczy2os7ChRZtevpp1QSCUOc3fLBbiQFL4TP89uJOAgYYrnr6aFUEgtMpeHxuWUcBTaN1e/PfioFKH3M8tqLOwoUWbXr6adUEglDnN3ywW4kBS+Ez/PbiTgIGGK56+mhVBILTKXh8bllHAU2jdXvz34qBSh9zPLaizsKFFm16+mnVBIJQ5zd8sFuJAUvhM/z24k4CBhiuevpoVQSC0yl4fG5ZRwFNo3V789+KgUofczy2os7ChRZtevpp1QSCUOc3fLBbiQFL4TP89uJOAgYYrnr6aFUEgtMpeHxuWUcBTaN1e/PfioFKH3M8tqLOwoUWbXr6adUEglDnN3ywW4kBS+Ez/PbiTgIGGK56+mhVBILTKXh8bllHAU2jdXvz34qBSh9zPLaizsKFFm16+mnVBIJQ5zd8sFuJAUvhM/z24k4CBhiuevpoVQSC0yl4fG5ZRwFNo3V789+KgUofczy');
  }, []);

  useEffect(() => {
    loadPatients();
    requestNotificationPermission();
  }, [user]);

  // Memoized callback to handle new messages
  const handleNewMessage = useCallback((message: ChatMessage) => {
    console.log('🎯 Doctor: handleNewMessage called with:', message.id);
    
    setMessages(prevMessages => {
      // Check if message already exists
      const exists = prevMessages.some(m => m.id === message.id);
      if (exists) {
        console.log('⚠️ Doctor: Message already exists, skipping:', message.id);
        return prevMessages;
      }
      
      console.log('✅ Doctor: Adding new message to state:', message.id);
      const newMessages = [...prevMessages, message];
      
      // Mark as read if it's from the patient
      if (message.from_user_id !== user?.id) {
        console.log('📖 Doctor: Marking message as read:', message.id);
        chatService.markAsRead([message.id]);
        
        // Show notification
        if (selectedPatient?.patient?.full_name) {
          showNotification(message, selectedPatient.patient.full_name);
        }
      }
      
      return newMessages;
    });
  }, [user?.id, selectedPatient]);

  useEffect(() => {
    if (selectedPatient && user) {
      console.log('🔄 Doctor: Setting up chat for patient:', selectedPatient.patient_id);
      loadMessages();
      
      // Subscribe to real-time messages
      const cleanup = chatService.subscribeToMessages(
        selectedPatient.patient_id,
        handleNewMessage
      );

      return () => {
        console.log('🧹 Doctor: Cleaning up subscription');
        cleanup();
      };
    }
  }, [selectedPatient?.id, user?.id, handleNewMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
    }
  };

  const toggleNotifications = async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications not supported in this browser');
      return;
    }

    if (Notification.permission === 'granted') {
      setNotificationsEnabled(!notificationsEnabled);
      toast.success(notificationsEnabled ? 'Notifications disabled' : 'Notifications enabled');
    } else {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        toast.success('Notifications enabled');
      } else {
        toast.error('Notification permission denied');
      }
    }
  };

  const showNotification = (message: ChatMessage, patientName: string) => {
    if (!notificationsEnabled || document.hasFocus()) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(`New message from ${patientName}`, {
        body: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'message-' + message.id,
        requireInteraction: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
    }
  };

  const loadPatients = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const relations = await careRelationAPI.getAllForCaregiver(user.id);
      setPatients(relations);
      if (relations.length > 0 && !selectedPatient) {
        setSelectedPatient(relations[0]);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!user || !selectedPatient) return;
    
    console.log('📜 Doctor: Loading messages for conversation');
    try {
      const msgs = await chatService.loadConversation(
        user.id,
        selectedPatient.patient_id,
        selectedPatient.patient_id
      );
      console.log('📜 Doctor: Setting', msgs.length, 'messages to state');
      setMessages(msgs);

      // Mark unread messages as read
      const unreadIds = msgs
        .filter(m => m.to_user_id === user.id && !m.read)
        .map(m => m.id);
      
      if (unreadIds.length > 0) {
        await chatService.markAsRead(unreadIds);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedPatient) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const sentMessage = await chatService.sendMessage(
        user.id,
        selectedPatient.patient_id,
        selectedPatient.patient_id,
        messageContent
      );

      if (sentMessage) {
        console.log('✅ Doctor: Message sent, will be added via real-time');
        toast.success('Message sent');
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <DoctorLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </DoctorLayout>
    );
  }

  return (
    <DoctorLayout>
      <div className="h-screen flex flex-col">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Messages</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleNotifications}
            className={`transition-colors ${
              notificationsEnabled
                ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
            title={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
          >
            {notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Patient List */}
          <div className="w-80 border-r border-slate-800 overflow-y-auto">
            {patients.length > 0 ? (
              <div className="p-4 space-y-2">
                {patients.map((relation) => (
                  <div
                    key={relation.id}
                    onClick={() => setSelectedPatient(relation)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedPatient?.id === relation.id
                        ? 'bg-blue-600'
                        : 'bg-slate-900 hover:bg-slate-800'
                    }`}
                  >
                    <p className="font-medium text-white">
                      {relation.patient?.full_name || 'Patient'}
                    </p>
                    <p className="text-xs text-slate-400">{relation.patient?.email}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="text-slate-400">No patients to message</p>
              </div>
            )}
          </div>

          {/* Chat Area */}
          {selectedPatient ? (
            <div className="flex-1 flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-900">
                <h2 className="font-semibold text-white">
                  {selectedPatient.patient?.full_name || 'Patient'}
                </h2>
                <p className="text-xs text-slate-400">{selectedPatient.patient?.email}</p>
                <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Real-time chat active
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length > 0 ? (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.from_user_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-md p-3 rounded-lg ${
                          msg.from_user_id === user?.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-white'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-400 py-8">
                    No messages yet. Start the conversation!
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-slate-800 bg-slate-900">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !sending && handleSendMessage()}
                    placeholder="Type a message..."
                    className="bg-slate-800 border-slate-700 text-white"
                    disabled={sending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400">Select a patient to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DoctorLayout>
  );
}