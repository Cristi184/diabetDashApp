import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Trash2, Pill, ArrowLeft } from 'lucide-react';
import { treatmentAPI, TreatmentLog } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import AddTreatmentDialog from '@/components/AddTreatmentDialog';

type DateFilter = 'day' | 'week' | 'month' | 'all';

export default function TreatmentLogs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<TreatmentLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<DateFilter>('day');
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    loadLogs();
  }, [user, currentPage, dateFilter]);

  const loadLogs = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, total } = await treatmentAPI.getPaginated(user.id, {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        dateFilter: dateFilter,
      });
      console.log('Loaded treatment logs:', data, 'Total:', total);
      setLogs(data);
      setTotalLogs(total);
    } catch (error) {
      console.error('Error loading treatment logs:', error);
      toast.error('Error loading treatment logs');
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

  const handleDelete = async (id: string) => {
    try {
      await treatmentAPI.delete(id);
      toast.success('Log deleted successfully');
      await loadLogs();
    } catch (error) {
      console.error('Error deleting treatment log:', error);
      toast.error('Error deleting log');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTreatmentLabel = (log: TreatmentLog) => {
    if (log.treatment_type === 'insulin') {
      return log.insulin_type === 'basal' ? 'Basal Insulin' : 'Rapid Insulin';
    }
    return log.medication_name || 'Pills';
  };

  const getTreatmentColor = (log: TreatmentLog) => {
    if (log.treatment_type === 'insulin') {
      return log.insulin_type === 'basal' ? 'bg-blue-500' : 'bg-purple-500';
    }
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="container mx-auto p-4 max-w-4xl">
          <div className="flex items-center justify-center h-64">
            <p className="text-slate-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="container mx-auto p-4 max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="text-slate-400 hover:text-white hover:bg-slate-800/50"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Pill className="h-8 w-8 text-violet-500" />
            <h1 className="text-3xl font-bold">Treatment Logs</h1>
          </div>
          <AddTreatmentDialog onTreatmentAdded={loadLogs} />
        </div>

        {/* Date Filter */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-400 mr-2">Filter by:</span>
              <Button
                onClick={() => handleDateFilterChange('day')}
                variant={dateFilter === 'day' ? 'default' : 'outline'}
                size="sm"
                className={dateFilter === 'day' ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'border-slate-700 hover:bg-slate-800 text-white'}
              >
                Today
              </Button>
              <Button
                onClick={() => handleDateFilterChange('week')}
                variant={dateFilter === 'week' ? 'default' : 'outline'}
                size="sm"
                className={dateFilter === 'week' ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'border-slate-700 hover:bg-slate-800 text-white'}
              >
                Last Week
              </Button>
              <Button
                onClick={() => handleDateFilterChange('month')}
                variant={dateFilter === 'month' ? 'default' : 'outline'}
                size="sm"
                className={dateFilter === 'month' ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'border-slate-700 hover:bg-slate-800 text-white'}
              >
                Last Month
              </Button>
              <Button
                onClick={() => handleDateFilterChange('all')}
                variant={dateFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                className={dateFilter === 'all' ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'border-slate-700 hover:bg-slate-800 text-white'}
              >
                All Time
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <p className="text-sm text-slate-400">
            {totalLogs} {totalLogs === 1 ? 'log' : 'logs'} total
          </p>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Treatment Logs</CardTitle>
            <CardDescription>Your insulin and medication records</CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Pill className="h-12 w-12 text-slate-500 mb-4" />
                <p className="text-slate-400 text-center">
                  No treatment logs for selected filter.
                  <br />
                  Add your first log to start tracking.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {logs.map((log) => (
                    <Card key={log.id} className="bg-slate-800 border-slate-700">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${getTreatmentColor(log)}`} />
                            <div>
                              <CardTitle className="text-lg text-white">
                                {getTreatmentLabel(log)}
                              </CardTitle>
                              <p className="text-sm text-slate-400 mt-1">
                                {formatDate(log.timestamp)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(log.id)}
                            className="text-red-500 hover:text-red-400 hover:bg-slate-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-400">Dose:</span>
                            <span className="text-2xl font-bold text-violet-500">
                              {log.dose} {log.dose_unit}
                            </span>
                          </div>
                          {log.notes && (
                            <div className="mt-3 pt-3 border-t border-slate-800">
                              <p className="text-sm text-slate-400 mb-1">Notes:</p>
                              <p className="text-sm text-slate-200">{log.notes}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalLogs > ITEMS_PER_PAGE && (
                  <div className="mt-6">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer text-white hover:bg-slate-800'}
                          />
                        </PaginationItem>
                        
                        {[...Array(Math.ceil(totalLogs / ITEMS_PER_PAGE))].map((_, index) => {
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
                            onClick={() => currentPage < Math.ceil(totalLogs / ITEMS_PER_PAGE) && handlePageChange(currentPage + 1)}
                            className={currentPage === Math.ceil(totalLogs / ITEMS_PER_PAGE) ? 'pointer-events-none opacity-50' : 'cursor-pointer text-white hover:bg-slate-800'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                    <p className="text-center text-slate-500 text-sm mt-2">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalLogs)} of {totalLogs} logs
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}