import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { labsAPI, uploadPhoto } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, X, Sparkles, AlertCircle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import CameraCapture from './CameraCapture';

interface PendingImage {
  file: File;
  preview: string;
  id: string;
}

interface AIDetectedResult {
  test_name: string;
  value: string;
  unit?: string;
  status?: 'normal' | 'high' | 'low';
  notes?: string;
  date?: string;
}

export default function AddLabDialog({ onAdd }: { onAdd: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [testName, setTestName] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [aiResults, setAiResults] = useState<AIDetectedResult[]>([]);

  const handleImageCapture = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setPendingImages(prev => [...prev, {
        file,
        preview: reader.result as string,
        id: Math.random().toString(36).substr(2, 9)
      }]);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (id: string) => {
    setPendingImages(prev => prev.filter(img => img.id !== id));
  };

  const analyzeWithAI = async () => {
    if (pendingImages.length === 0) {
      toast.error('Please add at least one image first');
      return;
    }

    setAnalyzing(true);
    const allResults: AIDetectedResult[] = [];

    try {
      // Analyze ALL images and collect unique test results
      for (let i = 0; i < pendingImages.length; i++) {
        const image = pendingImages[i];
        const base64Data = image.preview.split(',')[1];
        
        toast.info(`Analyzing image ${i + 1} of ${pendingImages.length}...`);
        
        const response = await fetch('https://bxhrkgyfpepniulhvgqh.supabase.co/functions/v1/app_adf262f319_analyze_lab', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4aHJrZ3lmcGVwbml1bGh2Z3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTI3MzcsImV4cCI6MjA3OTEyODczN30.nNw_tRgp7Tyltqd1jYFPNuB0M0WOLWght5_7PIn_1E8`,
          },
          body: JSON.stringify({ 
            image: base64Data,
            userId: user?.id 
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`AI analysis error for image ${i + 1}:`, errorData);
          toast.error(`Failed to analyze image ${i + 1}`);
          continue;
        }

        const data = await response.json();
        if (data.results && Array.isArray(data.results)) {
          // Add results from this image
          allResults.push(...data.results);
        }
      }

      // Remove duplicate test results (same test_name)
      const uniqueResults = allResults.reduce((acc, current) => {
        const existing = acc.find(item => item.test_name.toLowerCase() === current.test_name.toLowerCase());
        if (!existing) {
          acc.push(current);
        } else {
          // If duplicate found, keep the one with more detailed notes
          if ((current.notes?.length || 0) > (existing.notes?.length || 0)) {
            const index = acc.indexOf(existing);
            acc[index] = current;
          }
        }
        return acc;
      }, [] as AIDetectedResult[]);

      if (uniqueResults.length === 0) {
        toast.error('No test results detected in the images');
      } else {
        setAiResults(uniqueResults);
        toast.success(`AI Detected ${uniqueResults.length} Unique Test Result(s) from ${pendingImages.length} image(s)!`);
      }
    } catch (error) {
      console.error('Error analyzing images:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze images with AI');
    } finally {
      setAnalyzing(false);
    }
  };

  const getStatusIcon = (status?: string) => {
    if (status === 'high') {
      return <TrendingUp className="w-5 h-5 text-red-500" />;
    }
    if (status === 'low') {
      return <TrendingDown className="w-5 h-5 text-yellow-500" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getStatusBadge = (status?: string) => {
    if (status === 'high') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
          <TrendingUp className="w-3 h-3 mr-1" />
          High
        </span>
      );
    }
    if (status === 'low') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
          <TrendingDown className="w-3 h-3 mr-1" />
          Low
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
        <CheckCircle className="w-3 h-3 mr-1" />
        Normal
      </span>
    );
  };

  const getStatusColor = (status?: string) => {
    if (status === 'high') {
      return 'border-red-500/50 bg-gradient-to-br from-red-500/10 to-red-500/5';
    }
    if (status === 'low') {
      return 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5';
    }
    return 'border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-500/5';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Check if we have AI results or manual entry
    if (aiResults.length === 0 && (!testName.trim() || !value.trim())) {
      toast.error('Please enter test name and value, or use AI to analyze images');
      return;
    }

    setLoading(true);

    try {
      // Upload all images first (only if there are images)
      const uploadedUrls: string[] = [];
      if (pendingImages.length > 0) {
        for (const img of pendingImages) {
          const url = await uploadPhoto(img.file, user.id, 'labs');
          if (url) {
            uploadedUrls.push(url);
          }
        }
      }

      if (aiResults.length > 0) {
        // Save all AI-detected results as ONE lab result with multiple images
        const combinedTestName = aiResults.map(r => r.test_name).join(', ');
        const combinedValue = aiResults.map(r => `${r.test_name}: ${r.value}${r.unit || ''}`).join(' | ');
        
        // Combine all notes with status indicators AND VALUES
        const combinedNotes = aiResults
          .map(r => {
            const statusEmoji = r.status === 'high' ? '🔴' : r.status === 'low' ? '🟡' : '🟢';
            const valueText = `${r.value}${r.unit || ''}`;
            return `${statusEmoji} ${r.test_name} (${valueText}): ${r.notes || 'No additional notes'}`;
          })
          .join('\n\n');

        await labsAPI.create({
          user_id: user.id,
          test_name: combinedTestName,
          value: combinedValue,
          date,
          notes: combinedNotes,
          photo_url: uploadedUrls.length > 0 ? uploadedUrls[0] : undefined,
          photo_urls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
        });

        toast.success(`Lab results saved with ${uploadedUrls.length} image(s) and health recommendations!`);
      } else {
        // Manual entry - save with or without images
        await labsAPI.create({
          user_id: user.id,
          test_name,
          value,
          date,
          photo_url: uploadedUrls.length > 0 ? uploadedUrls[0] : undefined,
          photo_urls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
        });

        toast.success('Lab result added successfully!');
      }

      onAdd();
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding lab result:', error);
      toast.error('Failed to add lab result');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTestName('');
    setValue('');
    setDate(new Date().toISOString().split('T')[0]);
    setPendingImages([]);
    setAiResults([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Result
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Lab Result</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Upload Images (Optional)</Label>
            <div className="flex gap-2">
              <CameraCapture onCapture={handleImageCapture} allowMultiple />
            </div>
            
            {pendingImages.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-slate-400">{pendingImages.length} image(s) added</p>
                <div className="grid grid-cols-2 gap-2">
                  {pendingImages.map((img) => (
                    <div key={img.id} className="relative group">
                      <img
                        src={img.preview}
                        alt="Lab report preview"
                        className="w-full h-32 object-cover rounded-lg border border-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(img.id)}
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  onClick={analyzeWithAI}
                  disabled={analyzing || pendingImages.length === 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing all images...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze All {pendingImages.length} Image(s) with AI
                    </>
                  )}
                </Button>
                <p className="text-xs text-slate-500 text-center">
                  💡 AI will analyze all {pendingImages.length} images and combine unique test results
                </p>
              </div>
            )}
          </div>

          {aiResults.length > 0 && (
            <div className="space-y-3 p-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-purple-500/30 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <p className="text-base font-semibold text-purple-400">
                  AI Detected {aiResults.length} Test Result(s)
                </p>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {aiResults.map((result, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-xl border-2 ${getStatusColor(result.status)} backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-xl`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getStatusIcon(result.status)}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-base font-bold text-white">{result.test_name}</h4>
                          {getStatusBadge(result.status)}
                        </div>
                        <p className="text-lg font-semibold text-slate-200">
                          {result.value} {result.unit || ''}
                        </p>
                        {result.notes && (
                          <div className="pt-2 border-t border-slate-700/50">
                            <p className="text-sm text-slate-300 leading-relaxed">
                              {result.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-slate-700/50">
                <p className="text-xs text-slate-400 text-center">
                  📊 All {aiResults.length} results will be saved together with {pendingImages.length} image(s)
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="test_name">Test Name</Label>
            <Input
              id="test_name"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="e.g., HbA1c, Fasting Glucose"
              className="bg-slate-800 border-slate-700"
              disabled={aiResults.length > 0}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Value</Label>
            <Input
              id="value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g., 6.5%, 110 mg/dL"
              className="bg-slate-800 border-slate-700"
              disabled={aiResults.length > 0}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-800 border-slate-700"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 border-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || (aiResults.length === 0 && (!testName.trim() || !value.trim()))}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : aiResults.length > 0 ? (
                `Save All ${aiResults.length} Result(s)`
              ) : (
                'Add Result'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}