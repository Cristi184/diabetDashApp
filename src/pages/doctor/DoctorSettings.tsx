import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import DoctorLayout from '@/components/doctor/DoctorLayout';
import type { UserRole } from '@/lib/supabase';

export default function DoctorSettings() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [relationToPatient, setRelationToPatient] = useState('');

  useEffect(() => {
    if (user) {
      setFullName((user.user_metadata?.full_name as string) || '');
      setEmail(user.email || '');
      setSpecialty((user.user_metadata?.specialty as string) || '');
      setClinicName((user.user_metadata?.clinic_name as string) || '');
      setRelationToPatient((user.user_metadata?.relation_to_patient as string) || '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const updates: Record<string, string> = { full_name: fullName };
      
      if (email !== user?.email) {
        updates.email = email;
      }

      const role = (user?.user_metadata?.role as UserRole) || 'doctor';
      if (role === 'doctor' || role === 'nutritionist') {
        if (specialty) updates.specialty = specialty;
        if (clinicName) updates.clinic_name = clinicName;
      } else if (role === 'family') {
        if (relationToPatient) updates.relation_to_patient = relationToPatient;
      }

      await updateProfile(updates);
      toast.success('Profile updated successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const userRole = (user?.user_metadata?.role as UserRole) || 'doctor';

  return (
    <DoctorLayout>
      <div className="p-8 space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 mt-1">Manage your account settings</p>
        </div>

        {/* Profile Settings */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-white">Profile Information</CardTitle>
            </div>
            <CardDescription className="text-slate-400">
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-white">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Professional Information */}
        {(userRole === 'doctor' || userRole === 'nutritionist') && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-white">Professional Information</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Update your professional details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>
        )}

        {/* Family Member Information */}
        {userRole === 'family' && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-white">Relationship Information</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Update your relationship to the patient
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSaveProfile}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>

        {/* Account Actions */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Account Actions</CardTitle>
            <CardDescription className="text-slate-400">
              Manage your account settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => navigate('/app/doctor/onboarding')}
              variant="outline"
              className="w-full border-slate-700 hover:bg-slate-800"
            >
              Connect to New Patients
            </Button>
          </CardContent>
        </Card>
      </div>
    </DoctorLayout>
  );
}