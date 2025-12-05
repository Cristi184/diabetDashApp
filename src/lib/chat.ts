import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ChatMessage {
  id: string;
  from_user_id: string;
  to_user_id: string;
  patient_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

export class ChatService {
  private channel: RealtimeChannel | null = null;

  /**
   * Subscribe to messages for a conversation
   */
  subscribeToMessages(
    patientId: string,
    onMessage: (message: ChatMessage) => void
  ): () => void {
    // Clean up existing subscription
    this.unsubscribe();

    // Create unique channel name
    const channelName = `chat-${patientId}-${Date.now()}`;
    
    console.log('📡 Subscribing to chat channel:', channelName, 'for patient:', patientId);

    try {
      this.channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: '' },
          },
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'app_adf262f319_messages',
            filter: `patient_id=eq.${patientId}`,
          },
          (payload) => {
            console.log('📨 Raw payload received:', payload);
            const newMessage = payload.new as ChatMessage;
            console.log('📨 New message processed:', {
              id: newMessage.id,
              from: newMessage.from_user_id,
              to: newMessage.to_user_id,
              content: newMessage.content.substring(0, 50)
            });
            // Call the callback immediately
            onMessage(newMessage);
          }
        )
        .subscribe((status, err) => {
          console.log('📡 Subscription status:', status);
          if (err) {
            console.error('❌ Subscription error:', err);
          }
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to real-time messages');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Channel subscription error');
          } else if (status === 'TIMED_OUT') {
            console.error('❌ Subscription timed out');
          } else if (status === 'CLOSED') {
            console.log('🔌 Channel closed');
          }
        });
    } catch (error) {
      console.error('❌ Error setting up subscription:', error);
    }

    // Return cleanup function
    return () => this.unsubscribe();
  }

  /**
   * Unsubscribe from current channel
   */
  unsubscribe(): void {
    if (this.channel) {
      console.log('🔌 Unsubscribing from chat channel');
      try {
        supabase.removeChannel(this.channel);
      } catch (error) {
        console.error('❌ Error removing channel:', error);
      }
      this.channel = null;
    }
  }

  /**
   * Send a message
   */
  async sendMessage(
    fromUserId: string,
    toUserId: string,
    patientId: string,
    content: string
  ): Promise<ChatMessage | null> {
    try {
      console.log('📤 Sending message:', {
        from: fromUserId,
        to: toUserId,
        patient: patientId,
        content: content.substring(0, 50)
      });

      const { data, error } = await supabase
        .from('app_adf262f319_messages')
        .insert({
          from_user_id: fromUserId,
          to_user_id: toUserId,
          patient_id: patientId,
          content: content.trim(),
          read: false,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error sending message:', error);
        throw error;
      }
      
      console.log('✅ Message sent successfully:', data.id);
      return data as ChatMessage;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      return null;
    }
  }

  /**
   * Load conversation history
   */
  async loadConversation(
    userId: string,
    otherUserId: string,
    patientId: string
  ): Promise<ChatMessage[]> {
    try {
      console.log('📜 Loading conversation:', {
        user: userId,
        other: otherUserId,
        patient: patientId
      });

      const { data, error } = await supabase
        .from('app_adf262f319_messages')
        .select('*')
        .eq('patient_id', patientId)
        .or(`and(from_user_id.eq.${userId},to_user_id.eq.${otherUserId}),and(from_user_id.eq.${otherUserId},to_user_id.eq.${userId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      console.log('📜 Loaded conversation:', data?.length, 'messages');
      return (data as ChatMessage[]) || [];
    } catch (error) {
      console.error('❌ Error loading conversation:', error);
      return [];
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('app_adf262f319_messages')
        .update({ read: true })
        .in('id', messageIds);

      if (error) throw error;
      console.log('✅ Marked messages as read:', messageIds.length);
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
    }
  }
}

// Export singleton instance
export const chatService = new ChatService();