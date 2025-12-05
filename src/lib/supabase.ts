import { createClient } from '@supabase/supabase-js';

// Get Supabase configuration from environment variables with fallback to hardcoded values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bxhrkgyfpepniulhvgqh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4aHJrZ3lmcGVwbml1bGh2Z3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTI3MzcsImV4cCI6MjA3OTEyODczN30.nNw_tRgp7Tyltqd1jYFPNuB0M0WOLWght5_7PIn_1E8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'patient' | 'doctor' | 'nutritionist' | 'family';

export interface GlucoseReading {
  id: string;
  user_id: string;
  value: number;
  date: string;
  notes?: string;
  created_at: string;
}

export interface Meal {
  id: string;
  user_id: string;
  name: string;
  carbs: number;
  protein?: number;
  fat?: number;
  calories?: number;
  description?: string;
  date: string;
  photo_url?: string;
  created_at: string;
}

export interface LabResult {
  id: string;
  user_id: string;
  test_name: string;
  value: string;
  date: string;
  notes?: string;
  photo_url?: string;
  photo_urls?: string[];
  created_at: string;
}

export interface TreatmentLog {
  id: string;
  user_id: string;
  treatment_type: 'insulin' | 'pills';
  insulin_type?: 'basal' | 'rapid';
  medication_name?: string;
  dose: number;
  dose_unit: string;
  timestamp: string;
  notes?: string;
  created_at: string;
}

// Keep InsulinLog for backward compatibility
export interface InsulinLog {
  id: string;
  user_id: string;
  insulin_type: 'basal' | 'rapid';
  dose: number;
  timestamp: string;
  notes?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role?: UserRole;
  specialty?: string;
  clinic_name?: string;
  relation_to_patient?: string;
  diabetes_type?: string;
  age?: string;
  weight?: string;
}

export interface CareRelation {
  id: string;
  caregiver_id: string;
  patient_id: string;
  relation_type: 'doctor' | 'nutritionist' | 'family';
  created_at: string;
  caregiver?: UserProfile;
  patient?: UserProfile;
}

export interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  patient_id: string;
  content: string;
  read: boolean;
  created_at: string;
  from_user?: UserProfile;
  to_user?: UserProfile;
}

// New interface for chat messages between patient and doctor
export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  other_user: UserProfile;
  last_message?: DirectMessage;
  unread_count: number;
}

export interface InviteCode {
  id: string;
  patient_id: string;
  code: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

// Helper function to get user profile via edge function
async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    console.log('[getUserProfile] Fetching profile for user:', userId);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('[getUserProfile] No active session found');
      return null;
    }

    console.log('[getUserProfile] Making request to edge function...');
    const response = await fetch(
      `${supabaseUrl}/functions/v1/app_adf262f319_get_user_profile`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      }
    );

    console.log('[getUserProfile] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getUserProfile] Failed to fetch user profile:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('[getUserProfile] Successfully fetched profile:', data);
    return data.profile;
  } catch (error) {
    console.error('[getUserProfile] Error fetching user profile:', error);
    return null;
  }
}

export const glucoseAPI = {
  async getAll(userId: string): Promise<GlucoseReading[]> {
    console.log('[glucoseAPI.getAll] Fetching glucose readings for user:', userId);
    const { data, error } = await supabase
      .from('app_adf262f319_glucose_readings')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('[glucoseAPI.getAll] Error:', error);
      throw error;
    }
    console.log('[glucoseAPI.getAll] Found', data?.length || 0, 'readings');
    return data || [];
  },

  async create(reading: Omit<GlucoseReading, 'id' | 'created_at'>): Promise<GlucoseReading> {
    const { data, error } = await supabase
      .from('app_adf262f319_glucose_readings')
      .insert(reading)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('app_adf262f319_glucose_readings')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getPaginated(
    userId: string, 
    options?: { 
      page?: number; 
      limit?: number; 
      dateFilter?: 'day' | 'week' | 'month' | 'all';
    }
  ): Promise<{ data: GlucoseReading[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const dateFilter = options?.dateFilter || 'all';
    
    let query = supabase
      .from('app_adf262f319_glucose_readings')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);
    
    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (dateFilter) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      query = query.gte('date', startDate.toISOString());
    }
    
    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data, error, count } = await query
      .order('date', { ascending: false })
      .range(from, to);
    
    if (error) {
      console.error('[glucoseAPI.getPaginated] Error:', error);
      throw error;
    }
    return { data: data || [], total: count || 0 };
  },

  async getAverage(userId: string, days: number = 30): Promise<number | null> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('app_adf262f319_glucose_readings')
      .select('value')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString());
    
    if (error) {
      console.error('[glucoseAPI.getAverage] Error:', error);
      return null;
    }
    
    if (!data || data.length === 0) return null;
    
    const sum = data.reduce((acc, reading) => acc + reading.value, 0);
    return Math.round(sum / data.length);
  },
};

export const mealsAPI = {
  async getAll(userId: string): Promise<Meal[]> {
    console.log('[mealsAPI.getAll] Fetching meals for user:', userId);
    const { data, error } = await supabase
      .from('app_adf262f319_meals')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('[mealsAPI.getAll] Error:', error);
      throw error;
    }
    console.log('[mealsAPI.getAll] Found', data?.length || 0, 'meals');
    return data || [];
  },

  async create(meal: Omit<Meal, 'id' | 'created_at'>): Promise<Meal> {
    const { data, error } = await supabase
      .from('app_adf262f319_meals')
      .insert(meal)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('app_adf262f319_meals')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

export const labsAPI = {
  async getAll(userId: string): Promise<LabResult[]> {
    console.log('[labsAPI.getAll] Fetching labs for user:', userId);
    const { data, error } = await supabase
      .from('app_adf262f319_lab_results')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('[labsAPI.getAll] Error:', error);
      throw error;
    }
    console.log('[labsAPI.getAll] Found', data?.length || 0, 'lab results');
    return data || [];
  },

  async create(lab: Omit<LabResult, 'id' | 'created_at'>): Promise<LabResult> {
    const { data, error } = await supabase
      .from('app_adf262f319_lab_results')
      .insert(lab)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('app_adf262f319_lab_results')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

export const treatmentAPI = {
  async getAll(userId: string): Promise<TreatmentLog[]> {
    console.log('[treatmentAPI.getAll] Fetching treatment logs for user:', userId);
    const { data, error } = await supabase
      .from('app_adf262f319_insulin_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error('[treatmentAPI.getAll] Error:', error);
      throw error;
    }
    console.log('[treatmentAPI.getAll] Found', data?.length || 0, 'treatment logs');
    return data || [];
  },

  async getPaginated(
    userId: string, 
    options?: { 
      page?: number; 
      limit?: number; 
      dateFilter?: 'day' | 'week' | 'month' | 'all';
    }
  ): Promise<{ data: TreatmentLog[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const dateFilter = options?.dateFilter || 'all';
    
    let query = supabase
      .from('app_adf262f319_insulin_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);
    
    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (dateFilter) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      query = query.gte('timestamp', startDate.toISOString());
    }
    
    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data, error, count } = await query
      .order('timestamp', { ascending: false })
      .range(from, to);
    
    if (error) {
      console.error('[treatmentAPI.getPaginated] Error:', error);
      throw error;
    }
    return { data: data || [], total: count || 0 };
  },

  async create(log: Omit<TreatmentLog, 'id' | 'created_at'>): Promise<TreatmentLog> {
    const { data, error } = await supabase
      .from('app_adf262f319_insulin_logs')
      .insert(log)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('app_adf262f319_insulin_logs')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// Keep insulinAPI for backward compatibility
export const insulinAPI = {
  async getAll(userId: string): Promise<InsulinLog[]> {
    console.log('[insulinAPI.getAll] Fetching insulin logs for user:', userId);
    const { data, error } = await supabase
      .from('app_adf262f319_insulin_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error('[insulinAPI.getAll] Error:', error);
      throw error;
    }
    console.log('[insulinAPI.getAll] Found', data?.length || 0, 'insulin logs');
    return data || [];
  },

  async create(log: Omit<InsulinLog, 'id' | 'created_at'>): Promise<InsulinLog> {
    const { data, error } = await supabase
      .from('app_adf262f319_insulin_logs')
      .insert(log)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('app_adf262f319_insulin_logs')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

export const chatAPI = {
  async getAll(userId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('app_adf262f319_chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async create(message: Omit<ChatMessage, 'id' | 'created_at'>): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('app_adf262f319_chat_messages')
      .insert(message)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteAll(userId: string): Promise<void> {
    const { error } = await supabase
      .from('app_adf262f319_chat_messages')
      .delete()
      .eq('user_id', userId);
    
    if (error) throw error;
  },
};

// New direct messaging API for patient-doctor chat
export const directMessageAPI = {
  async send(receiverId: string, message: string): Promise<DirectMessage> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${supabaseUrl}/functions/v1/app_adf262f319_send_message`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiver_id: receiverId, message }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send message');
    }

    const result = await response.json();
    return result.message;
  },

  async getMessages(otherUserId: string): Promise<DirectMessage[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${supabaseUrl}/functions/v1/app_adf262f319_get_messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ other_user_id: otherUserId }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch messages');
    }

    const result = await response.json();
    return result.messages;
  },

  async markAsRead(senderId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${supabaseUrl}/functions/v1/app_adf262f319_mark_messages_read`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sender_id: senderId }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to mark messages as read');
    }
  },

  async getUnreadCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      // Use SELECT instead of HEAD to avoid RLS policy issues
      const { data, error } = await supabase
        .from('app_adf262f319_messages')
        .select('id', { count: 'exact' })
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error getting unread count:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      return 0;
    }
  },

  async getConversations(): Promise<Conversation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get all messages involving the current user
    const { data: messages, error } = await supabase
      .from('app_adf262f319_messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }

    // Group messages by conversation partner
    const conversationMap = new Map<string, DirectMessage[]>();
    
    messages?.forEach((msg) => {
      const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, []);
      }
      conversationMap.get(otherUserId)!.push(msg);
    });

    // Build conversation objects
    const conversations: Conversation[] = [];
    
    for (const [otherUserId, msgs] of conversationMap.entries()) {
      const otherUser = await getUserProfile(otherUserId);
      if (!otherUser) continue;

      const unreadCount = msgs.filter(
        (m) => m.receiver_id === user.id && !m.is_read
      ).length;

      conversations.push({
        other_user: otherUser,
        last_message: msgs[0],
        unread_count: unreadCount,
      });
    }

    return conversations;
  },

  async subscribeToMessages(callback: (message: DirectMessage) => void) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('Cannot subscribe to messages: No user found');
      return supabase.channel('messages-empty').subscribe();
    }
    
    return supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'app_adf262f319_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          callback(payload.new as DirectMessage);
        }
      )
      .subscribe();
  },
};

export const careRelationAPI = {
  async getAllForCaregiver(caregiverId: string): Promise<CareRelation[]> {
    console.log('[careRelationAPI.getAllForCaregiver] Fetching relations for caregiver:', caregiverId);
    const { data, error } = await supabase
      .from('app_adf262f319_care_relations')
      .select('*')
      .eq('caregiver_id', caregiverId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[careRelationAPI.getAllForCaregiver] Error:', error);
      throw error;
    }
    
    console.log('[careRelationAPI.getAllForCaregiver] Found', data?.length || 0, 'relations');
    
    // Fetch patient profiles
    const relationsWithProfiles = await Promise.all(
      (data || []).map(async (relation) => {
        console.log('[careRelationAPI.getAllForCaregiver] Fetching profile for patient:', relation.patient_id);
        const patient = await getUserProfile(relation.patient_id);
        return {
          ...relation,
          patient: patient || undefined,
        };
      })
    );
    
    console.log('[careRelationAPI.getAllForCaregiver] Relations with profiles:', relationsWithProfiles);
    return relationsWithProfiles;
  },

  async getAllForPatient(patientId: string): Promise<CareRelation[]> {
    const { data, error } = await supabase
      .from('app_adf262f319_care_relations')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Fetch caregiver profiles
    const relationsWithProfiles = await Promise.all(
      (data || []).map(async (relation) => {
        const caregiver = await getUserProfile(relation.caregiver_id);
        return {
          ...relation,
          caregiver: caregiver || undefined,
        };
      })
    );
    
    return relationsWithProfiles;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('app_adf262f319_care_relations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

export const messageAPI = {
  async getConversation(userId: string, otherUserId: string, patientId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('app_adf262f319_messages')
      .select('*')
      .eq('patient_id', patientId)
      .or(`and(from_user_id.eq.${userId},to_user_id.eq.${otherUserId}),and(from_user_id.eq.${otherUserId},to_user_id.eq.${userId})`)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getAllForUser(userId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('app_adf262f319_messages')
      .select('*')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async send(message: Omit<Message, 'id' | 'created_at' | 'read'>): Promise<Message> {
    const { data, error } = await supabase
      .from('app_adf262f319_messages')
      .insert({ ...message, read: false })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async markAsRead(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('app_adf262f319_messages')
      .update({ read: true })
      .eq('id', messageId);
    
    if (error) throw error;
  },

  async getUnreadCount(userId: string): Promise<number> {
    try {
      // Use SELECT instead of HEAD to avoid RLS policy issues
      // Use the correct column names: receiver_id and is_read
      const { data, error } = await supabase
        .from('app_adf262f319_messages')
        .select('id', { count: 'exact' })
        .eq('receiver_id', userId)
        .eq('is_read', false);
      
      if (error) {
        console.error('Error getting unread count:', error);
        return 0;
      }
      
      return data?.length || 0;
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      return 0;
    }
  },
};

export const inviteCodeAPI = {
  async generate(): Promise<InviteCode> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${supabaseUrl}/functions/v1/app_adf262f319_generate_invite_code`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate invite code');
    }

    return await response.json();
  },

  async redeem(code: string, relationType: 'doctor' | 'nutritionist' | 'family'): Promise<CareRelation> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${supabaseUrl}/functions/v1/app_adf262f319_redeem_invite_code`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, relation_type: relationType }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to redeem invite code');
    }

    const result = await response.json();
    return result.care_relation;
  },

  async getAllForPatient(patientId: string): Promise<InviteCode[]> {
    const { data, error } = await supabase
      .from('app_adf262f319_invite_codes')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
};

export async function uploadPhoto(file: File, userId: string, type: 'meals' | 'labs'): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${type}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('health-photos')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('health-photos')
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading photo:', error);
    return null;
  }
}

// Export the helper function for use in components
export { getUserProfile };