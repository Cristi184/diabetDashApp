import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Search, Loader2, ChevronRight, Activity, User, Weight, Droplet } from 'lucide-react';
import { careRelationAPI, glucoseAPI, type CareRelation } from '@/lib/supabase';
import DoctorLayout from '@/components/doctor/DoctorLayout';

interface PatientWithRelation extends CareRelation {
  patient?: {
    id: string;
    email: string;
    full_name?: string;
    role?: string;
    diabetes_type?: string;
    age?: string;
    weight?: string;
  };
  averageGlucose?: number | null;
}

export default function DoctorPatients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<PatientWithRelation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPatients();
  }, [user]);

  const loadPatients = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Use the updated API that fetches profiles via edge function
      const relations = await careRelationAPI.getAllForCaregiver(user.id);
      console.log('Loaded patients:', relations);
      
      // Fetch average glucose for each patient
      const patientsWithGlucose = await Promise.all(
        relations.map(async (relation) => {
          try {
            const avgGlucose = await glucoseAPI.getAverage(relation.patient_id, 30);
            return {
              ...relation,
              averageGlucose: avgGlucose,
            };
          } catch (error) {
            console.error('Error fetching glucose for patient:', relation.patient_id, error);
            return {
              ...relation,
              averageGlucose: null,
            };
          }
        })
      );
      
      setPatients(patientsWithGlucose);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const searchLower = searchQuery.toLowerCase();
    const name = p.patient?.full_name?.toLowerCase() || '';
    const email = p.patient?.email?.toLowerCase() || '';
    return name.includes(searchLower) || email.includes(searchLower);
  });

  const getDiabetesTypeLabel = (type?: string) => {
    switch (type) {
      case 'type1':
        return 'Type 1';
      case 'type2':
        return 'Type 2';
      case 'prediabetes':
        return 'Pre-Diabetes';
      default:
        return type || 'Not specified';
    }
  };

  const getGlucoseColor = (value?: number | null) => {
    if (!value) return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    if (value < 70) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    if (value > 180) return 'bg-red-500/20 text-red-400 border-red-500/50';
    return 'bg-green-500/20 text-green-400 border-green-500/50';
  };

  return (
    <DoctorLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">My Patients</h1>
            <p className="text-slate-400 mt-1">{patients.length} connected patients</p>
          </div>
          <Button
            onClick={() => navigate('/app/doctor/onboarding')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Connect New Patient
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patients by name or email..."
            className="pl-10 bg-slate-900 border-slate-800 text-white"
          />
        </div>

        {/* Patients List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredPatients.length > 0 ? (
          <div className="grid gap-4">
            {filteredPatients.map((relation) => (
              <Card
                key={relation.id}
                onClick={() => navigate(`/app/doctor/patients/${relation.patient_id}`)}
                className="bg-slate-900 border-slate-800 hover:border-blue-600 transition-colors cursor-pointer"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium text-xl">
                          {relation.patient?.full_name?.[0] || 'P'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-white text-lg">
                            {relation.patient?.full_name || 'Patient'}
                          </h3>
                          
                          {/* Diabetes Type and Age badges next to name */}
                          {relation.patient?.diabetes_type && (
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs">
                              <Activity className="w-3 h-3 mr-1" />
                              {getDiabetesTypeLabel(relation.patient.diabetes_type)}
                            </Badge>
                          )}
                          
                          {relation.patient?.age && (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">
                              <User className="w-3 h-3 mr-1" />
                              {relation.patient.age} years
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mb-2">{relation.patient?.email}</p>
                        
                        {/* Weight and Glucose chips below email */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {relation.patient?.weight && (
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/30 text-xs">
                              <Weight className="w-3 h-3 mr-1" />
                              {relation.patient.weight} kg
                            </Badge>
                          )}
                          
                          {relation.averageGlucose !== undefined && (
                            <Badge variant="outline" className={`${getGlucoseColor(relation.averageGlucose)} text-xs`}>
                              <Droplet className="w-3 h-3 mr-1" />
                              {relation.averageGlucose ? `${relation.averageGlucose} mg/dL avg` : 'No data'}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-xs text-slate-500 mt-2">
                          Connected since {new Date(relation.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-slate-400 flex-shrink-0 ml-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="py-12">
              <div className="text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <h3 className="text-xl font-medium text-white mb-2">
                  {searchQuery ? 'No patients found' : 'No patients connected yet'}
                </h3>
                <p className="text-slate-400 mb-6">
                  {searchQuery
                    ? 'Try adjusting your search query'
                    : 'Connect to patients using their invite codes'}
                </p>
                {!searchQuery && (
                  <Button
                    onClick={() => navigate('/app/doctor/onboarding')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Connect to Patients
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DoctorLayout>
  );
}