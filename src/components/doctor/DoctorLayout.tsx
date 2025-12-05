import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Users, MessageSquare, Settings, LogOut, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { directMessageAPI } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface DoctorLayoutProps {
  children: ReactNode;
}

export default function DoctorLayout({ children }: DoctorLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadUnreadCount();

      // Subscribe to new messages
      let channel: RealtimeChannel | null = null;
      directMessageAPI.subscribeToMessages(() => {
        loadUnreadCount();
      }).then((ch) => {
        channel = ch;
      });

      return () => {
        if (channel) {
          channel.unsubscribe();
        }
      };
    }
  }, [user]);

  const loadUnreadCount = async () => {
    try {
      const count = await directMessageAPI.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const menuItems = [
    { icon: Home, label: 'Overview', path: '/app/doctor' },
    { icon: Users, label: 'Patients', path: '/app/doctor/patients' },
    { icon: MessageSquare, label: 'Chat', path: '/app/doctor/chat', badge: unreadCount },
    { icon: Settings, label: 'Settings', path: '/app/doctor/settings' },
  ];

  const isActive = (path: string) => {
    if (path === '/app/doctor') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Provider Portal</h1>
              <p className="text-xs text-slate-400">DiabetesCare</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-slate-800">
          <p className="text-sm font-medium text-white truncate">
            {user?.user_metadata?.full_name || 'Provider'}
          </p>
          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          {user?.user_metadata?.specialty && (
            <p className="text-xs text-blue-400 mt-1">{user.user_metadata.specialty}</p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <Button
              key={item.path}
              onClick={() => navigate(item.path)}
              variant="ghost"
              className={`w-full justify-start gap-3 ${
                isActive(item.path)
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </Button>
          ))}
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t border-slate-800">
          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}