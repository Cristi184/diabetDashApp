import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { UserRole } from '@/lib/supabase';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('patient');
  const [specialty, setSpecialty] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [relationToPatient, setRelationToPatient] = useState('');
  const [diabetesType, setDiabetesType] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Build user metadata based on role
      const metadata: Record<string, string> = {
        full_name: fullName,
        role: role,
      };

      if (role === 'doctor' || role === 'nutritionist') {
        if (specialty) metadata.specialty = specialty;
        if (clinicName) metadata.clinic_name = clinicName;
      } else if (role === 'family') {
        if (relationToPatient) metadata.relation_to_patient = relationToPatient;
      } else if (role === 'patient') {
        if (diabetesType) metadata.diabetes_type = diabetesType;
        if (age) metadata.age = age;
        if (weight) metadata.weight = weight;
      }

      // Update the signUp to accept metadata
      await signUp(email, password, fullName);
      
      // Update user metadata with role and additional info
      const { supabase } = await import('@/lib/supabase');
      await supabase.auth.updateUser({
        data: metadata
      });

      toast.success('Account created successfully!');
      
      // Redirect based on role
      if (role === 'doctor' || role === 'nutritionist' || role === 'family') {
        navigate('/app/doctor/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="w-8 h-8 text-red-500" />
            <CardTitle className="text-2xl text-white">Create Account</CardTitle>
          </div>
          <CardDescription className="text-slate-400">
            Join DiabetesCare to start managing your health
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-white">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-white">I am a...</Label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="nutritionist">Nutritionist</SelectItem>
                  <SelectItem value="family">Family Member</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role === 'patient' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="diabetesType" className="text-white">Diabetes Type</Label>
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
                  <Label htmlFor="age" className="text-white">Age</Label>
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
                  <Label htmlFor="weight" className="text-white">Weight (kg)</Label>
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
              </>
            )}

            {(role === 'doctor' || role === 'nutritionist') && (
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

            {role === 'family' && (
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            <p className="text-center text-sm text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-green-500 hover:text-green-400">
                Sign In
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}