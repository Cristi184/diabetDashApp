import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { mealsAPI, type Meal } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import AddMealDialog from '@/components/AddMealDialog';
import MealDetailModal from '@/components/MealDetailModal';

type TimeRange = 'today' | 'yesterday' | 'week' | 'month';

export default function Logs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [filteredMeals, setFilteredMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('today');

  const loadMeals = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = await mealsAPI.getAll(user.id);
      setMeals(data);
    } catch (error) {
      console.error('Error loading meals:', error);
      toast.error('Failed to load meals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeals();
  }, [user]);

  useEffect(() => {
    filterMealsByTimeRange();
  }, [meals, timeRange]);

  const filterMealsByTimeRange = () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(startOfToday);
    startOfMonth.setDate(startOfMonth.getDate() - 30);

    let filtered = meals;

    switch (timeRange) {
      case 'today':
        filtered = meals.filter(meal => new Date(meal.date) >= startOfToday);
        break;
      case 'yesterday':
        filtered = meals.filter(meal => {
          const mealDate = new Date(meal.date);
          return mealDate >= startOfYesterday && mealDate < startOfToday;
        });
        break;
      case 'week':
        filtered = meals.filter(meal => new Date(meal.date) >= startOfWeek);
        break;
      case 'month':
        filtered = meals.filter(meal => new Date(meal.date) >= startOfMonth);
        break;
    }

    setFilteredMeals(filtered);
  };

  const handleDelete = async (id: string) => {
    try {
      await mealsAPI.delete(id);
      toast.success('Meal deleted');
      loadMeals();
    } catch (error) {
      console.error('Error deleting meal:', error);
      toast.error('Failed to delete meal');
    }
  };

  const handleViewDetails = (meal: Meal) => {
    setSelectedMeal(meal);
    setDetailModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">Meal Logs</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="max-w-xs">
            <AddMealDialog onMealAdded={loadMeals} />
          </div>
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-[180px] bg-slate-900 border-slate-800 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-slate-400">
            {filteredMeals.length} {filteredMeals.length === 1 ? 'meal' : 'meals'}
          </p>
        </div>

        {filteredMeals.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="py-12 text-center">
              <p className="text-slate-400">No meals logged for this period</p>
              <p className="text-sm text-slate-500 mt-2">Start tracking your meals to see them here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredMeals.map((meal) => (
              <Card 
                key={meal.id} 
                className="bg-slate-900 border-slate-800 cursor-pointer hover:bg-slate-800/50 transition-colors"
                onClick={() => handleViewDetails(meal)}
              >
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{meal.name}</CardTitle>
                    <p className="text-sm text-slate-400 mt-1">
                      {new Date(meal.date).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewDetails(meal)}
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-950"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(meal.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-950"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-4">
                      <div>
                        <p className="text-2xl font-bold text-green-500">{meal.carbs}g</p>
                        <p className="text-xs text-slate-500">Carbs</p>
                      </div>
                      {meal.protein !== null && meal.protein !== undefined && (
                        <div>
                          <p className="text-2xl font-bold text-blue-500">{meal.protein}g</p>
                          <p className="text-xs text-slate-500">Protein</p>
                        </div>
                      )}
                      {meal.calories !== null && meal.calories !== undefined && (
                        <div>
                          <p className="text-2xl font-bold text-orange-500">{meal.calories}</p>
                          <p className="text-xs text-slate-500">Calories</p>
                        </div>
                      )}
                    </div>
                    {meal.photo_url && (
                      <div className="flex-1">
                        <img
                          src={meal.photo_url}
                          alt={meal.name}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <MealDetailModal 
        meal={selectedMeal}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </div>
  );
}