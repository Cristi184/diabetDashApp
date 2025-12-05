import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { syncLanguageFromUser } from '@/i18n/config';

interface ProfileUpdates {
  email?: string;
  full_name?: string;
  language?: string;
  role?: string;
  specialty?: string;
  clinic_name?: string;
  relation_to_patient?: string;
  diabetes_type?: string;
  age?: string;
  weight?: string;
}

interface UserMetadata {
  full_name?: string;
  language?: string;
  role?: string;
  diabetes_type?: string;
  age?: string;
  weight?: string;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSupabaseConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, metadata?: UserMetadata) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: ProfileUpdates) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(true);

  useEffect(() => {
    // Check if Supabase is configured
    if (!supabase) {
      setIsSupabaseConfigured(false);
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Sync language from user metadata on initial load
        syncLanguageFromUser(session.user.user_metadata?.language);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Sync language when user signs in
        syncLanguageFromUser(session.user.user_metadata?.language);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string, metadata?: UserMetadata) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          language: localStorage.getItem('language') || 'en',
          role: metadata?.role || 'patient',
          ...(metadata || {}),
        },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const updateProfile = async (updates: ProfileUpdates) => {
    const updateData: { email?: string; data?: Record<string, unknown> } = {};

    if (updates.email) {
      updateData.email = updates.email;
    }

    // Check if any metadata fields need updating
    const metadataFields = [
      'full_name',
      'language',
      'role',
      'specialty',
      'clinic_name',
      'relation_to_patient',
      'diabetes_type',
      'age',
      'weight'
    ];

    const hasMetadataUpdates = metadataFields.some(field => updates[field as keyof ProfileUpdates] !== undefined);

    if (hasMetadataUpdates) {
      updateData.data = {};
      
      if (updates.full_name !== undefined) updateData.data.full_name = updates.full_name;
      if (updates.language !== undefined) updateData.data.language = updates.language;
      if (updates.role !== undefined) updateData.data.role = updates.role;
      if (updates.specialty !== undefined) updateData.data.specialty = updates.specialty;
      if (updates.clinic_name !== undefined) updateData.data.clinic_name = updates.clinic_name;
      if (updates.relation_to_patient !== undefined) updateData.data.relation_to_patient = updates.relation_to_patient;
      if (updates.diabetes_type !== undefined) updateData.data.diabetes_type = updates.diabetes_type;
      if (updates.age !== undefined) updateData.data.age = updates.age;
      if (updates.weight !== undefined) updateData.data.weight = updates.weight;
    }

    const { error } = await supabase.auth.updateUser(updateData);
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updateProfile,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}