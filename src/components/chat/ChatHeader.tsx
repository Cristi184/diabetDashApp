import { UserProfile } from '@/lib/supabase';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface ChatHeaderProps {
  user: UserProfile;
}

export function ChatHeader({ user }: ChatHeaderProps) {
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="border-b p-4 flex items-center gap-3">
      <Avatar>
        <AvatarFallback className="bg-blue-600 text-white">
          {getInitials(user.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <h2 className="font-semibold">{user.full_name || user.email}</h2>
        <div className="flex items-center gap-2">
          {user.role && (
            <Badge variant="secondary" className="text-xs">
              {user.role}
            </Badge>
          )}
          {user.specialty && (
            <span className="text-sm text-gray-500">{user.specialty}</span>
          )}
        </div>
      </div>
    </div>
  );
}