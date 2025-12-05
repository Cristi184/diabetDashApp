import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, Camera, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { glucoseAPI, supabase } from '@/lib/supabase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ExtractedReading {
  date: string;
  time: string;
  value: number;
}

interface UploadGlucoseImageDialogProps {
  onSuccess?: () => void;
}

export default function UploadGlucoseImageDialog({ onSuccess }: UploadGlucoseImageDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedReading[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!selectedFile || !user) return;

    setAnalyzing(true);
    setError(null);
    setExtractedData([]);
    
    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      
      reader.onloadend = async () => {
        try {
          const base64Image = reader.result as string;
          const base64Data = base64Image.split(',')[1];
          
          console.log('Calling glucose image extraction edge function...');
          
          // Call Supabase edge function
          const { data, error: functionError } = await supabase.functions.invoke(
            'app_adf262f319_extract_glucose',
            {
              body: { image: base64Data }
            }
          );

          console.log('Edge function response:', { data, error: functionError });

          if (functionError) {
            console.error('Edge function error:', functionError);
            throw new Error(functionError.message || 'Failed to analyze image');
          }

          if (data && data.error) {
            console.error('API error in response:', data.error);
            
            if (data.error.message && data.error.message.includes("didn't provide an API key")) {
              throw new Error('OpenAI API key is not configured. Please add OPENAI_API_KEY to your Supabase edge function secrets.');
            }
            
            throw new Error(data.error.message || 'Failed to analyze image');
          }

          if (data && data.readings && Array.isArray(data.readings)) {
            if (data.readings.length === 0) {
              toast.error('No glucose readings found in the image');
              setAnalyzing(false);
              return;
            }

            setExtractedData(data.readings);
            toast.success(`Found ${data.readings.length} glucose reading${data.readings.length > 1 ? 's' : ''}!`);
          } else {
            throw new Error('No readings returned from the server');
          }
        } catch (err: unknown) {
          console.error('Error analyzing image:', err);
          const errorMessage = err instanceof Error ? err.message : 'Failed to analyze image. Please try again.';
          setError(errorMessage);
          toast.error('Analysis failed');
        } finally {
          setAnalyzing(false);
        }
      };
    } catch (err: unknown) {
      console.error('Error reading file:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to read image file';
      setError(errorMessage);
      toast.error('Failed to read image');
      setAnalyzing(false);
    }
  };

  const importReadings = async () => {
    if (!user || extractedData.length === 0) return;

    setImporting(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const reading of extractedData) {
        try {
          // Combine date and time into ISO timestamp
          const timestamp = new Date(`${reading.date}T${reading.time}:00`).toISOString();
          
          await glucoseAPI.create({
            user_id: user.id,
            value: reading.value,
            date: timestamp,
            notes: 'Imported from image'
          });
          
          successCount++;
        } catch (error) {
          console.error('Error importing reading:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} reading${successCount > 1 ? 's' : ''}!`);
        setOpen(false);
        setSelectedFile(null);
        setPreviewUrl(null);
        setExtractedData([]);
        setError(null);
        onSuccess?.();
      }

      if (errorCount > 0) {
        toast.warning(`${errorCount} reading${errorCount > 1 ? 's' : ''} failed to import`);
      }
    } catch (error) {
      console.error('Error importing readings:', error);
      toast.error('Failed to import readings');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-purple-600 hover:bg-purple-700">
          <Camera className="w-4 h-4 mr-2" />
          Upload Glucose Image
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Glucose Readings from Image</DialogTitle>
          <DialogDescription className="text-slate-400">
            Upload a photo of your glucose meter or monitoring app chart. AI will extract all visible readings automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive" className="bg-red-950/50 border-red-900">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Analysis Failed</AlertTitle>
              <AlertDescription className="text-sm">
                {error}
                {error.includes('API key') && (
                  <div className="mt-2 text-xs">
                    <p className="font-semibold">To fix this:</p>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      <li>Go to your Supabase Dashboard</li>
                      <li>Navigate to Project Settings → Edge Functions → Secrets</li>
                      <li>Add a secret named <code className="bg-red-900/30 px-1 rounded">OPENAI_API_KEY</code></li>
                      <li>Get your key from <a href="https://platform.openai.com/account/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI</a></li>
                    </ol>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="image-upload" className="text-slate-300">
              Select Image
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <p className="text-xs text-slate-500">
              Supported: Glucose meter photos, app screenshots, charts, graphs (max 10MB)
            </p>
          </div>

          {/* Image Preview */}
          {previewUrl && (
            <div className="space-y-2">
              <Label className="text-slate-300">Preview</Label>
              <div className="relative border-2 border-slate-700 rounded-lg overflow-hidden">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full h-auto max-h-96 object-contain bg-slate-800"
                />
              </div>
            </div>
          )}

          {/* Analyze Button */}
          {selectedFile && !extractedData.length && (
            <Button
              onClick={analyzeImage}
              disabled={analyzing}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Image...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Analyze & Extract All Data
                </>
              )}
            </Button>
          )}

          {/* Extracted Data Preview */}
          {extractedData.length > 0 && (
            <div className="space-y-2">
              <Label className="text-slate-300">
                Found {extractedData.length} Reading{extractedData.length > 1 ? 's' : ''}
              </Label>
              <div className="max-h-64 overflow-y-auto bg-slate-800 rounded-lg p-4 space-y-2">
                {extractedData.map((reading, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium text-white">
                          {reading.value} mg/dL
                        </p>
                        <p className="text-xs text-slate-400">
                          {reading.date} at {reading.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={importReadings}
                disabled={importing}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing {extractedData.length} Reading{extractedData.length > 1 ? 's' : ''}...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import All {extractedData.length} Reading{extractedData.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}