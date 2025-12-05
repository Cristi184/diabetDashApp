import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, MessageSquare, Activity, Loader2, Utensils, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { careRelationAPI, messageAPI, glucoseAPI, mealsAPI, type CareRelation, type GlucoseReading, type Meal } from '@/lib/supabase';
import DoctorLayout from '@/components/doctor/DoctorLayout';
import { ChartContainer } from '@/components/ui/chart';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Scatter, Tooltip, ReferenceLine, ResponsiveContainer, ZAxis } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PatientWithRelation extends CareRelation {
  patient?: {
    id: string;
    email: string;
    full_name?: string;
    role?: string;
  };
}

type TimeRange = '1day' | '1week' | '1month' | '2months' | '3months';

interface MealMarker {
  dateTime: string;
  glucose: number;
  carbs: number;
  name: string;
  time: string;
  timestamp: number;
}

interface ChartDataPoint {
  dateTime: string;
  timestamp: number;
  glucose: number;
  fullDateTime: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: MealMarker | ChartDataPoint;
  }>;
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    unreadMessages: 0,
    recentActivity: 0,
  });
  const [recentPatients, setRecentPatients] = useState<PatientWithRelation[]>([]);
  
  // Glucose chart state
  const [glucoseReadings, setGlucoseReadings] = useState<GlucoseReading[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('1week');
  const [dateOffset, setDateOffset] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  useEffect(() => {
    loadDashboardData();
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
  }, [dateOffset, timeRange]);

  const loadDashboardData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load care relations with patient profiles via edge function
      const relations = await careRelationAPI.getAllForCaregiver(user.id);
      
      // Load unread messages
      const unreadCount = await messageAPI.getUnreadCount(user.id);

      // Load doctor's own glucose data
      const [glucoseData, mealsData] = await Promise.all([
        glucoseAPI.getAll(user.id),
        mealsAPI.getAll(user.id),
      ]);

      setStats({
        totalPatients: relations.length,
        unreadMessages: unreadCount,
        recentActivity: relations.length,
      });

      setRecentPatients(relations.slice(0, 5));
      setGlucoseReadings(glucoseData);
      setMeals(mealsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigatePrevious = () => {
    setDateOffset(prev => prev - 1);
  };

  const handleNavigateNext = () => {
    if (dateOffset < 0) {
      setDateOffset(prev => prev + 1);
    }
  };

  const handleBackToToday = () => {
    setDateOffset(0);
  };

  const getDateRangeForOffset = () => {
    const now = new Date();
    const endDate = new Date(now);
    const startDate = new Date(now);

    switch (timeRange) {
      case '1day':
        endDate.setDate(now.getDate() + dateOffset + 1);
        endDate.setHours(0, 0, 0, 0);
        startDate.setDate(now.getDate() + dateOffset);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '1week':
        endDate.setDate(now.getDate() + (dateOffset * 7) + 1);
        endDate.setHours(0, 0, 0, 0);
        startDate.setDate(now.getDate() + (dateOffset * 7) - 6);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '1month':
        endDate.setMonth(now.getMonth() + dateOffset + 1);
        endDate.setDate(1);
        endDate.setHours(0, 0, 0, 0);
        startDate.setMonth(now.getMonth() + dateOffset);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '2months':
        endDate.setMonth(now.getMonth() + (dateOffset * 2) + 1);
        endDate.setDate(1);
        endDate.setHours(0, 0, 0, 0);
        startDate.setMonth(now.getMonth() + (dateOffset * 2) - 1);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '3months':
        endDate.setMonth(now.getMonth() + (dateOffset * 3) + 1);
        endDate.setDate(1);
        endDate.setHours(0, 0, 0, 0);
        startDate.setMonth(now.getMonth() + (dateOffset * 3) - 2);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    return { startDate, endDate };
  };

  const getFilteredReadings = () => {
    const { startDate, endDate } = getDateRangeForOffset();
    
    return glucoseReadings.filter(reading => {
      const readingDate = new Date(reading.date);
      return readingDate >= startDate && readingDate < endDate;
    });
  };

  const getFilteredMeals = () => {
    const { startDate, endDate } = getDateRangeForOffset();
    
    return meals.filter(meal => {
      const mealDate = new Date(meal.date);
      return mealDate >= startDate && mealDate < endDate;
    });
  };

  const filteredReadings = getFilteredReadings();
  const filteredMeals = getFilteredMeals();

  const getTimeRangeLabel = () => {
    const { startDate, endDate } = getDateRangeForOffset();
    
    if (timeRange === '1day') {
      if (dateOffset === 0) {
        return 'Today';
      } else if (dateOffset === -1) {
        return 'Yesterday';
      } else {
        return startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } else {
      const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const end = new Date(endDate.getTime() - 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${start} - ${end}`;
    }
  };

  const formatDateTime = (date: Date): string => {
    if (timeRange === '1day') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } else if (timeRange === '1week') {
      return date.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + 
             date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getChartData = (): ChartDataPoint[] => {
    return filteredReadings
      .map(reading => {
        const readingDate = new Date(reading.date);
        return {
          dateTime: formatDateTime(readingDate),
          timestamp: readingDate.getTime(),
          glucose: reading.value,
          fullDateTime: readingDate.toLocaleString('en-US', { hour12: false })
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  };

  const getMealMarkers = (): MealMarker[] => {
    return filteredMeals.map(meal => {
      const mealDate = new Date(meal.date);
      
      let closestGlucose = 100;
      let minTimeDiff = Infinity;
      
      filteredReadings.forEach(reading => {
        const readingDate = new Date(reading.date);
        const timeDiff = Math.abs(readingDate.getTime() - mealDate.getTime());
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          closestGlucose = reading.value;
        }
      });
      
      return {
        dateTime: formatDateTime(mealDate),
        glucose: closestGlucose,
        carbs: meal.carbs,
        name: meal.name,
        time: mealDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        timestamp: mealDate.getTime(),
      };
    });
  };

  const chartData = getChartData();
  const mealMarkers = getMealMarkers();

  const chartConfig = {
    glucose: {
      label: 'Glicemia',
      color: 'hsl(142, 76%, 36%)',
    },
  };

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (!active || !payload || !payload.length) return null;

    const item = payload[0];
    const data = item.payload;

    if (data && 'carbs' in data && data.carbs !== undefined) {
      return (
        <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-lg">
          <p className="text-white font-medium flex items-center gap-2">
            <Utensils className="w-4 h-4 text-orange-500" />
            Meal
          </p>
          <p className="text-sm text-slate-300 mt-1">{data.name}</p>
          <p className="text-sm text-orange-400 font-medium mt-1">{data.carbs}g carbs</p>
          <p className="text-xs text-slate-400 mt-1">{data.time}</p>
        </div>
      );
    }

    if (data && 'glucose' in data) {
      return (
        <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-lg">
          <p className="text-white font-medium">Glicemia</p>
          <p className="text-sm text-green-400 font-medium mt-1">{data.glucose} mg/dL</p>
          <p className="text-xs text-slate-400 mt-1">{data.fullDateTime}</p>
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

  return (
    <DoctorLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">Welcome back, {user?.user_metadata?.full_name || 'Provider'}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-900 border-slate-800 hover:border-blue-600 transition-colors cursor-pointer" onClick={() => navigate('/app/doctor/patients')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Patients</CardTitle>
              <Users className="w-5 h-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.totalPatients}</div>
              <p className="text-xs text-slate-500 mt-1">Active connections</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 hover:border-green-600 transition-colors cursor-pointer" onClick={() => navigate('/app/doctor/messages')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Unread Messages</CardTitle>
              <MessageSquare className="w-5 h-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.unreadMessages}</div>
              <p className="text-xs text-slate-500 mt-1">Pending responses</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Recent Activity</CardTitle>
              <Activity className="w-5 h-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.recentActivity}</div>
              <p className="text-xs text-slate-500 mt-1">Patient updates</p>
            </CardContent>
          </Card>
        </div>

        {/* My Glucose Trends Chart */}
        {chartData.length > 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <CardTitle className="text-lg font-medium text-white">My Glucose Trends & Meals</CardTitle>
                  <p className="text-xs text-slate-400 mt-1">{getTimeRangeLabel()}</p>
                </div>
                <Select value={timeRange} onValueChange={(value) => {
                  setTimeRange(value as TimeRange);
                  setDateOffset(0);
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
              
              {/* Navigation Controls */}
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
                
                {dateOffset !== 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackToToday}
                    className="bg-blue-600 border-blue-500 text-white hover:bg-blue-700"
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    Back to Today
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNavigateNext}
                  disabled={dateOffset >= 0}
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
                      domain={['dataMin', 'dataMax']}
                      scale="time"
                      tickFormatter={(timestamp) => {
                        const date = new Date(timestamp);
                        return formatDateTime(date);
                      }}
                      stroke="#94a3b8"
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      padding={{ right: 20 }}
                    />
                    <YAxis 
                      dataKey="glucose"
                      stroke="#94a3b8"
                      fontSize={12}
                      domain={[0, 'dataMax + dataMax * 0.1']}
                      label={{ 
                        value: 'Glicemia (mg/dL)', 
                        angle: -90, 
                        position: 'insideLeft', 
                        style: { fill: '#94a3b8', fontSize: 13, fontWeight: 500 } 
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine 
                      y={70} 
                      stroke="#ef4444" 
                      strokeDasharray="5 5" 
                      label={{ value: 'Low', position: 'insideBottomLeft', fill: '#ef4444', fontSize: 10 }} 
                    />
                    <ReferenceLine 
                      y={180} 
                      stroke="#f97316" 
                      strokeDasharray="5 5" 
                      label={{ value: 'High', position: 'insideTopLeft', fill: '#f97316', fontSize: 10 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="glucose" 
                      stroke="#22c55e"
                      strokeWidth={3}
                      dot={{ fill: '#22c55e', r: 5, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 7, strokeWidth: 2 }}
                      connectNulls
                    />
                    <Scatter 
                      data={mealMarkers} 
                      fill="#f97316"
                      shape="circle"
                      r={8}
                    />
                    <ZAxis type="number" dataKey="carbs" range={[50, 200]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4 text-xs flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-green-500"></div>
                  <span className="text-slate-400">Glucose Line</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="text-slate-400">Meals (hover for carbs)</span>
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
        ) : (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="py-12">
              <p className="text-center text-slate-400">No glucose data for {getTimeRangeLabel().toLowerCase()}</p>
              <p className="text-center text-slate-500 text-sm mt-2">Add your first reading to see trends</p>
              {dateOffset !== 0 && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackToToday}
                    className="bg-blue-600 border-blue-500 text-white hover:bg-blue-700"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Back to Today
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Patients */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-white">Recent Patients</CardTitle>
              <Button
                onClick={() => navigate('/app/doctor/patients')}
                variant="outline"
                size="sm"
                className="border-slate-700 hover:bg-slate-800"
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentPatients.length > 0 ? (
              <div className="space-y-3">
                {recentPatients.map((relation) => (
                  <div
                    key={relation.id}
                    onClick={() => navigate(`/app/doctor/patients/${relation.patient_id}`)}
                    className="flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-blue-600 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="text-white font-medium">
                          {relation.patient?.full_name?.[0] || 'P'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {relation.patient?.full_name || 'Patient'}
                        </p>
                        <p className="text-xs text-slate-400">{relation.patient?.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        Connected {new Date(relation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="text-slate-400 mb-4">No patients connected yet</p>
                <Button
                  onClick={() => navigate('/app/doctor/onboarding')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Connect to Patients
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={() => navigate('/app/doctor/patients')}
            className="h-20 bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center gap-3"
          >
            <Users className="w-6 h-6 text-blue-500" />
            <span className="text-lg">View All Patients</span>
          </Button>

          <Button
            onClick={() => navigate('/app/doctor/messages')}
            className="h-20 bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center gap-3"
          >
            <MessageSquare className="w-6 h-6 text-green-500" />
            <span className="text-lg">Check Messages</span>
          </Button>
        </div>
      </div>
    </DoctorLayout>
  );
}