import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, AlertCircle, Upload } from 'lucide-react';
import { GlucoseReading, supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface GlucoseAnalysisProps {
  readings: GlucoseReading[];
}

export default function GlucoseAnalysis({ readings }: GlucoseAnalysisProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSelectedImage(base64);
      setError(null);
      setAnalysis(null);
    };
    reader.readAsDataURL(file);
  };

  const analyzeGlucoseImage = async () => {
    if (!selectedImage) {
      toast.error('Please upload a glucose meter image first');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);
    
    try {
      console.log('Calling glucose image analysis edge function...');
      
      // Extract base64 data from data URL
      const base64Data = selectedImage.split(',')[1];
      
      // Call the Supabase edge function
      const { data, error: functionError } = await supabase.functions.invoke('app_adf262f319_analyze_glucose', {
        body: { 
          image: base64Data,
          readings: readings.slice(0, 10) // Include recent readings for context
        }
      });

      console.log('Edge function response:', { data, error: functionError });

      if (functionError) {
        console.error('Edge function error:', functionError);
        throw new Error(functionError.message || 'Failed to analyze glucose image');
      }

      if (data && data.error) {
        console.error('API error in response:', data.error);
        
        if (data.error.message && data.error.message.includes("didn't provide an API key")) {
          throw new Error('OpenAI API key is not configured. Please add OPENAI_API_KEY to your Supabase edge function secrets.');
        }
        
        throw new Error(data.error.message || 'Failed to analyze glucose image');
      }

      if (data && data.analysis) {
        setAnalysis(data.analysis);
        toast.success('Analysis complete!');
      } else {
        throw new Error('No analysis returned from the server');
      }
    } catch (err: unknown) {
      console.error('Error analyzing glucose image:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze glucose image. Please try again.';
      setError(errorMessage);
      toast.error('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-500" />
          AI Glucose Image Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4 bg-red-950/50 border-red-900">
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

        {!analysis ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-slate-400 mb-4">
                Upload a photo of your glucose meter for AI-powered analysis and insights
              </p>
              
              {selectedImage && (
                <div className="mb-4">
                  <img 
                    src={selectedImage} 
                    alt="Glucose meter" 
                    className="max-w-full h-48 object-contain mx-auto rounded-lg border border-slate-700"
                  />
                </div>
              )}

              <div className="flex flex-col gap-2 items-center">
                <label htmlFor="glucose-image-upload">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-700 text-white hover:bg-slate-800"
                    onClick={() => document.getElementById('glucose-image-upload')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {selectedImage ? 'Change Image' : 'Upload Glucose Meter Image'}
                  </Button>
                </label>
                <input
                  id="glucose-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {selectedImage && (
                  <Button
                    onClick={analyzeGlucoseImage}
                    disabled={isAnalyzing}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing Image...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Analyze Image
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedImage && (
              <div className="mb-4">
                <img 
                  src={selectedImage} 
                  alt="Analyzed glucose meter" 
                  className="max-w-full h-32 object-contain mx-auto rounded-lg border border-slate-700"
                />
              </div>
            )}
            
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                {analysis}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setAnalysis(null);
                  setError(null);
                  setSelectedImage(null);
                }}
                variant="outline"
                className="flex-1 border-slate-700 text-white hover:bg-slate-800"
              >
                Analyze Another Image
              </Button>
              <Button
                onClick={() => {
                  setAnalysis(null);
                  setError(null);
                  setSelectedImage(null);
                }}
                variant="ghost"
                className="text-slate-400 hover:text-white"
              >
                Clear
              </Button>
            </div>
            
            <div className="text-xs text-slate-500 p-3 bg-slate-950 rounded border border-slate-800">
              <p>
                ⚠️ This analysis is for informational purposes only. Always consult your healthcare provider for medical advice and treatment decisions.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}