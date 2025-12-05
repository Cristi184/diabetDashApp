import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { labsAPI, type LabResult } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import AddLabDialog from '@/components/AddLabDialog';
import LabDetailModal from '@/components/LabDetailModal';

export default function Labs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLab, setSelectedLab] = useState<LabResult | null>(null);

  const loadLabs = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = await labsAPI.getAll(user.id);
      setLabs(data);
    } catch (error) {
      console.error('Error loading labs:', error);
      toast.error('Failed to load lab results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLabs();
  }, [user]);

  const handleDelete = async (id: string) => {
    try {
      await labsAPI.delete(id);
      toast.success('Lab result deleted');
      loadLabs();
    } catch (error) {
      console.error('Error deleting lab result:', error);
      toast.error('Failed to delete lab result');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">Lab Results</h1>
          </div>
          <AddLabDialog onAdd={loadLabs} />
        </div>

        {labs.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="py-12 text-center">
              <p className="text-slate-400">No lab results yet</p>
              <p className="text-sm text-slate-500 mt-2">Add your lab results to track your health metrics</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {labs.map((lab) => (
              <LabResultCard 
                key={lab.id} 
                lab={lab} 
                onDelete={handleDelete}
                onViewDetails={() => setSelectedLab(lab)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedLab && (
        <LabDetailModal
          lab={selectedLab}
          open={!!selectedLab}
          onClose={() => setSelectedLab(null)}
        />
      )}
    </div>
  );
}

function LabResultCard({ 
  lab, 
  onDelete, 
  onViewDetails 
}: { 
  lab: LabResult; 
  onDelete: (id: string) => void;
  onViewDetails: () => void;
}) {
  // Get all image URLs - prioritize photo_urls array, fallback to photo_url
  const imageUrls = lab.photo_urls && lab.photo_urls.length > 0 
    ? lab.photo_urls 
    : lab.photo_url 
    ? [lab.photo_url] 
    : [];

  const hasImages = imageUrls.length > 0;
  const hasMultipleImages = imageUrls.length > 1;

  // Check if this is an AI-generated result (has notes with recommendations)
  const isAIGenerated = lab.notes && lab.notes.length > 0;

  // Check if notes contain warning indicators
  const hasWarnings = lab.notes && (lab.notes.includes('⚠️') || lab.notes.includes('higher than normal') || lab.notes.includes('lower than normal'));

  // Truncate notes for preview
  const truncatedNotes = lab.notes && lab.notes.length > 150 
    ? lab.notes.substring(0, 150) + '...' 
    : lab.notes;

  // Display title: if AI-generated, show only date; otherwise show test name
  const displayTitle = isAIGenerated 
    ? new Date(lab.date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : lab.test_name;

  return (
    <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors cursor-pointer">
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex-1">
          <CardTitle className="text-lg">{displayTitle}</CardTitle>
          {!isAIGenerated && (
            <p className="text-sm text-slate-400 mt-1">
              {new Date(lab.date).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
            className="text-purple-400 hover:text-purple-300 hover:bg-purple-950"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(lab.id);
            }}
            className="text-red-400 hover:text-red-300 hover:bg-red-950"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent onClick={onViewDetails}>
        <div className="space-y-4">
          {!isAIGenerated && (
            <div>
              <p className="text-2xl font-bold text-purple-500">{lab.value}</p>
              <p className="text-xs text-slate-500">Test Result</p>
            </div>
          )}
          
          {lab.notes && (
            <div className={`p-3 rounded-lg border ${
              hasWarnings 
                ? 'bg-yellow-500/10 border-yellow-500/30' 
                : 'bg-green-500/10 border-green-500/30'
            }`}>
              <div className="flex items-start gap-2">
                {hasWarnings ? (
                  <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-xs font-medium mb-1">
                    Health Recommendations
                  </p>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    {truncatedNotes}
                  </div>
                  {lab.notes && lab.notes.length > 150 && (
                    <p className="text-xs text-purple-400 mt-1">Click to read more...</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {hasImages && (
            <div className="relative">
              <img
                src={imageUrls[0]}
                alt={`${displayTitle} report preview`}
                className="w-full h-48 object-cover rounded-lg border border-slate-700"
              />
              
              {hasMultipleImages && (
                <div className="absolute top-2 right-2 bg-black/70 px-3 py-1 rounded-full">
                  <p className="text-xs text-white font-medium">
                    +{imageUrls.length - 1} more
                  </p>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-lg flex items-end justify-center pb-3">
                <p className="text-xs text-white font-medium">Click to view all images & analysis</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}