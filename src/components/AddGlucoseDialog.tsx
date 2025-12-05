import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { glucoseAPI } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface AddGlucoseDialogProps {
  onAdd: () => void;
}

export default function AddGlucoseDialog({ onAdd }: AddGlucoseDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    // Reset date to current time when dialog opens
    if (newOpen) {
      setDate(new Date().toISOString().slice(0, 16));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to add glucose readings');
      return;
    }

    if (!value) {
      toast.error('Please enter a glucose value');
      return;
    }

    setIsSubmitting(true);
    try {
      await glucoseAPI.create({
        user_id: user.id,
        value: parseInt(value),
        date: new Date(date).toISOString(),
        notes: notes || undefined,
      });

      toast.success('Glucose reading added!');
      setValue('');
      setDate(new Date().toISOString().slice(0, 16));
      setNotes('');
      setOpen(false);
      onAdd();
    } catch (error) {
      console.error('Error adding glucose reading:', error);
      toast.error('Failed to add glucose reading');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Reading
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle>Add Glucose Reading</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="value">Glucose Value (mg/dL)</Label>
            <Input
              id="value"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="120"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date & Time</Label>
            <Input
              id="date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="Before meal, after exercise, etc."
              disabled={isSubmitting}
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add Reading'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}