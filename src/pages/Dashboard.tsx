import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { glucoseAPI, mealsAPI, labsAPI, treatmentAPI, messageAPI, type GlucoseReading, type Meal, type LabResult, type TreatmentLog } from '@/lib/supabase';
import { formatChartDate, formatDateRange, formatTime, formatDateTime as formatDateTimeUtil, formatChartXAxis } from '@/lib/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Utensils, FlaskConical, MessageSquare, Settings, TrendingUp, TrendingDown, Pill, Users, Mail, ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Scatter, ZAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import AddGlucoseDialog from '@/components/AddGlucoseDialog';
import CareTeam from '@/components/CareTeam';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type TimeRange = '1day' | '1week' | '1month' | '2months' | '3months';

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

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [glucoseReadings, setGlucoseReadings] = useState<GlucoseReading[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [treatmentLogs, setTreatmentLogs] = useState<TreatmentLog[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('1day');
  const [showCareTeam, setShowCareTeam] = useState(false);
  const [hourOffset, setHourOffset] = useState(0); // 0 = current hour, -1 = previous hour, etc.
  const chartRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [glucoseData, mealsData, labsData, treatmentData, unreadMessages] = await Promise.all([
        glucoseAPI.getAll(user.id),
        mealsAPI.getAll(user.id),
        labsAPI.getAll(user.id),
        treatmentAPI.getAll(user.id),
        messageAPI.getUnreadCount(user.id),
      ]);
      
      setGlucoseReadings(glucoseData);
      setMeals(mealsData);
      setLabs(labsData);
      setTreatmentLogs(treatmentData);
      setUnreadCount(unreadMessages);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Poll for unread messages every 30 seconds
    const interval = setInterval(async () => {
      if (user) {
        try {
          const count = await messageAPI.getUnreadCount(user.id);
          setUnreadCount(count);
        } catch (error) {
          console.error('Error loading unread count:', error);
        }
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  // Handle touch events for swipe
  useEffect(() => {
    const chartElement = chartRef.current;
    if (!chartElement) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
      const diff = touchStartX.current - touchEndX.current;
      const threshold = 50;

      if (Math.abs(diff) > threshold) {
        if (diff > 0) {
          handleNavigatePrevious();
        } else {
          handleNavigateNext();
        }
      }
    };

    chartElement.addEventListener('touchstart', handleTouchStart);
    chartElement.addEventListener('touchmove', handleTouchMove);
    chartElement.addEventListener('touchend', handleTouchEnd);

    return () => {
      chartElement.removeEventListener('touchstart', handleTouchStart);
      chartElement.removeEventListener('touchmove', handleTouchMove);
      chartElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [hourOffset, timeRange]);

  const handleNavigatePrevious = () => {
    setHourOffset(prev => prev - 1);
  };

  const handleNavigateNext = () => {
    if (hourOffset < 0) {
      setHourOffset(prev => prev + 1);
    }
  };

  const handleBackToNow = () => {
    setHourOffset(0);
  };

  const getTimeWindow = () => {
    const now = new Date();
    let startTime: Date;
    let endTime: Date;

    if (timeRange === '1day') {
      startTime = new Date(now);
      startTime.setDate(now.getDate() + hourOffset);
      startTime.setHours(0, 0, 0, 0);
      endTime = new Date(startTime);
      endTime.setDate(startTime.getDate() + 1);
    } else if (timeRange === '1week') {
      startTime = new Date(now);
      startTime.setDate(now.getDate() + (hourOffset * 7) - 6);
      startTime.setHours(0, 0, 0, 0);
      endTime = new Date(startTime);
      endTime.setDate(startTime.getDate() + 7);
    } else if (timeRange === '1month') {
      startTime = new Date(now);
      startTime.setMonth(now.getMonth() + hourOffset);
      startTime.setDate(1);
      startTime.setHours(0, 0, 0, 0);
      endTime = new Date(startTime);
      endTime.setMonth(startTime.getMonth() + 1);
    } else if (timeRange === '2months') {
      startTime = new Date(now);
      startTime.setMonth(now.getMonth() + (hourOffset * 2) - 1);
      startTime.setDate(1);
      startTime.setHours(0, 0, 0, 0);
      endTime = new Date(startTime);
      endTime.setMonth(startTime.getMonth() + 2);
    } else {
      // 3months
      startTime = new Date(now);
      startTime.setMonth(now.getMonth() + (hourOffset * 3) - 2);
      startTime.setDate(1);
      startTime.setHours(0, 0, 0, 0);
      endTime = new Date(startTime);
      endTime.setMonth(startTime.getMonth() + 3);
    }

    return { startTime, endTime };
  };

  const getFilteredReadings = () => {
    const { startTime, endTime } = getTimeWindow();
    
    return glucoseReadings.filter(reading => {
      const readingDate = new Date(reading.date);
      return readingDate >= startTime && readingDate < endTime;
    });
  };

  const getFilteredMeals = () => {
    const { startTime, endTime } = getTimeWindow();
    
    return meals.filter(meal => {
      const mealDate = new Date(meal.date);
      return mealDate >= startTime && mealDate < endTime;
    });
  };

  const getFilteredTreatment = () => {
    const { startTime, endTime } = getTimeWindow();
    
    return treatmentLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startTime && logDate < endTime;
    });
  };

  const getFilteredLabs = () => {
    const { startTime, endTime } = getTimeWindow();
    
    return labs.filter(lab => {
      const labDate = new Date(lab.date);
      return labDate >= startTime && labDate < endTime;
    });
  };

  const filteredReadings = getFilteredReadings();
  const filteredMeals = getFilteredMeals();
  const filteredTreatment = getFilteredTreatment();
  const filteredLabs = getFilteredLabs();
  const latestGlucose = glucoseReadings[0];
  
  const avgGlucose = filteredReadings.length > 0
    ? Math.round(filteredReadings.reduce((sum, r) => sum + r.value, 0) / filteredReadings.length)
    : 0;

  const totalCarbsFiltered = filteredMeals.reduce((sum, m) => sum + m.carbs, 0);

  const filteredInsulin = filteredTreatment.filter(log => log.treatment_type === 'insulin');
  const totalInsulinFiltered = filteredInsulin.reduce((sum, log) => sum + log.dose, 0);

  const getGlucoseStatus = (value: number) => {
    if (value < 70) return { text: t('dashboard.status.low'), color: 'text-red-500', icon: TrendingDown };
    if (value > 180) return { text: t('dashboard.status.high'), color: 'text-orange-500', icon: TrendingUp };
    return { text: t('dashboard.status.normal'), color: 'text-green-500', icon: Activity };
  };

  const status = latestGlucose ? getGlucoseStatus(latestGlucose.value) : null;

  const getTimeRangeLabel = () => {
    const { startTime, endTime } = getTimeWindow();
    return formatDateRange(startTime, endTime, timeRange, hourOffset);
  };

  const formatDateTime = (date: Date): string => {
    return formatChartDate(date, timeRange);
  };

  const getChartData = (): ChartDataPoint[] => {
    const allPoints: ChartDataPoint[] = [];
    
    // Add glucose readings
    filteredReadings.forEach(reading => {
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
      
      const beforeReading = filteredReadings
        .filter(r => new Date(r.date).getTime() <= mealTimestamp)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      const afterReading = filteredReadings
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
    filteredTreatment.forEach(treatment => {
      const treatmentDate = new Date(treatment.timestamp);
      const treatmentTimestamp = treatmentDate.getTime();
      
      let glucoseValue: number | null = null;
      
      const beforeReading = filteredReadings
        .filter(r => new Date(r.date).getTime() <= treatmentTimestamp)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      const afterReading = filteredReadings
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
            <p className="text-slate-400">{t('app.welcome')}, {user?.user_metadata?.full_name || 'User'}!</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            className="text-slate-400 hover:text-white"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">{t('dashboard.latestGlucose')}</CardTitle>
              <Activity className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              {latestGlucose ? (
                <>
                  <div className="text-2xl font-bold">{latestGlucose.value} {t('glucose.unit')}</div>
                  {status && (
                    <p className={`text-xs ${status.color} flex items-center gap-1 mt-1`}>
                      <status.icon className="w-3 h-3" />
                      {status.text}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(latestGlucose.date).toLocaleString('en-US', { hour12: false })}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-600">-- {t('glucose.unit')}</div>
                  <p className="text-xs text-slate-500 mt-1">{t('dashboard.noReadings')}</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">{t('dashboard.averageGlucose')}</CardTitle>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              {avgGlucose > 0 ? (
                <>
                  <div className="text-2xl font-bold">{avgGlucose} {t('glucose.unit')}</div>
                  <p className="text-xs text-slate-500 mt-1">{filteredReadings.length} readings - {getTimeRangeLabel()}</p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-600">0 {t('glucose.unit')}</div>
                  <p className="text-xs text-slate-500 mt-1">No data - {getTimeRangeLabel()}</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Carbs</CardTitle>
              <Utensils className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCarbsFiltered}g</div>
              <p className="text-xs text-slate-500 mt-1">{filteredMeals.length} meals - {getTimeRangeLabel()}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Insulin</CardTitle>
              <Pill className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalInsulinFiltered.toFixed(1)} U</div>
              <p className="text-xs text-slate-500 mt-1">{filteredTreatment.length} doses - {getTimeRangeLabel()}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle className="text-lg font-medium">Glucose Trends & Meals</CardTitle>
                <p className="text-xs text-slate-400 mt-1">{getTimeRangeLabel()}</p>
              </div>
              <Select value={timeRange} onValueChange={(value) => {
                setTimeRange(value as TimeRange);
                setHourOffset(0);
              }}>
                <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="1day">1 Day</SelectItem>
                  <SelectItem value="1week">1 Week</SelectItem>
                  <SelectItem value="1month">1 Month</SelectItem>
                  <SelectItem value="2months">2 Months</SelectItem>
                  <SelectItem value="3months">3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between gap-2 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleNavigatePrevious}
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              
              {hourOffset !== 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackToNow}
                  className="bg-blue-600 border-blue-500 text-white hover:bg-blue-700"
                >
                  <Clock className="w-4 h-4 mr-1" />
                  Back to Today
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNavigateNext}
                disabled={hourOffset >= 0}
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            <p className="text-xs text-slate-500 text-center">
              💡 Swipe left/right on the chart to navigate through history
            </p>
          </CardHeader>
          <CardContent>
            <div ref={chartRef} className="touch-pan-y">
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
                      if (timeRange === '1day') {
                        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                      } else if (timeRange === '1week') {
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
            </div>
            {chartData.length === 0 && (
              <div className="text-center mt-4 mb-4">
                <p className="text-slate-400 text-sm font-medium">No glucose data for {getTimeRangeLabel().toLowerCase()}</p>
                <p className="text-slate-500 text-xs mt-1">Add your first reading to see trends and patterns</p>
              </div>
            )}
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
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <AddGlucoseDialog onAdd={loadData} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            onClick={() => navigate('/logs')}
            className="h-24 bg-slate-900 hover:bg-slate-800 border border-slate-800 flex flex-col items-center justify-center gap-2 text-white"
          >
            <Activity className="w-8 h-8 text-green-500" />
            <span>{t('dashboard.glucoseLogs')}</span>
            <span className="text-xs text-slate-400">{filteredReadings.length} {t('dashboard.readings')}</span>
          </Button>

          <Button
            onClick={() => navigate('/meals')}
            className="h-24 bg-slate-900 hover:bg-slate-800 border border-slate-800 flex flex-col items-center justify-center gap-2 text-white"
          >
            <Utensils className="w-8 h-8 text-blue-500" />
            <span>{t('dashboard.mealLogs')}</span>
            <span className="text-xs text-slate-400">{filteredMeals.length} {t('dashboard.meals')}</span>
          </Button>

          <Button
            onClick={() => navigate('/labs')}
            className="h-24 bg-slate-900 hover:bg-slate-800 border border-slate-800 flex flex-col items-center justify-center gap-2 text-white"
          >
            <FlaskConical className="w-8 h-8 text-purple-500" />
            <span>{t('dashboard.labResults')}</span>
            <span className="text-xs text-slate-400">{filteredLabs.length} {t('dashboard.results')}</span>
          </Button>

          <Button
            onClick={() => navigate('/treatment')}
            className="h-24 bg-slate-900 hover:bg-slate-800 border border-slate-800 flex flex-col items-center justify-center gap-2 text-white"
          >
            <Pill className="w-8 h-8 text-violet-500" />
            <span>Treatment</span>
            <span className="text-xs text-slate-400">{filteredTreatment.length} logs</span>
          </Button>
        </div>

        <Button
          onClick={() => setShowCareTeam(!showCareTeam)}
          className="w-full h-16 bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-3"
        >
          <Users className="w-6 h-6" />
          <span className="text-lg">My Care Team</span>
        </Button>

        {showCareTeam && <CareTeam />}

        <Button
          onClick={() => navigate('/messages')}
          className="w-full h-16 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 flex items-center justify-center gap-3 relative shadow-lg shadow-blue-500/20"
        >
          <Mail className="w-6 h-6" />
          <span className="text-lg">Messages with Doctor</span>
          {unreadCount > 0 && (
            <Badge className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1">
              {unreadCount}
            </Badge>
          )}
        </Button>

        <Button
          onClick={() => navigate('/chat')}
          className="w-full h-16 bg-green-600 hover:bg-green-700 flex items-center justify-center gap-3"
        >
          <MessageSquare className="w-6 h-6" />
          <span className="text-lg">{t('dashboard.chatWithAI')}</span>
        </Button>
      </div>
    </div>
  );
}