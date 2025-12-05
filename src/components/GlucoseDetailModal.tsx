import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GlucoseReading } from '@/lib/supabase';
import { Activity, Calendar, Clock, FileText, TrendingDown, TrendingUp, Trash2 } from 'lucide-react';

interface GlucoseDetailModalProps {
  reading: GlucoseReading | null;
  open: boolean;
  onClose: () => void;
  onDelete?: () => void;
}

export default function GlucoseDetailModal({ reading, open, onClose, onDelete }: GlucoseDetailModalProps) {
  if (!reading) return null;

  const getGlucoseStatus = (value: number) => {
    if (value < 70) return { 
      text: 'Low', 
      color: 'text-red-500',
      bgColor: 'bg-red-950',
      icon: TrendingDown,
      description: 'Below normal range. Consider consuming fast-acting carbohydrates.'
    };
    if (value > 180) return { 
      text: 'High', 
      color: 'text-orange-500',
      bgColor: 'bg-orange-950',
      icon: TrendingUp,
      description: 'Above normal range. Monitor closely and consult your healthcare provider if persistent.'
    };
    return { 
      text: 'Normal', 
      color: 'text-green-500',
      bgColor: 'bg-green-950',
      icon: Activity,
      description: 'Within healthy range. Keep up the good work!'
    };
  };

  // Use the correct property name from GlucoseReading interface
  const glucoseValue = reading.value || 0;
  const status = getGlucoseStatus(glucoseValue);
  const StatusIcon = status.icon;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Use date field from the interface
  const displayDate = reading.date;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-6 h-6 text-green-500" />
              Glucose Reading Details
            </div>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  onClose();
                  onDelete();
                }}
                className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Main Reading Display */}
          <div className="text-center p-6 bg-slate-950 rounded-lg border border-slate-800">
            <div className="flex items-center justify-center gap-2 mb-2">
              <StatusIcon className={`w-8 h-8 ${status.color}`} />
            </div>
            <div className={`text-6xl font-bold ${status.color} mb-2`}>
              {glucoseValue}
            </div>
            <div className="text-slate-400 text-lg mb-3">mg/dL</div>
            <div className={`inline-block px-4 py-2 rounded-full ${status.bgColor} ${status.color} font-medium`}>
              {status.text}
            </div>
          </div>

          {/* Status Description */}
          <div className={`p-4 rounded-lg border ${status.bgColor} ${status.color.replace('text-', 'border-')}`}>
            <p className="text-sm leading-relaxed">{status.description}</p>
          </div>

          {/* Date and Time Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400 uppercase">Date</span>
              </div>
              <p className="text-sm font-medium">{formatDate(displayDate)}</p>
            </div>
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400 uppercase">Time</span>
              </div>
              <p className="text-sm font-medium">{formatTime(displayDate)}</p>
            </div>
          </div>

          {/* Notes Section */}
          {reading.notes && (
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-400 uppercase font-medium">Notes</span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">{reading.notes}</p>
            </div>
          )}

          {/* Reference Ranges */}
          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
            <h4 className="text-sm font-medium mb-3 text-slate-300">Reference Ranges</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Low (Hypoglycemia)</span>
                <span className="text-red-400 font-medium">&lt; 70 mg/dL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Normal Range</span>
                <span className="text-green-400 font-medium">70 - 180 mg/dL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">High (Hyperglycemia)</span>
                <span className="text-orange-400 font-medium">&gt; 180 mg/dL</span>
              </div>
            </div>
          </div>

          {/* Medical Disclaimer */}
          <div className="text-xs text-slate-500 text-center p-3 bg-slate-950 rounded border border-slate-800">
            <p>This information is for tracking purposes only and does not constitute medical advice. Always consult your healthcare provider for medical decisions.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}