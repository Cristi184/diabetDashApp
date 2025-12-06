import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { treatmentAPI } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentLocalDateTime, localDateTimeToISO } from '@/lib/dateUtils';
import { toast } from 'sonner';

interface AddTreatmentDialogProps {
  onTreatmentAdded?: () => void;
}

export default function AddTreatmentDialog({ onTreatmentAdded }: AddTreatmentDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [treatmentType, setTreatmentType] = useState<'insulin' | 'pills'>('insulin');
  const [insulinType, setInsulinType] = useState<'basal' | 'rapid'>('rapid');
  const [medicationName, setMedicationName] = useState('');
  const [dose, setDose] = useState('');
  const [doseUnit, setDoseUnit] = useState('units');
  const [timestamp, setTimestamp] = useState(getCurrentLocalDateTime());
  const [notes, setNotes] = useState('');

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    // Reset timestamp to current local time when dialog opens
    if (isOpen) {
      setTimestamp(getCurrentLocalDateTime());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !dose) return;

    const doseNum = parseFloat(dose);
    if (isNaN(doseNum) || doseNum <= 0) {
      toast.error('Please enter a valid dose');
      return;
    }

    if (treatmentType === 'pills' && !medicationName) {
      toast.error('Please enter medication name');
      return;
    }

    setLoading(true);
    try {
      await treatmentAPI.create({
        user_id: user.id,
        treatment_type: treatmentType,
        insulin_type: treatmentType === 'insulin' ? insulinType : undefined,
        medication_name: treatmentType === 'pills' ? medicationName : undefined,
        dose: doseNum,
        dose_unit: treatmentType === 'insulin' ? 'units' : doseUnit,
        timestamp: localDateTimeToISO(timestamp),
        notes: notes || undefined,
      });

      toast.success('Treatment added successfully!');
      setOpen(false);
      setDose('');
      setNotes('');
      setMedicationName('');
      setTimestamp(getCurrentLocalDateTime());
      setTreatmentType('insulin');
      setInsulinType('rapid');
      setDoseUnit('units');
      
      if (onTreatmentAdded) {
        onTreatmentAdded();
      }
    } catch (error) {
      console.error('Error adding treatment:', error);
      toast.error('Error adding treatment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Treatment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Treatment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="treatment-type">Treatment Type</Label>
            <Select value={treatmentType} onValueChange={(value: 'insulin' | 'pills') => setTreatmentType(value)}>
              <SelectTrigger id="treatment-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="insulin">Insulin</SelectItem>
                <SelectItem value="pills">Pills</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {treatmentType === 'insulin' && (
            <div className="space-y-2">
              <Label htmlFor="insulin-type">Insulin Type</Label>
              <Select value={insulinType} onValueChange={(value: 'basal' | 'rapid') => setInsulinType(value)}>
                <SelectTrigger id="insulin-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basal">Basal</SelectItem>
                  <SelectItem value="rapid">Rapid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {treatmentType === 'pills' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="medication-name">Medication Name</Label>
                <Input
                  id="medication-name"
                  type="text"
                  placeholder="e.g. Metformin"
                  value={medicationName}
                  onChange={(e) => setMedicationName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dose-unit">Dose Unit</Label>
                <Select value={doseUnit} onValueChange={setDoseUnit}>
                  <SelectTrigger id="dose-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mg">mg</SelectItem>
                    <SelectItem value="mcg">mcg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="tablets">tablets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="dose">
              Dose {treatmentType === 'insulin' ? '(units)' : `(${doseUnit})`}
            </Label>
            <Input
              id="dose"
              type="number"
              step={treatmentType === 'insulin' ? '0.5' : '1'}
              min="0"
              placeholder={treatmentType === 'insulin' ? 'e.g. 10' : 'e.g. 500'}
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timestamp">Date and Time</Label>
            <Input
              id="timestamp"
              type="datetime-local"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about treatment administration..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}