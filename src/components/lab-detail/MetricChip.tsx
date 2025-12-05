import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

export type MetricStatus = 'normal' | 'high' | 'low' | 'critical';

interface MetricChipProps {
  name: string;
  value: string;
  unit?: string;
  refRange?: string;
  status: MetricStatus;
}

const statusConfig = {
  normal: {
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    label: 'Normal',
    icon: CheckCircle,
  },
  high: {
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    label: 'High',
    icon: AlertTriangle,
  },
  low: {
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    label: 'Low',
    icon: AlertTriangle,
  },
  critical: {
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-400',
    label: 'Critical',
    icon: AlertCircle,
  },
};

export default function MetricChip({ name, value, unit, refRange, status }: MetricChipProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const isAbnormal = status !== 'normal';

  return (
    <div
      className={`
        relative p-4 rounded-lg border transition-all
        ${config.bgColor} ${config.borderColor}
        ${isAbnormal ? 'ring-1 ring-offset-0 ring-offset-slate-900' : ''}
        ${isAbnormal ? config.borderColor.replace('border-', 'ring-') : ''}
        hover:shadow-lg hover:scale-[1.02]
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className={`text-sm font-semibold ${isAbnormal ? 'text-slate-100' : 'text-slate-300'}`}>
          {name}
        </h4>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
          <Icon className="w-3 h-3" />
          <span>{config.label}</span>
        </div>
      </div>
      
      <div className="space-y-1">
        <p className={`text-2xl font-bold ${isAbnormal ? 'text-white' : 'text-slate-200'}`}>
          {value}
          {unit && <span className="text-base font-normal text-slate-400 ml-1">{unit}</span>}
        </p>
        
        {refRange && (
          <p className="text-xs text-slate-500">
            Reference: {refRange}
          </p>
        )}
      </div>
    </div>
  );
}