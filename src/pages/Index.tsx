import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Landing from './Landing';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      // Get user role from metadata
      const role = user.user_metadata?.role;
      
      // Redirect based on role
      if (role === 'doctor' || role === 'nutritionist' || role === 'family') {
        navigate('/app/doctor');
      } else {
        // Default to patient dashboard
        navigate('/dashboard');
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Show landing page if not authenticated
  if (!user) {
    return <Landing />;
  }

  return null;
}