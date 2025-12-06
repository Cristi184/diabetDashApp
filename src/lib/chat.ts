import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ChatMessage interface matching the actual database schema
export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export class ChatService {
  private channel: RealtimeChannel | null = null;

  /**
   * Subscribe to messages for a conversation between two users
   */
  subscribeToMessages(
    userId: string,
    onMessage: (message: ChatMessage) => void
  ): () => void {
    // Clean up existing subscription
    this.unsubscribe();

    // Create unique channel name
    const channelName = `chat-${userId}-${Date.now()}`;
    
    console.log('📡 Subscribing to chat channel:', channelName, 'for user:', userId);

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
            filter: `receiver_id=eq.${userId}`,
          },
          (payload) => {
            console.log('📨 Raw payload received:', payload);
            const newMessage = payload.new as ChatMessage;
            console.log('📨 New message processed:', {
              id: newMessage.id,
              sender: newMessage.sender_id,
              receiver: newMessage.receiver_id,
              message: newMessage.message.substring(0, 50)
            });
            // Call the callback - filtering will be done in the component
            onMessage(newMessage);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'app_adf262f319_messages',
            filter: `sender_id=eq.${userId}`,
          },
          (payload) => {
            console.log('📨 Own message sent:', payload);
            const newMessage = payload.new as ChatMessage;
            // Also trigger callback for own messages so they appear immediately
            onMessage(newMessage);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'app_adf262f319_messages',
            filter: `receiver_id=eq.${userId}`,
          },
          (payload) => {
            // Handle read status updates if needed
            console.log('📨 Message updated:', payload);
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
   * Send a message using direct database insert
   */
  async sendMessage(
    fromUserId: string,
    toUserId: string,
    content: string
  ): Promise<ChatMessage | null> {
    try {
      console.log('📤 Sending message:', {
        from: fromUserId,
        to: toUserId,
        content: content.substring(0, 50)
      });

      const { data, error } = await supabase
        .from('app_adf262f319_messages')
        .insert({
          sender_id: fromUserId,
          receiver_id: toUserId,
          message: content.trim(),
          is_read: false,
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
   * Load conversation history between two users
   */
  async loadConversation(
    userId: string,
    otherUserId: string
  ): Promise<ChatMessage[]> {
    try {
      console.log('📜 Loading conversation:', {
        user: userId,
        other: otherUserId
      });

      const { data, error } = await supabase
        .from('app_adf262f319_messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error loading conversation:', error);
        throw error;
      }

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
        .update({ is_read: true })
        .in('id', messageIds);

      if (error) {
        console.error('❌ Error marking messages as read:', error);
        throw error;
      }

      console.log('✅ Marked messages as read:', messageIds.length);
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
    }
  }
}

// Export singleton instance
export const chatService = new ChatService();
