import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Trash2 } from 'lucide-react';
import { glucoseAPI, type GlucoseReading } from '@/lib/supabase';
import AddGlucoseDialog from '@/components/AddGlucoseDialog';
import GlucoseDetailModal from '@/components/GlucoseDetailModal';
import UploadGlucoseImageDialog from '@/components/UploadGlucoseImageDialog';
import { toast } from 'sonner';

type DateFilter = 'day' | 'week' | 'month' | 'all';

export default function GlucoseLogs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [totalReadings, setTotalReadings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedReading, setSelectedReading] = useState<GlucoseReading | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<DateFilter>('day');
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    loadReadings();
  }, [user, currentPage, dateFilter]);

  const loadReadings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, total } = await glucoseAPI.getPaginated(user.id, {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        dateFilter: dateFilter,
      });
      console.log('Loaded glucose readings:', data, 'Total:', total);
      setReadings(data);
      setTotalReadings(total);
    } catch (error) {
      console.error('Error loading glucose readings:', error);
      toast.error('Failed to load glucose readings');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDateFilterChange = (filter: DateFilter) => {
    setDateFilter(filter);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this glucose reading?')) {
      return;
    }

    setDeletingId(id);
    try {
      await glucoseAPI.delete(id);
      toast.success('Glucose reading deleted successfully');
      await loadReadings();
    } catch (error) {
      console.error('Error deleting glucose reading:', error);
      toast.error('Failed to delete glucose reading');
    } finally {
      setDeletingId(null);
    }
  };

  const getGlucoseStatus = (value: number) => {
    if (value < 70) return { label: 'Low', color: 'text-red-500', icon: TrendingDown };
    if (value > 180) return { label: 'High', color: 'text-yellow-500', icon: TrendingUp };
    return { label: 'Normal', color: 'text-green-500', icon: Minus };
  };

  const avgGlucose = readings.length > 0
    ? Math.round(readings.reduce((sum, r) => sum + r.value, 0) / readings.length)
    : 0;

  const inRange = readings.filter(r => r.value >= 70 && r.value <= 180).length;
  const inRangePercent = readings.length > 0 ? Math.round((inRange / readings.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Glucose Logs</h1>
            <p className="text-slate-400">Track and monitor your blood glucose levels</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Average Glucose</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{avgGlucose} mg/dL</div>
              <p className="text-xs text-slate-500 mt-1">{totalReadings} total readings</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Time in Range</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{inRangePercent}%</div>
              <p className="text-xs text-slate-500 mt-1">{inRange} of {readings.length} readings</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Target Range</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">70-180</div>
              <p className="text-xs text-slate-500 mt-1">mg/dL</p>
            </CardContent>
          </Card>
        </div>

        {/* Date Filter */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-400 mr-2">Filter by:</span>
              <Button
                onClick={() => handleDateFilterChange('day')}
                variant={dateFilter === 'day' ? 'default' : 'outline'}
                size="sm"
                className={dateFilter === 'day' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-slate-700 hover:bg-slate-800 text-white'}
              >
                Today
              </Button>
              <Button
                onClick={() => handleDateFilterChange('week')}
                variant={dateFilter === 'week' ? 'default' : 'outline'}
                size="sm"
                className={dateFilter === 'week' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-slate-700 hover:bg-slate-800 text-white'}
              >
                Last Week
              </Button>
              <Button
                onClick={() => handleDateFilterChange('month')}
                variant={dateFilter === 'month' ? 'default' : 'outline'}
                size="sm"
                className={dateFilter === 'month' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-slate-700 hover:bg-slate-800 text-white'}
              >
                Last Month
              </Button>
              <Button
                onClick={() => handleDateFilterChange('all')}
                variant={dateFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                className={dateFilter === 'all' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-slate-700 hover:bg-slate-800 text-white'}
              >
                All Time
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <AddGlucoseDialog onSuccess={loadReadings} />
          <UploadGlucoseImageDialog onSuccess={loadReadings} />
        </div>

        {/* Readings List */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Recent Readings</CardTitle>
            <CardDescription>Click on any reading to view details, or use the delete button to remove it</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-400">Loading readings...</div>
            ) : readings.length > 0 ? (
              <>
                <div className="space-y-3">
                  {readings.map((reading) => {
                    const status = getGlucoseStatus(reading.value);
                    const StatusIcon = status.icon;
                    
                    return (
                      <div
                        key={reading.id}
                        className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors group"
                      >
                        <div 
                          className="flex items-center gap-4 flex-1 cursor-pointer"
                          onClick={() => setSelectedReading(reading)}
                        >
                          <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
                            reading.value < 70 ? 'bg-red-500/20' :
                            reading.value > 180 ? 'bg-yellow-500/20' :
                            'bg-green-500/20'
                          }`}>
                            <StatusIcon className={`w-6 h-6 ${status.color}`} />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-white text-lg">
                              {reading.value} mg/dL
                            </p>
                            <p className="text-sm text-slate-400">
                              {new Date(reading.date).toLocaleString()}
                            </p>
                            {reading.notes && (
                              <p className="text-xs text-slate-500 mt-1">{reading.notes}</p>
                            )}
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            reading.value < 70 ? 'bg-red-500/20 text-red-400' :
                            reading.value > 180 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {status.label}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDelete(reading.id, e)}
                          disabled={deletingId === reading.id}
                          className="ml-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalReadings > ITEMS_PER_PAGE && (
                  <div className="mt-6">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer text-white hover:bg-slate-800'}
                          />
                        </PaginationItem>
                        
                        {[...Array(Math.ceil(totalReadings / ITEMS_PER_PAGE))].map((_, index) => {
                          const pageNumber = index + 1;
                          return (
                            <PaginationItem key={pageNumber}>
                              <PaginationLink
                                onClick={() => handlePageChange(pageNumber)}
                                isActive={currentPage === pageNumber}
                                className={`cursor-pointer ${
                                  currentPage === pageNumber 
                                    ? 'bg-slate-800 text-white border-slate-700' 
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                              >
                                {pageNumber}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => currentPage < Math.ceil(totalReadings / ITEMS_PER_PAGE) && handlePageChange(currentPage + 1)}
                            className={currentPage === Math.ceil(totalReadings / ITEMS_PER_PAGE) ? 'pointer-events-none opacity-50' : 'cursor-pointer text-white hover:bg-slate-800'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                    <p className="text-center text-slate-500 text-sm mt-2">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalReadings)} of {totalReadings} readings
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 mb-4">No glucose readings for selected filter</p>
                <div className="flex flex-col gap-2 items-center">
                  <AddGlucoseDialog onSuccess={loadReadings} />
                  <p className="text-slate-500 text-sm">or</p>
                  <UploadGlucoseImageDialog onSuccess={loadReadings} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Modal */}
        {selectedReading && (
          <GlucoseDetailModal
            reading={selectedReading}
            open={!!selectedReading}
            onClose={() => setSelectedReading(null)}
            onDelete={loadReadings}
          />
        )}
      </div>
    </div>
  );
}