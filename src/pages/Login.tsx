import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Activity, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { t } = useTranslation();
  const { user, signIn, resetPassword, loading, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isSupabaseConfigured) {
      toast.error('Supabase is not configured. Please set up your credentials.');
      return;
    }

    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(email, password);
      toast.success(t('auth.loginSuccess'));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in. Please check your credentials.';
      toast.error(errorMessage);
      console.error('Sign in error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setIsResetting(true);
    try {
      await resetPassword(resetEmail);
      toast.success(t('auth.resetEmailSent'));
      setShowResetDialog(false);
      setResetEmail('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email.';
      toast.error(errorMessage);
      console.error('Reset password error:', error);
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {!isSupabaseConfigured && (
          <Alert className="bg-yellow-900/20 border-yellow-800 text-yellow-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Supabase Not Configured</AlertTitle>
            <AlertDescription className="text-sm">
              To enable authentication, please configure your Supabase credentials:
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Create a Supabase project at supabase.com</li>
                <li>Enable Email authentication in Authentication → Providers</li>
                <li>Add your credentials to the .env file</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">{t('app.welcome')}</CardTitle>
            <CardDescription className="text-slate-400">
              {t('auth.login')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  disabled={!isSupabaseConfigured || isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  disabled={!isSupabaseConfigured || isSubmitting}
                />
              </div>
              
              <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="link"
                    className="text-green-500 hover:text-green-400 p-0 h-auto"
                    disabled={!isSupabaseConfigured}
                  >
                    {t('auth.forgotPassword')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-800 text-white">
                  <DialogHeader>
                    <DialogTitle>{t('auth.resetPassword')}</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Enter your email address and we'll send you a link to reset your password.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email" className="text-slate-300">{t('auth.email')}</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="your@email.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                        disabled={isResetting}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      disabled={isResetting}
                    >
                      {isResetting ? 'Sending...' : t('auth.sendResetLink')}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                disabled={!isSupabaseConfigured || isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : t('auth.login')}
              </Button>
            </form>

            <div className="text-center text-sm text-slate-400">
              <p>
                {t('auth.dontHaveAccount')}{' '}
                <Link to="/register" className="text-green-500 hover:text-green-400">
                  {t('auth.register')}
                </Link>
              </p>
            </div>

            <div className="border-t border-slate-800 pt-4 mt-4">
              <p className="text-xs text-slate-500 text-center">
                <strong>Medical Disclaimer:</strong> This app is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}