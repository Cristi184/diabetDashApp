import { useState, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Info, X } from 'lucide-react';
import { type LabResult } from '@/lib/supabase';
import MetricChip, { MetricStatus } from './lab-detail/MetricChip';
import RecommendationRow from './lab-detail/RecommendationRow';
import LabImagesGallery from './lab-detail/LabImagesGallery';

interface LabDetailModalProps {
  lab: LabResult;
  open: boolean;
  onClose: () => void;
}

interface ParsedMetric {
  name: string;
  value: string;
  unit?: string;
  refRange?: string;
  status: MetricStatus;
  message: string;
}

export default function LabDetailModal({ lab, open, onClose }: LabDetailModalProps) {
  // Get all image URLs
  const imageUrls = lab.photo_urls && lab.photo_urls.length > 0 
    ? lab.photo_urls 
    : lab.photo_url 
    ? [lab.photo_url] 
    : [];

  // Check if this is an AI-generated result
  const isAIGenerated = lab.notes && lab.notes.length > 0;

  // Display title: if AI-generated, show only date; otherwise show test name
  const displayTitle = isAIGenerated 
    ? new Date(lab.date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : lab.test_name;

  // Detect test type from test name or notes
  const testType = useMemo(() => {
    const name = lab.test_name.toLowerCase();
    const notes = (lab.notes || '').toLowerCase();
    
    if (name.includes('urine') || notes.includes('urine')) return 'Urine Test';
    if (name.includes('blood') || notes.includes('blood') || notes.includes('hemoglobin')) return 'Blood Test';
    if (name.includes('glucose') || notes.includes('glucose')) return 'Blood Test';
    if (name.includes('hba1c') || notes.includes('hba1c')) return 'Blood Test';
    
    return 'Lab Test';
  }, [lab.test_name, lab.notes]);

  // Parse metrics from notes
  const parsedMetrics = useMemo(() => {
    if (!lab.notes) return [];

    const metrics: ParsedMetric[] = [];
    const lines = lab.notes.split('\n').filter(line => line.trim());

    for (const line of lines) {
      // Skip headers or non-metric lines
      if (line.includes('Health Recommendations') || line.includes('⚠️') || line.length < 10) continue;

      // Try to parse metric information
      // Format: "Metric Name: value unit (status) - explanation"
      const metricMatch = line.match(/^[•\-*]?\s*(.+?):\s*(.+?)(?:\s*\((.+?)\))?\s*[-–—]\s*(.+)$/);
      
      if (metricMatch) {
        const [, name, valueStr, statusStr, message] = metricMatch;
        
        // Extract value and unit
        const valueParts = valueStr.trim().split(/\s+/);
        const value = valueParts[0];
        const unit = valueParts.slice(1).join(' ');

        // Determine status
        let status: MetricStatus = 'normal';
        const lowerMessage = message.toLowerCase();
        const lowerStatus = (statusStr || '').toLowerCase();
        
        if (lowerMessage.includes('critical') || lowerMessage.includes('severely') || lowerStatus.includes('critical')) {
          status = 'critical';
        } else if (lowerMessage.includes('higher than normal') || lowerMessage.includes('elevated') || lowerStatus.includes('high')) {
          status = 'high';
        } else if (lowerMessage.includes('lower than normal') || lowerMessage.includes('decreased') || lowerStatus.includes('low')) {
          status = 'low';
        } else if (lowerMessage.includes('within normal') || lowerStatus.includes('normal')) {
          status = 'normal';
        }

        // Extract reference range if present
        const refMatch = message.match(/(?:reference|normal|ref)(?:\s+range)?:\s*([0-9.]+\s*[-–—]\s*[0-9.]+(?:\s*\w+)?)/i);
        const refRange = refMatch ? refMatch[1] : undefined;

        metrics.push({
          name: name.trim(),
          value: value,
          unit: unit || undefined,
          refRange,
          status,
          message: message.trim(),
        });
      }
    }

    return metrics;
  }, [lab.notes]);

  // Check if there are any abnormal values
  const hasAbnormalValues = parsedMetrics.some(m => m.status !== 'normal');

  // Determine if we should use single or two-column layout
  const hasParsedMetrics = parsedMetrics.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-7xl max-h-[95vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-100">
                  {displayTitle}
                </h2>
                <Badge className="bg-teal-500/10 text-teal-400 border-teal-500/30 hover:bg-teal-500/20">
                  {testType}
                </Badge>
              </div>
              {!isAIGenerated && (
                <p className="text-sm text-slate-400">
                  {new Date(lab.date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Conditional layout: two-column if we have parsed metrics, single-column otherwise */}
          <div className={hasParsedMetrics ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "space-y-6"}>
            {/* Test Summary Card */}
            {hasParsedMetrics && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-100">Test Summary</h3>
                  {hasAbnormalValues && (
                    <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                      Abnormal values detected
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {parsedMetrics.map((metric, index) => (
                    <MetricChip
                      key={index}
                      name={metric.name}
                      value={metric.value}
                      unit={metric.unit}
                      refRange={metric.refRange}
                      status={metric.status}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Health Recommendations Card */}
            {lab.notes && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-slate-100">Health Recommendations</h3>
                
                {/* Disclaimer */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-900/50 border border-slate-800">
                  <Info className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    These are informational explanations only and do not replace a doctor's consultation. 
                    Always consult with your healthcare provider for medical advice.
                  </p>
                </div>

                {/* Recommendations List */}
                <div className="space-y-3">
                  {hasParsedMetrics ? (
                    parsedMetrics.map((metric, index) => (
                      <RecommendationRow
                        key={index}
                        metricName={metric.name}
                        value={`${metric.value}${metric.unit ? ' ' + metric.unit : ''}`}
                        status={metric.status}
                        message={metric.message}
                      />
                    ))
                  ) : (
                    <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800">
                      <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                        {lab.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Lab Report Images */}
          {imageUrls.length > 0 && (
            <LabImagesGallery images={imageUrls} testName={displayTitle} />
          )}

          {/* Manual entry fallback */}
          {!isAIGenerated && (
            <div className="p-6 rounded-lg bg-slate-900/30 border border-slate-800">
              <h4 className="text-sm font-medium text-slate-400 mb-2">Test Result</h4>
              <p className="text-3xl font-bold text-teal-400">{lab.value}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur-sm border-t border-slate-800 p-6">
          <div className="flex justify-end">
            <Button
              onClick={onClose}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}