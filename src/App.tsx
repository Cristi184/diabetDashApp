import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Index from './pages/Index';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import GlucoseLogs from './pages/GlucoseLogs';
import Logs from './pages/Logs';
import Labs from './pages/Labs';
import TreatmentLogs from './pages/TreatmentLogs';
import AIChat from './pages/AIChat';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import DoctorOnboarding from './pages/doctor/DoctorOnboarding';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorPatients from './pages/doctor/DoctorPatients';
import PatientDetail from './pages/doctor/PatientDetail';
import DoctorChat from './pages/doctor/DoctorChat';
import DoctorMessages from './pages/doctor/DoctorMessages';
import DoctorSettings from './pages/doctor/DoctorSettings';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isSupabaseConfigured } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // If Supabase is not configured, allow access (for demo purposes)
  if (!isSupabaseConfigured) {
    return <>{children}</>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            
            {/* Patient App Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/logs"
              element={
                <ProtectedRoute>
                  <GlucoseLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meals"
              element={
                <ProtectedRoute>
                  <Logs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/labs"
              element={
                <ProtectedRoute>
                  <Labs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/treatment"
              element={
                <ProtectedRoute>
                  <TreatmentLogs />
                </ProtectedRoute>
              }
            />
            {/* Keep old route for backward compatibility */}
            <Route
              path="/insulin"
              element={
                <ProtectedRoute>
                  <TreatmentLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <AIChat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* Doctor/Provider App Routes */}
            <Route
              path="/app/doctor/onboarding"
              element={
                <ProtectedRoute>
                  <DoctorOnboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/doctor"
              element={
                <ProtectedRoute>
                  <DoctorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/doctor/patients"
              element={
                <ProtectedRoute>
                  <DoctorPatients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/doctor/patients/:patientId"
              element={
                <ProtectedRoute>
                  <PatientDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/doctor/chat"
              element={
                <ProtectedRoute>
                  <DoctorMessages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/doctor/messages"
              element={
                <ProtectedRoute>
                  <DoctorMessages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/doctor/settings"
              element={
                <ProtectedRoute>
                  <DoctorSettings />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;