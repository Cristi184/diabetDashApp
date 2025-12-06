import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Loader2, Bell, BellOff, ArrowLeft } from 'lucide-react';
import { careRelationAPI, type CareRelation } from '@/lib/supabase';
import { chatService, type ChatMessage } from '@/lib/chat';
import { formatTime, formatListDate } from '@/lib/dateUtils';
import { toast } from 'sonner';

interface DoctorWithRelation extends CareRelation {
  caregiver?: {
    id: string;
    email: string;
    full_name?: string;
    role?: string;
  };
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<DoctorWithRelation[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorWithRelation | null>(null);
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
    loadDoctors();
    requestNotificationPermission();
  }, [user]);

  // Memoized callback to handle new messages
  const handleNewMessage = useCallback((message: ChatMessage) => {
    console.log('🎯 Patient: handleNewMessage called with:', message.id);
    
    // Only process messages relevant to current conversation
    if (selectedDoctor && message.sender_id !== selectedDoctor.caregiver_id && message.receiver_id !== selectedDoctor.caregiver_id) {
      console.log('⚠️ Patient: Message not for current conversation, skipping:', message.id);
      return;
    }
    
    setMessages(prevMessages => {
      // Check if message already exists
      const exists = prevMessages.some(m => m.id === message.id);
      if (exists) {
        console.log('⚠️ Patient: Message already exists, skipping:', message.id);
        return prevMessages;
      }
      
      console.log('✅ Patient: Adding new message to state:', message.id);
      const newMessages = [...prevMessages, message];
      
      // Mark as read if it's from the doctor
      if (message.sender_id !== user?.id && message.sender_id === selectedDoctor?.caregiver_id) {
        console.log('📖 Patient: Marking message as read:', message.id);
        chatService.markAsRead([message.id]);
        
        // Show notification
        if (selectedDoctor?.caregiver?.full_name) {
          showNotification(message, selectedDoctor.caregiver.full_name);
        }
      }
      
      return newMessages;
    });
  }, [user?.id, selectedDoctor]);

  useEffect(() => {
    if (selectedDoctor && user) {
      console.log('🔄 Patient: Setting up chat for doctor:', selectedDoctor.caregiver_id);
      loadMessages();
      
      // Subscribe to real-time messages
      const cleanup = chatService.subscribeToMessages(
        user.id,
        handleNewMessage
      );

      return () => {
        console.log('🧹 Patient: Cleaning up subscription');
        cleanup();
      };
    }
  }, [selectedDoctor?.id, user?.id, handleNewMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      if (permission === 'granted') {
        toast.success('Notifications enabled');
      }
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

  const showNotification = (message: ChatMessage, doctorName: string) => {
    if (!notificationsEnabled || document.hasFocus()) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(`New message from Dr. ${doctorName}`, {
        body: message.message.substring(0, 100) + (message.message.length > 100 ? '...' : ''),
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

  const loadDoctors = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const relations = await careRelationAPI.getAllForPatient(user.id);
      setDoctors(relations);
      if (relations.length > 0 && !selectedDoctor) {
        setSelectedDoctor(relations[0]);
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!user || !selectedDoctor) return;
    
    console.log('📜 Patient: Loading messages for conversation');
    try {
      const msgs = await chatService.loadConversation(
        user.id,
        selectedDoctor.caregiver_id
      );
      console.log('📜 Patient: Setting', msgs.length, 'messages to state');
      setMessages(msgs);

      // Mark unread messages as read
      const unreadIds = msgs
        .filter(m => m.receiver_id === user.id && !m.is_read)
        .map(m => m.id);
      
      if (unreadIds.length > 0) {
        await chatService.markAsRead(unreadIds);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedDoctor) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const sentMessage = await chatService.sendMessage(
        user.id,
        selectedDoctor.caregiver_id,
        messageContent
      );

      if (sentMessage) {
        console.log('✅ Patient: Message sent, will be added via real-time');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto p-6 h-screen flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="text-slate-400 hover:text-white hover:bg-slate-800/50"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold text-white">Messages</h1>
          </div>
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

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
          {/* Doctor List */}
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur flex flex-col overflow-hidden">
            <CardHeader>
              <CardTitle className="text-white">Your Doctors</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {doctors.length > 0 ? (
                <div className="space-y-2">
                  {doctors.map((relation) => (
                    <div
                      key={relation.id}
                      onClick={() => setSelectedDoctor(relation)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedDoctor?.id === relation.id
                          ? 'bg-blue-600'
                          : 'bg-slate-800/50 hover:bg-slate-800'
                      }`}
                    >
                      <p className="font-medium text-white">
                        Dr. {relation.caregiver?.full_name || 'Doctor'}
                      </p>
                      <p className="text-xs text-slate-400">{relation.caregiver?.email}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                  <p className="text-slate-400">No doctors to message</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800 backdrop-blur flex flex-col overflow-hidden">
            {selectedDoctor ? (
              <>
                <CardHeader className="border-b border-slate-800 flex-shrink-0">
                  <CardTitle className="text-white">
                    Dr. {selectedDoctor.caregiver?.full_name || 'Doctor'}
                  </CardTitle>
                  <p className="text-xs text-slate-400">{selectedDoctor.caregiver?.email}</p>
                  <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    Real-time chat active
                  </p>
                </CardHeader>
                
                {/* Messages - Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length > 0 ? (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-md p-3 rounded-lg ${
                            msg.sender_id === user?.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-white'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {formatTime(msg.created_at)}
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

                {/* Message Input - Fixed at Bottom */}
                <div className="p-4 border-t border-slate-800 flex-shrink-0">
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
              </>
            ) : (
              <CardContent className="flex items-center justify-center flex-1">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                  <p className="text-slate-400">Select a doctor to start messaging</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}