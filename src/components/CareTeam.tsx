import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Copy, Check, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { inviteCodeAPI, careRelationAPI, type CareRelation } from '@/lib/supabase';

interface CaregiverWithRelation extends CareRelation {
  caregiver?: {
    id: string;
    email: string;
    full_name?: string;
    role?: string;
    specialty?: string;
    clinic_name?: string;
    relation_to_patient?: string;
  };
}

export default function CareTeam() {
  const { user } = useAuth();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [caregivers, setCaregivers] = useState<CaregiverWithRelation[]>([]);
  const [loadingCaregivers, setLoadingCaregivers] = useState(true);

  useEffect(() => {
    loadCaregivers();
    loadInviteCode();
  }, [user]);

  const loadInviteCode = async () => {
    if (!user) return;
    try {
      const codes = await inviteCodeAPI.getAllForPatient(user.id);
      const validCode = codes.find(c => !c.used && new Date(c.expires_at) > new Date());
      if (validCode) {
        setInviteCode(validCode.code);
        setExpiresAt(validCode.expires_at);
      }
    } catch (error) {
      console.error('Error loading invite code:', error);
    }
  };

  const loadCaregivers = async () => {
    if (!user) return;
    setLoadingCaregivers(true);
    try {
      // Use the updated careRelationAPI that fetches profiles via edge function
      const relations = await careRelationAPI.getAllForPatient(user.id);
      setCaregivers(relations);
    } catch (error) {
      console.error('Error loading caregivers:', error);
      toast.error('Failed to load care team');
    } finally {
      setLoadingCaregivers(false);
    }
  };

  const generateInviteCode = async () => {
    setLoading(true);
    try {
      const result = await inviteCodeAPI.generate();
      setInviteCode(result.code);
      setExpiresAt(result.expires_at);
      toast.success('Invite code generated successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate invite code';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast.success('Code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const removeCaregiver = async (relationId: string) => {
    try {
      await careRelationAPI.delete(relationId);
      toast.success('Caregiver removed from your care team');
      loadCaregivers();
    } catch (error) {
      toast.error('Failed to remove caregiver');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'doctor':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'nutritionist':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'family':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <CardTitle>My Care Team</CardTitle>
          </div>
          <CardDescription className="text-slate-400">
            Share your health data with doctors, nutritionists, and family members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invite Code Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-300">Invite Code</h3>
            {inviteCode ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-3 font-mono text-lg text-center">
                    {inviteCode}
                  </div>
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    size="icon"
                    className="border-slate-700 hover:bg-slate-800"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Expires: {new Date(expiresAt!).toLocaleDateString()}
                </p>
                <p className="text-xs text-slate-400">
                  Share this code with your healthcare provider or family member to give them access to your health data.
                </p>
              </div>
            ) : (
              <Button
                onClick={generateInviteCode}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Invite Code'
                )}
              </Button>
            )}
          </div>

          {/* Connected Caregivers */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-300">Connected Caregivers</h3>
            {loadingCaregivers ? (
              <div className="text-center py-4 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : caregivers.length > 0 ? (
              <div className="space-y-2">
                {caregivers.map((relation) => (
                  <div
                    key={relation.id}
                    className="flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-white">
                          {relation.caregiver?.full_name || 'Unknown'}
                        </p>
                        <Badge className={getRoleBadgeColor(relation.relation_type)}>
                          {relation.relation_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400">{relation.caregiver?.email}</p>
                      {relation.caregiver?.specialty && (
                        <p className="text-xs text-slate-500 mt-1">
                          {relation.caregiver.specialty}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => removeCaregiver(relation.id)}
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No caregivers connected yet</p>
                <p className="text-xs mt-1">Generate an invite code to add caregivers to your team</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}