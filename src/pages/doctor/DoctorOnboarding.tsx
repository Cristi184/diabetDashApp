import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { inviteCodeAPI, type UserRole } from '@/lib/supabase';

export default function DoctorOnboarding() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Profile details
  const [specialty, setSpecialty] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [relationToPatient, setRelationToPatient] = useState('');

  // Step 2: Connect to patients
  const [inviteCode, setInviteCode] = useState('');
  const [relationType, setRelationType] = useState<'doctor' | 'nutritionist' | 'family'>('doctor');
  const [connectedPatients, setConnectedPatients] = useState<string[]>([]);

  useEffect(() => {
    // Pre-fill data if available
    if (user?.user_metadata) {
      setSpecialty(user.user_metadata.specialty as string || '');
      setClinicName(user.user_metadata.clinic_name as string || '');
      setRelationToPatient(user.user_metadata.relation_to_patient as string || '');
      
      const role = user.user_metadata.role as UserRole;
      if (role === 'doctor' || role === 'nutritionist' || role === 'family') {
        setRelationType(role);
      }
    }
  }, [user]);

  const handleProfileSubmit = async () => {
    setLoading(true);
    try {
      const role = (user?.user_metadata?.role as UserRole) || 'doctor';
      const updates: Record<string, string> = { role };

      if (role === 'doctor' || role === 'nutritionist') {
        if (specialty) updates.specialty = specialty;
        if (clinicName) updates.clinic_name = clinicName;
      } else if (role === 'family') {
        if (relationToPatient) updates.relation_to_patient = relationToPatient;
      }

      await updateProfile(updates);
      toast.success('Profile updated successfully!');
      setStep(2);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectPatient = async () => {
    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }

    setLoading(true);
    try {
      await inviteCodeAPI.redeem(inviteCode.trim(), relationType);
      toast.success('Successfully connected to patient!');
      setConnectedPatients([...connectedPatients, inviteCode]);
      setInviteCode('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to patient';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    if (connectedPatients.length === 0) {
      toast.error('Please connect to at least one patient to continue');
      return;
    }
    navigate('/app/doctor');
  };

  const handleSkip = () => {
    navigate('/app/doctor');
  };

  const userRole = (user?.user_metadata?.role as UserRole) || 'doctor';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Welcome to DiabetesCare</CardTitle>
          <CardDescription className="text-slate-400">
            Let's set up your provider account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-500' : 'text-slate-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-blue-500 bg-blue-500/20' : 'border-slate-600'}`}>
                {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
              </div>
              <span className="text-sm font-medium">Profile</span>
            </div>
            <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-blue-500' : 'bg-slate-600'}`} />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-500' : 'text-slate-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-blue-500 bg-blue-500/20' : 'border-slate-600'}`}>
                2
              </div>
              <span className="text-sm font-medium">Connect Patients</span>
            </div>
          </div>

          {/* Step 1: Profile Details */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white mb-4">Complete Your Profile</h3>

              {(userRole === 'doctor' || userRole === 'nutritionist') && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="specialty" className="text-white">Specialty</Label>
                    <Input
                      id="specialty"
                      type="text"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="e.g., Endocrinology, Diabetes Care"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clinicName" className="text-white">Clinic/Hospital Name</Label>
                    <Input
                      id="clinicName"
                      type="text"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="e.g., City Medical Center"
                    />
                  </div>
                </>
              )}

              {userRole === 'family' && (
                <div className="space-y-2">
                  <Label htmlFor="relation" className="text-white">Relation to Patient</Label>
                  <Input
                    id="relation"
                    type="text"
                    value={relationToPatient}
                    onChange={(e) => setRelationToPatient(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="e.g., Spouse, Parent, Child"
                  />
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleProfileSubmit}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="border-slate-700 hover:bg-slate-800"
                >
                  Skip
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Connect to Patients */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white mb-4">Connect to Patients</h3>
              <p className="text-sm text-slate-400 mb-4">
                Enter the invite code provided by your patient to access their health data.
              </p>

              <div className="space-y-3">
                <Label htmlFor="inviteCode" className="text-white">Patient Invite Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="inviteCode"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="bg-slate-800 border-slate-700 text-white font-mono"
                    placeholder="PAT-XXXXXX"
                  />
                  <Button
                    onClick={handleConnectPatient}
                    disabled={loading || !inviteCode.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Connect'
                    )}
                  </Button>
                </div>
              </div>

              {connectedPatients.length > 0 && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-sm text-green-400 font-medium mb-2">
                    ✓ Connected to {connectedPatients.length} patient{connectedPatients.length > 1 ? 's' : ''}
                  </p>
                  <div className="space-y-1">
                    {connectedPatients.map((code, idx) => (
                      <p key={idx} className="text-xs text-slate-400 font-mono">
                        {code}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleFinish}
                  disabled={connectedPatients.length === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Finish Setup
                </Button>
                <Button
                  onClick={handleSkip}
                  variant="outline"
                  className="border-slate-700 hover:bg-slate-800"
                >
                  Skip for Now
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}