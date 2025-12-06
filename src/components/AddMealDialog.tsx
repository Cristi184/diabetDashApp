import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Camera, Sparkles, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { mealsAPI, uploadPhoto } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentLocalDateTime, localDateTimeToISO } from '@/lib/dateUtils';
import CameraCapture from './CameraCapture';
import { supabase } from '@/lib/supabase';

interface AddMealDialogProps {
  onMealAdded?: () => void;
}

export default function AddMealDialog({ onMealAdded }: AddMealDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [carbs, setCarbs] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [calories, setCalories] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [showCamera, setShowCamera] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // Set current local date and time when dialog opens
      setDate(getCurrentLocalDateTime());
    } else {
      // Reset form when dialog closes
      setName('');
      setCarbs('');
      setProtein('');
      setFat('');
      setCalories('');
      setDescription('');
      setDate('');
      setPhoto(null);
      setPhotoPreview('');
      setShowCamera(false);
    }
  };

  const handlePhotoCapture = (file: File) => {
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setShowCamera(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB');
        return;
      }

      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setShowCamera(false);
    }
  };

  const handleAnalyzeMeal = async () => {
    if (!photo) {
      toast.error('Please take or upload a photo first');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Convert photo to base64
      const reader = new FileReader();
      reader.readAsDataURL(photo);
      
      await new Promise((resolve, reject) => {
        reader.onload = resolve;
        reader.onerror = reject;
      });

      const base64Image = (reader.result as string).split(',')[1];

      // Call edge function to analyze meal
      const { data, error } = await supabase.functions.invoke('app_adf262f319_analyze_meal', {
        body: {
          image: base64Image,
          userId: user?.id,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data) {
        // Update form with AI analysis - save ALL data
        if (data.name) setName(data.name);
        if (data.carbs) setCarbs(data.carbs.toString());
        if (data.protein) setProtein(data.protein.toString());
        if (data.fat) setFat(data.fat.toString());
        if (data.calories) setCalories(data.calories.toString());
        if (data.description) setDescription(data.description);
        
        toast.success('Meal analyzed successfully!', {
          description: data.description || 'Nutritional information estimated',
        });
      } else {
        throw new Error('No response from AI');
      }
    } catch (error) {
      console.error('Error analyzing meal:', error);
      toast.error('Failed to analyze meal. Please enter details manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      let photoUrl = undefined;
      
      if (photo) {
        photoUrl = await uploadPhoto(photo, user.id, 'meals');
        if (!photoUrl) {
          toast.error('Failed to upload photo');
          return;
        }
      }

      await mealsAPI.create({
        user_id: user.id,
        name,
        carbs: parseFloat(carbs),
        protein: protein ? parseFloat(protein) : undefined,
        fat: fat ? parseFloat(fat) : undefined,
        calories: calories ? parseInt(calories) : undefined,
        description: description || undefined,
        date: localDateTimeToISO(date),
        photo_url: photoUrl,
      });

      toast.success('Meal logged successfully');
      handleOpen(false);
      
      // Call the callback to refresh the meal list
      if (onMealAdded) {
        onMealAdded();
      }
    } catch (error) {
      console.error('Error adding meal:', error);
      toast.error('Failed to log meal');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
          <Plus className="w-4 h-4 mr-2" />
          Log Meal
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Meal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo Section */}
          <div className="space-y-2">
            <Label>Meal Photo (Optional)</Label>
            {photoPreview ? (
              <div className="space-y-2">
                <img
                  src={photoPreview}
                  alt="Meal preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-slate-700 text-white hover:bg-slate-800"
                    onClick={() => {
                      setPhoto(null);
                      setPhotoPreview('');
                    }}
                  >
                    Remove Photo
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    onClick={handleAnalyzeMeal}
                    disabled={isAnalyzing}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
                  </Button>
                </div>
              </div>
            ) : showCamera ? (
              <CameraCapture onCapture={handlePhotoCapture} onCancel={() => setShowCamera(false)} />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-700 text-white hover:bg-slate-800"
                  onClick={() => setShowCamera(true)}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-700 text-white hover:bg-slate-800"
                  onClick={() => document.getElementById('meal-file-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </Button>
                <input
                  id="meal-file-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Meal Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Grilled Chicken Salad"
              required
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="carbs">Carbs (g)</Label>
              <Input
                id="carbs"
                type="number"
                step="0.1"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="45"
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="protein">Protein (g)</Label>
              <Input
                id="protein"
                type="number"
                step="0.1"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="30"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fat">Fat (g)</Label>
              <Input
                id="fat"
                type="number"
                step="0.1"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="15"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="calories">Calories</Label>
              <Input
                id="calories"
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="450"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="AI-generated or custom description"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date & Time</Label>
            <Input
              id="date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
            Save Meal
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}