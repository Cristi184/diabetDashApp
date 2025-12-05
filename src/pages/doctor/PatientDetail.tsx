import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Activity, Utensils, FlaskConical, Syringe, MessageSquare, Loader2, Eye, Pill } from 'lucide-react';
import { glucoseAPI, mealsAPI, labsAPI, treatmentAPI, getUserProfile, type GlucoseReading, type Meal, type LabResult, type TreatmentLog, type UserProfile } from '@/lib/supabase';
import DoctorLayout from '@/components/doctor/DoctorLayout';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Scatter, ZAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import LabDetailModal from '@/components/LabDetailModal';

type DateRange = '1day' | '1week' | '1month' | '2months' | '3months';

interface ChartDataPoint {
  dateTime: string;
  timestamp: number;
  glucose: number | null;
  fullDateTime: string;
  type: 'glucose' | 'meal' | 'treatment';
  // Meal properties
  mealName?: string;
  mealCarbs?: number;
  mealProtein?: number;
  mealFat?: number;
  mealCalories?: number;
  // Treatment properties
  treatmentType?: string;
  treatmentDose?: number;
  time?: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: ChartDataPoint;
  }>;
}

export default function PatientDetail() {
  const { patientId } = useParams<{ patientId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<UserProfile | null>(null);
  const [glucoseReadings, setGlucoseReadings] = useState<GlucoseReading[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [treatmentLogs, setTreatmentLogs] = useState<TreatmentLog[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>('1day');
  const [selectedLab, setSelectedLab] = useState<LabResult | null>(null);

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  const loadPatientData = async () => {
    if (!patientId) return;
    
    setLoading(true);
    try {
      // Load patient info using the edge function
      const patientProfile = await getUserProfile(patientId);
      console.log('Loaded patient profile:', patientProfile);
      setPatient(patientProfile);

      // Load health data
      const [glucoseData, mealsData, labsData, treatmentData] = await Promise.all([
        glucoseAPI.getAll(patientId),
        mealsAPI.getAll(patientId),
        labsAPI.getAll(patientId),
        treatmentAPI.getAll(patientId),
      ]);

      setGlucoseReadings(glucoseData);
      setMeals(mealsData);
      setLabs(labsData);
      setTreatmentLogs(treatmentData);
    } catch (error) {
      console.error('Error loading patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeDays = (range: DateRange): number => {
    switch (range) {
      case '1day': return 1;
      case '1week': return 7;
      case '1month': return 30;
      case '2months': return 60;
      case '3months': return 90;
      default: return 7;
    }
  };

  const filterByDateRange = <T extends { date?: string; timestamp?: string }>(data: T[]): T[] => {
    const days = getDateRangeDays(dateRange);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return data.filter(item => {
      const itemDate = new Date(item.date || item.timestamp || '');
      return itemDate >= cutoffDate;
    });
  };

  const filteredGlucoseReadings = filterByDateRange(glucoseReadings);
  const filteredMeals = filterByDateRange(meals);
  const filteredTreatmentLogs = filterByDateRange(treatmentLogs);
  const filteredLabs = filterByDateRange(labs);

  const getTimeWindow = () => {
    const now = new Date();
    let startTime: Date;
    let endTime: Date;
    const days = getDateRangeDays(dateRange);
    
    startTime = new Date(now);
    startTime.setDate(now.getDate() - days);
    startTime.setHours(0, 0, 0, 0);
    endTime = new Date(now);
    endTime.setHours(23, 59, 59, 999);
    
    return { startTime, endTime };
  };

  const formatDateTime = (date: Date): string => {
    if (dateRange === '1day') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } else if (dateRange === '1week') {
      return date.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + 
             date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Chart data - same as patient dashboard with treatments
  const getChartData = (): ChartDataPoint[] => {
    const allPoints: ChartDataPoint[] = [];
    
    // Add glucose readings
    filteredGlucoseReadings.forEach(reading => {
      const readingDate = new Date(reading.date);
      const timestamp = readingDate.getTime();
      
      allPoints.push({
        dateTime: formatDateTime(readingDate),
        timestamp,
        glucose: reading.value,
        fullDateTime: readingDate.toLocaleString('en-US', { hour12: false }),
        type: 'glucose',
        time: readingDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      });
    });
    
    // Add meals with interpolated glucose
    filteredMeals.forEach(meal => {
      const mealDate = new Date(meal.date);
      const mealTimestamp = mealDate.getTime();
      
      // Find the closest glucose reading to interpolate the Y position
      let glucoseValue: number | null = null;
      
      const beforeReading = filteredGlucoseReadings
        .filter(r => new Date(r.date).getTime() <= mealTimestamp)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      const afterReading = filteredGlucoseReadings
        .filter(r => new Date(r.date).getTime() >= mealTimestamp)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
      
      if (beforeReading && afterReading) {
        const beforeTime = new Date(beforeReading.date).getTime();
        const afterTime = new Date(afterReading.date).getTime();
        const ratio = (mealTimestamp - beforeTime) / (afterTime - beforeTime);
        glucoseValue = beforeReading.value + (afterReading.value - beforeReading.value) * ratio;
      } else if (beforeReading) {
        glucoseValue = beforeReading.value;
      } else if (afterReading) {
        glucoseValue = afterReading.value;
      }
      
      allPoints.push({
        dateTime: formatDateTime(mealDate),
        timestamp: mealTimestamp,
        glucose: glucoseValue,
        fullDateTime: mealDate.toLocaleString('en-US', { hour12: false }),
        type: 'meal',
        mealName: meal.name,
        mealCarbs: meal.carbs,
        mealProtein: meal.protein,
        mealFat: meal.fat,
        mealCalories: meal.calories,
        time: mealDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      });
    });
    
    // Add treatments with interpolated glucose
    filteredTreatmentLogs.forEach(treatment => {
      const treatmentDate = new Date(treatment.timestamp);
      const treatmentTimestamp = treatmentDate.getTime();
      
      let glucoseValue: number | null = null;
      
      const beforeReading = filteredGlucoseReadings
        .filter(r => new Date(r.date).getTime() <= treatmentTimestamp)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      const afterReading = filteredGlucoseReadings
        .filter(r => new Date(r.date).getTime() >= treatmentTimestamp)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
      
      if (beforeReading && afterReading) {
        const beforeTime = new Date(beforeReading.date).getTime();
        const afterTime = new Date(afterReading.date).getTime();
        const ratio = (treatmentTimestamp - beforeTime) / (afterTime - beforeTime);
        glucoseValue = beforeReading.value + (afterReading.value - beforeReading.value) * ratio;
      } else if (beforeReading) {
        glucoseValue = beforeReading.value;
      } else if (afterReading) {
        glucoseValue = afterReading.value;
      }
      
      allPoints.push({
        dateTime: formatDateTime(treatmentDate),
        timestamp: treatmentTimestamp,
        glucose: glucoseValue,
        fullDateTime: treatmentDate.toLocaleString('en-US', { hour12: false }),
        type: 'treatment',
        treatmentType: treatment.treatment_type === 'insulin' 
          ? (treatment.insulin_type === 'basal' ? 'Basal Insulin' : 'Rapid Insulin')
          : treatment.medication_name || 'Pills',
        treatmentDose: treatment.dose,
        time: treatmentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      });
    });
    
    return allPoints.sort((a, b) => a.timestamp - b.timestamp);
  };

  const avgGlucose = filteredGlucoseReadings.length > 0
    ? Math.round(filteredGlucoseReadings.reduce((sum, r) => sum + r.value, 0) / filteredGlucoseReadings.length)
    : 0;

  const latestGlucose = glucoseReadings[0];

  const getDateRangeLabel = (range: DateRange): string => {
    switch (range) {
      case '1day': return 'Last 24 Hours';
      case '1week': return 'Last 7 Days';
      case '1month': return 'Last 30 Days';
      case '2months': return 'Last 2 Months';
      case '3months': return 'Last 3 Months';
      default: return 'Last 7 Days';
    }
  };

  const chartData = getChartData();
  const glucoseData = chartData.filter(d => d.type === 'glucose');
  const mealData = chartData.filter(d => d.type === 'meal');
  const treatmentData = chartData.filter(d => d.type === 'treatment');

  const chartConfig = {
    glucose: {
      label: 'Glicemia',
      color: 'hsl(142, 76%, 36%)',
    },
  };

  // Custom tooltip - same as patient dashboard
  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    if (!data) return null;

    // Treatment tooltip
    if (data.type === 'treatment') {
      return (
        <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-lg min-w-[200px]">
          <p className="text-white font-medium flex items-center gap-2">
            <Pill className="w-4 h-4 text-violet-500" />
            Treatment
          </p>
          <p className="text-sm text-slate-300 mt-2 font-semibold">{data.treatmentType}</p>
          
          {data.glucose !== null && data.glucose > 0 && (
            <div className="mt-2 mb-2 p-2 bg-green-950/30 rounded border border-green-900/30">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Glucose:</span>
                <span className="text-sm text-green-400 font-bold">{Math.round(data.glucose)} mg/dL</span>
              </div>
            </div>
          )}
          
          <div className="mt-2 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Dose:</span>
              <span className="text-sm text-violet-400 font-medium">{data.treatmentDose} units</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-600">{data.time}</p>
        </div>
      );
    }

    // Meal tooltip
    if (data.type === 'meal') {
      return (
        <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-lg min-w-[220px]">
          <p className="text-white font-medium flex items-center gap-2">
            <Utensils className="w-4 h-4 text-orange-500" />
            Meal
          </p>
          <p className="text-sm text-slate-300 mt-2 font-semibold">{data.mealName}</p>
          
          {data.glucose !== null && data.glucose > 0 && (
            <div className="mt-2 mb-2 p-2 bg-green-950/30 rounded border border-green-900/30">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Glucose:</span>
                <span className="text-sm text-green-400 font-bold">{Math.round(data.glucose)} mg/dL</span>
              </div>
            </div>
          )}
          
          <div className="mt-2 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Carbs:</span>
              <span className="text-sm text-green-400 font-medium">{data.mealCarbs}g</span>
            </div>
            {data.mealProtein !== null && data.mealProtein !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Protein:</span>
                <span className="text-sm text-blue-400 font-medium">{data.mealProtein}g</span>
              </div>
            )}
            {data.mealFat !== null && data.mealFat !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Fat:</span>
                <span className="text-sm text-yellow-400 font-medium">{data.mealFat}g</span>
              </div>
            )}
            {data.mealCalories !== null && data.mealCalories !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Calories:</span>
                <span className="text-sm text-orange-400 font-medium">{data.mealCalories}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-600">{data.time}</p>
        </div>
      );
    }

    // Glucose tooltip
    if (data.type === 'glucose') {
      return (
        <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-lg min-w-[200px]">
          <p className="text-white font-medium">Glicemia</p>
          <p className="text-sm text-green-400 font-medium mt-1">{data.glucose} mg/dL</p>
          <p className="text-xs text-slate-400 mt-1">{data.fullDateTime}</p>
          <div className="border-t border-slate-600 mt-2 pt-2 text-xs text-slate-400">
            <p>Low threshold: &lt;70 mg/dL</p>
            <p>High threshold: &gt;180 mg/dL</p>
          </div>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <DoctorLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </DoctorLayout>
    );
  }

  if (!patient) {
    return (
      <DoctorLayout>
        <div className="p-8">
          <p className="text-white">Patient not found</p>
        </div>
      </DoctorLayout>
    );
  }

  return (
    <DoctorLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/app/doctor/patients')}
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4 flex-1">
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white font-medium text-2xl">
                {patient.full_name?.[0] || 'P'}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {patient.full_name || 'Patient'}
              </h1>
              <p className="text-slate-400">{patient.email}</p>
            </div>
          </div>
          <Button
            onClick={() => navigate(`/app/doctor/messages?patient=${patientId}`)}
            className="bg-green-600 hover:bg-green-700"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Message Patient
          </Button>
        </div>

        {/* Date Range Filter */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400 mr-2">Time Range:</span>
              <Button
                onClick={() => setDateRange('1day')}
                variant={dateRange === '1day' ? 'default' : 'outline'}
                size="sm"
                className={dateRange === '1day' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-700 hover:bg-slate-800'}
              >
                1 Day
              </Button>
              <Button
                onClick={() => setDateRange('1week')}
                variant={dateRange === '1week' ? 'default' : 'outline'}
                size="sm"
                className={dateRange === '1week' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-700 hover:bg-slate-800'}
              >
                1 Week
              </Button>
              <Button
                onClick={() => setDateRange('1month')}
                variant={dateRange === '1month' ? 'default' : 'outline'}
                size="sm"
                className={dateRange === '1month' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-700 hover:bg-slate-800'}
              >
                1 Month
              </Button>
              <Button
                onClick={() => setDateRange('2months')}
                variant={dateRange === '2months' ? 'default' : 'outline'}
                size="sm"
                className={dateRange === '2months' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-700 hover:bg-slate-800'}
              >
                2 Months
              </Button>
              <Button
                onClick={() => setDateRange('3months')}
                variant={dateRange === '3months' ? 'default' : 'outline'}
                size="sm"
                className={dateRange === '3months' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-700 hover:bg-slate-800'}
              >
                3 Months
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Latest Glucose</CardTitle>
            </CardHeader>
            <CardContent>
              {latestGlucose ? (
                <>
                  <div className="text-2xl font-bold text-white">{latestGlucose.value} mg/dL</div>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(latestGlucose.date).toLocaleString()}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500">No data</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Average Glucose</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{avgGlucose} mg/dL</div>
              <p className="text-xs text-slate-500 mt-1">{getDateRangeLabel(dateRange)}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Glucose Readings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{filteredGlucoseReadings.length}</div>
              <p className="text-xs text-slate-500 mt-1">{getDateRangeLabel(dateRange)}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Meals Logged</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{filteredMeals.length}</div>
              <p className="text-xs text-slate-500 mt-1">{getDateRangeLabel(dateRange)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Glucose Trend Chart with Meals and Treatments */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Glucose Trends & Meals</CardTitle>
            <p className="text-xs text-slate-400 mt-1">{getDateRangeLabel(dateRange)}</p>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={chartData} margin={{ top: 5, right: 50, bottom: 60, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis 
                      dataKey="timestamp"
                      type="number"
                      domain={(() => {
                        const { startTime, endTime } = getTimeWindow();
                        return [startTime.getTime(), endTime.getTime()];
                      })()}
                      scale="time"
                      tickFormatter={(timestamp) => {
                        const date = new Date(timestamp);
                        if (dateRange === '1day') {
                          return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                        } else if (dateRange === '1week') {
                          return date.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + 
                                 date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                        } else {
                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }
                      }}
                      stroke="#94a3b8"
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      padding={{ right: 20 }}
                    />
                    <YAxis 
                      stroke="#94a3b8"
                      fontSize={12}
                      domain={[0, 300]}
                      ticks={[0, 50, 70, 100, 150, 180, 200, 250, 300]}
                      label={{ 
                        value: 'Glicemia (mg/dL)', 
                        angle: -90, 
                        position: 'insideLeft', 
                        style: { fill: '#94a3b8', fontSize: 13, fontWeight: 500 } 
                      }}
                    />
                    <ZAxis range={[100, 100]} />
                    <Tooltip 
                      content={<CustomTooltip />}
                      cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }}
                      wrapperStyle={{ zIndex: 1000 }}
                    />
                    <ReferenceLine 
                      y={70} 
                      stroke="#ef4444" 
                      strokeDasharray="5 5" 
                      label={{ value: 'Low (<70)', position: 'insideBottomLeft', fill: '#ef4444', fontSize: 10 }} 
                    />
                    <ReferenceLine 
                      y={180} 
                      stroke="#f97316" 
                      strokeDasharray="5 5" 
                      label={{ value: 'High (>180)', position: 'insideTopLeft', fill: '#f97316', fontSize: 10 }} 
                    />
                    {glucoseData.length > 0 && (
                      <Line 
                        data={glucoseData}
                        type="monotone" 
                        dataKey="glucose" 
                        stroke="#22c55e"
                        strokeWidth={3}
                        zIndex={1}
                        dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          if (!cx || !cy || !payload) return null;
                          return (
                            <g style={{ pointerEvents: 'all', zIndex: 1 }}>
                              <circle cx={cx} cy={cy} r={8} fill="transparent" style={{ cursor: 'pointer' }} />
                              <circle cx={cx} cy={cy} r={4} fill="#22c55e" stroke="#fff" strokeWidth={2} />
                            </g>
                          );
                        }}
                        activeDot={(props: any) => {
                          const { cx, cy } = props;
                          return <circle cx={cx} cy={cy} r={7} fill="#22c55e" stroke="#fff" strokeWidth={3} />;
                        }}
                        connectNulls
                        isAnimationActive={false}
                      />
                    )}
                    {mealData.length > 0 && (
                      <Scatter 
                        data={mealData}
                        dataKey="glucose"
                        fill="#f97316"
                        zIndex={10}
                        shape={(props: any) => {
                          const { cx, cy, payload } = props;
                          if (!cx || !cy) return null;
                          return (
                            <g style={{ pointerEvents: 'all', zIndex: 10 }}>
                              <circle cx={cx} cy={cy} r={20} fill="transparent" style={{ cursor: 'pointer' }} />
                              <circle cx={cx} cy={cy} r={11} fill="#f97316" opacity={0.25} />
                              <circle cx={cx} cy={cy} r={8} fill="#f97316" stroke="#fff" strokeWidth={2.5} />
                              <text 
                                x={cx} 
                                y={cy - 16} 
                                textAnchor="middle" 
                                fill="#f97316" 
                                fontSize="11" 
                                fontWeight="bold"
                                style={{ pointerEvents: 'none' }}
                              >
                                🍽️
                              </text>
                            </g>
                          );
                        }}
                        activeShape={(props: any) => {
                          const { cx, cy, payload } = props;
                          if (!cx || !cy) return null;
                          return (
                            <g style={{ zIndex: 20 }}>
                              <circle cx={cx} cy={cy} r={16} fill="#f97316" opacity={0.4} />
                              <circle cx={cx} cy={cy} r={11} fill="#f97316" stroke="#fff" strokeWidth={3} />
                              <text 
                                x={cx} 
                                y={cy - 20} 
                                textAnchor="middle" 
                                fill="#f97316" 
                                fontSize="14" 
                                fontWeight="bold"
                              >
                                🍽️
                              </text>
                            </g>
                          );
                        }}
                      />
                    )}
                    {treatmentData.length > 0 && (
                      <Scatter 
                        data={treatmentData}
                        dataKey="glucose"
                        fill="#8b5cf6"
                        zIndex={10}
                        shape={(props: any) => {
                          const { cx, cy, payload } = props;
                          if (!cx || !cy) return null;
                          return (
                            <g style={{ pointerEvents: 'all', zIndex: 10 }}>
                              <circle cx={cx} cy={cy} r={20} fill="transparent" style={{ cursor: 'pointer' }} />
                              <circle cx={cx} cy={cy} r={11} fill="#8b5cf6" opacity={0.25} />
                              <circle cx={cx} cy={cy} r={8} fill="#8b5cf6" stroke="#fff" strokeWidth={2.5} />
                              <text 
                                x={cx} 
                                y={cy - 16} 
                                textAnchor="middle" 
                                fill="#8b5cf6" 
                                fontSize="11" 
                                fontWeight="bold"
                                style={{ pointerEvents: 'none' }}
                              >
                                💉
                              </text>
                            </g>
                          );
                        }}
                        activeShape={(props: any) => {
                          const { cx, cy, payload } = props;
                          if (!cx || !cy) return null;
                          return (
                            <g style={{ zIndex: 20 }}>
                              <circle cx={cx} cy={cy} r={16} fill="#8b5cf6" opacity={0.4} />
                              <circle cx={cx} cy={cy} r={11} fill="#8b5cf6" stroke="#fff" strokeWidth={3} />
                              <text 
                                x={cx} 
                                y={cy - 20} 
                                textAnchor="middle" 
                                fill="#8b5cf6" 
                                fontSize="14" 
                                fontWeight="bold"
                              >
                                💉
                              </text>
                            </g>
                          );
                        }}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-6 mt-4 text-xs flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-green-500"></div>
                    <span className="text-slate-400">Glucose Line</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white"></div>
                    <span className="text-slate-400">🍽️ Meal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-violet-500 border-2 border-white"></div>
                    <span className="text-slate-400">💉 Treatment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-red-500"></div>
                    <span className="text-slate-400">Low (&lt;70)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-orange-500"></div>
                    <span className="text-slate-400">High (&gt;180)</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400 text-sm font-medium">No glucose data for {getDateRangeLabel(dateRange).toLowerCase()}</p>
                <p className="text-slate-500 text-xs mt-1">Patient hasn't logged any readings yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Data Tabs */}
        <Tabs defaultValue="glucose" className="space-y-4">
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="glucose" className="data-[state=active]:bg-slate-800">
              <Activity className="w-4 h-4 mr-2" />
              Glucose
            </TabsTrigger>
            <TabsTrigger value="meals" className="data-[state=active]:bg-slate-800">
              <Utensils className="w-4 h-4 mr-2" />
              Meals
            </TabsTrigger>
            <TabsTrigger value="treatment" className="data-[state=active]:bg-slate-800">
              <Syringe className="w-4 h-4 mr-2" />
              Treatment
            </TabsTrigger>
            <TabsTrigger value="labs" className="data-[state=active]:bg-slate-800">
              <FlaskConical className="w-4 h-4 mr-2" />
              Labs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="glucose">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Glucose Readings ({getDateRangeLabel(dateRange)})</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredGlucoseReadings.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredGlucoseReadings.map((reading) => (
                      <div key={reading.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                        <div>
                          <p className="font-medium text-white">{reading.value} mg/dL</p>
                          <p className="text-xs text-slate-400">{new Date(reading.date).toLocaleString()}</p>
                          {reading.notes && <p className="text-xs text-slate-500 mt-1">{reading.notes}</p>}
                        </div>
                        <Badge className={
                          reading.value < 70 ? 'bg-red-500/20 text-red-400' :
                          reading.value > 180 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-green-500/20 text-green-400'
                        }>
                          {reading.value < 70 ? 'Low' : reading.value > 180 ? 'High' : 'Normal'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-400 py-8">No glucose readings for {getDateRangeLabel(dateRange).toLowerCase()}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="meals">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Meal Logs ({getDateRangeLabel(dateRange)})</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredMeals.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredMeals.map((meal) => (
                      <div key={meal.id} className="p-3 bg-slate-800 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-white">{meal.name}</p>
                          <p className="text-sm text-orange-400 font-medium">{meal.carbs}g carbs</p>
                        </div>
                        <p className="text-xs text-slate-400">{new Date(meal.date).toLocaleString()}</p>
                        {meal.description && <p className="text-xs text-slate-500 mt-1">{meal.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-400 py-8">No meal logs for {getDateRangeLabel(dateRange).toLowerCase()}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="treatment">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Treatment Logs ({getDateRangeLabel(dateRange)})</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredTreatmentLogs.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredTreatmentLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                        <div>
                          <p className="font-medium text-white capitalize">{log.treatment_type}</p>
                          <p className="text-sm text-purple-400">{log.dose} {log.dose_unit || 'units'}</p>
                          <p className="text-xs text-slate-400 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                          {log.notes && <p className="text-xs text-slate-500 mt-1">{log.notes}</p>}
                        </div>
                        <Badge className="bg-purple-500/20 text-purple-400">
                          {log.treatment_type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-400 py-8">No treatment logs for {getDateRangeLabel(dateRange).toLowerCase()}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="labs">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Lab Results ({getDateRangeLabel(dateRange)})</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredLabs.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredLabs.map((lab) => (
                      <div 
                        key={lab.id} 
                        className="p-3 bg-slate-800 rounded-lg hover:bg-slate-750 transition-colors cursor-pointer group"
                        onClick={() => setSelectedLab(lab)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-white group-hover:text-purple-400 transition-colors">{lab.test_name}</p>
                            <p className="text-sm text-slate-400 mt-1">{lab.value}</p>
                            <p className="text-xs text-slate-500 mt-1">{new Date(lab.date).toLocaleDateString()}</p>
                            {lab.notes && (
                              <p className="text-xs text-slate-500 mt-2 line-clamp-2">{lab.notes}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-purple-400 hover:text-purple-300 hover:bg-purple-950 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLab(lab);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-slate-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to view details</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-400 py-8">No lab results for {getDateRangeLabel(dateRange).toLowerCase()}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Lab Detail Modal */}
      {selectedLab && (
        <LabDetailModal
          lab={selectedLab}
          open={!!selectedLab}
          onClose={() => setSelectedLab(null)}
        />
      )}
    </DoctorLayout>
  );
}