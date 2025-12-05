import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { MetricStatus } from './MetricChip';

interface RecommendationRowProps {
  metricName: string;
  value: string;
  status: MetricStatus;
  message: string;
}

const statusConfig = {
  normal: {
    icon: CheckCircle,
    iconColor: 'text-emerald-500',
    bgColor: 'bg-emerald-500/5',
  },
  high: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-500/5',
  },
  low: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-500/5',
  },
  critical: {
    icon: AlertCircle,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-500/5',
  },
};

export default function RecommendationRow({ metricName, value, status, message }: RecommendationRowProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg ${config.bgColor} border border-slate-800/50 hover:border-slate-700/50 transition-colors`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 mt-0.5 ${config.iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div className="flex-1 space-y-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-slate-100">{metricName}</h4>
            <span className="text-sm font-semibold text-slate-300">{value}</span>
          </div>
          
          <p className="text-sm text-slate-400 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}