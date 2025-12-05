import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { changeLanguage } from '@/i18n/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, User, Mail, Lock, LogOut, Globe, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'zh', name: '中文' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ro', name: 'Română' },
];

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user, signOut, updateProfile, updatePassword } = useAuth();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [selectedLanguage, setSelectedLanguage] = useState(user?.user_metadata?.language || i18n.language);
  const [diabetesType, setDiabetesType] = useState(user?.user_metadata?.diabetes_type || '');
  const [age, setAge] = useState(user?.user_metadata?.age || '');
  const [weight, setWeight] = useState(user?.user_metadata?.weight || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const handleSignOut = async () => {
    try {
      // Check if there's an active session first
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('No active session, redirecting to login');
        navigate('/login');
        return;
      }

      await signOut();
      toast.success(t('auth.logoutSuccess'));
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      
      // If session is missing, just redirect to login
      if (error instanceof Error && (error.message?.includes('session missing') || error.name === 'AuthSessionMissingError')) {
        console.log('Session already missing, redirecting to login');
        navigate('/login');
      } else {
        toast.error(t('common.error'));
      }
    }
  };

  const handleLanguageChange = async (langCode: string) => {
    setSelectedLanguage(langCode);
    await changeLanguage(langCode);
    
    // Update in database
    try {
      await updateProfile({ language: langCode });
      toast.success(t('settings.profileUpdated'));
    } catch (error) {
      console.error('Failed to update language in database:', error);
      // Language still works locally even if database update fails
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName && !email && !diabetesType && !age && !weight) {
      toast.error('Please enter at least one field to update');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const updates: { email?: string; full_name?: string; diabetes_type?: string; age?: string; weight?: string } = {};
      
      if (fullName !== user?.user_metadata?.full_name) {
        updates.full_name = fullName;
      }
      
      if (email !== user?.email) {
        updates.email = email;
      }

      if (diabetesType !== user?.user_metadata?.diabetes_type) {
        updates.diabetes_type = diabetesType;
      }

      if (age !== user?.user_metadata?.age) {
        updates.age = age;
      }

      if (weight !== user?.user_metadata?.weight) {
        updates.weight = weight;
      }

      if (Object.keys(updates).length === 0) {
        toast.info('No changes to save');
        setIsUpdatingProfile(false);
        return;
      }

      await updateProfile(updates);
      
      if (updates.email) {
        toast.success('Profile updated! Please check your new email to confirm the change.');
      } else {
        toast.success(t('settings.profileUpdated'));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('common.error');
      toast.error(errorMessage);
      console.error('Update profile error:', error);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updatePassword(newPassword);
      toast.success(t('settings.passwordUpdated'));
      setShowPasswordDialog(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('common.error');
      toast.error(errorMessage);
      console.error('Update password error:', error);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const joinDate = user?.created_at ? new Date(user.created_at).toLocaleDateString(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Unknown';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {t('settings.language')}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {t('settings.selectLanguage')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {LANGUAGES.map((lang) => (
                  <SelectItem 
                    key={lang.code} 
                    value={lang.code}
                    className="text-white hover:bg-slate-700"
                  >
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t('settings.profile')}
            </CardTitle>
            <CardDescription className="text-slate-400">
              Update your account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-800 rounded-lg">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-2xl font-bold">
                {user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-semibold">{user?.user_metadata?.full_name || 'User'}</p>
                <p className="text-sm text-slate-400">{user?.email}</p>
                <p className="text-xs text-slate-500 mt-1">Member since {joinDate}</p>
              </div>
            </div>

            <Separator className="bg-slate-800" />

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-slate-300">{t('settings.fullName')}</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {t('settings.email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="your@email.com"
                />
                <p className="text-xs text-slate-500">
                  Changing your email will require verification
                </p>
              </div>

              <Separator className="bg-slate-800" />

              <div className="space-y-2">
                <Label htmlFor="diabetesType" className="text-slate-300 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Diabetes Type
                </Label>
                <Select value={diabetesType} onValueChange={setDiabetesType}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select diabetes type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="prediabetes">Pre-Diabetes</SelectItem>
                    <SelectItem value="type1">Type 1</SelectItem>
                    <SelectItem value="type2">Type 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="age" className="text-slate-300">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="e.g., 35"
                  min="1"
                  max="120"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight" className="text-slate-300">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="e.g., 70"
                  min="1"
                  max="500"
                  step="0.1"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isUpdatingProfile}
              >
                {isUpdatingProfile ? 'Saving...' : t('settings.saveChanges')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Security
            </CardTitle>
            <CardDescription className="text-slate-400">
              Manage your password and security settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full border-slate-700 text-white hover:bg-slate-800">
                  {t('settings.changePassword')}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle>{t('settings.changePassword')}</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Enter your new password below
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-slate-300">{t('settings.newPassword')}</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-slate-300">{t('settings.confirmNewPassword')}</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="••••••••"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={isUpdatingPassword}
                  >
                    {isUpdatingPassword ? 'Updating...' : t('settings.saveChanges')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <Button
              onClick={handleSignOut}
              variant="destructive"
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('auth.logout')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}