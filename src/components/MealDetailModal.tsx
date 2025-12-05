import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type Meal } from '@/lib/supabase';
import { Calendar, Flame, Apple, Drumstick, Droplet } from 'lucide-react';

interface MealDetailModalProps {
  meal: Meal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MealDetailModal({ meal, open, onOpenChange }: MealDetailModalProps) {
  if (!meal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{meal.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Photo */}
          {meal.photo_url && (
            <div className="w-full">
              <img
                src={meal.photo_url}
                alt={meal.name}
                className="w-full h-64 object-cover rounded-lg shadow-lg"
              />
            </div>
          )}

          {/* Date & Time */}
          <div className="flex items-center gap-3 text-slate-400">
            <Calendar className="w-5 h-5" />
            <span>{new Date(meal.date).toLocaleString()}</span>
          </div>

          {/* Nutritional Information */}
          <div className="grid grid-cols-2 gap-4">
            {/* Carbs */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Apple className="w-5 h-5 text-green-500" />
                <span className="text-sm text-slate-400">Carbohydrates</span>
              </div>
              <p className="text-3xl font-bold text-green-500">{meal.carbs}g</p>
            </div>

            {/* Protein */}
            {meal.protein !== null && meal.protein !== undefined && (
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Drumstick className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-slate-400">Protein</span>
                </div>
                <p className="text-3xl font-bold text-blue-500">{meal.protein}g</p>
              </div>
            )}

            {/* Fat */}
            {meal.fat !== null && meal.fat !== undefined && (
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Droplet className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm text-slate-400">Fat</span>
                </div>
                <p className="text-3xl font-bold text-yellow-500">{meal.fat}g</p>
              </div>
            )}

            {/* Calories */}
            {meal.calories !== null && meal.calories !== undefined && (
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span className="text-sm text-slate-400">Calories</span>
                </div>
                <p className="text-3xl font-bold text-orange-500">{meal.calories}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {meal.description && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-400 mb-2">Description</h3>
              <p className="text-slate-300 leading-relaxed">{meal.description}</p>
            </div>
          )}

          {/* Macros Summary */}
          {(meal.protein || meal.fat || meal.calories) && (
            <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-lg p-4 border border-slate-600">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">Nutritional Summary</h3>
              <div className="space-y-2">
                {meal.calories && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Total Energy</span>
                    <span className="font-bold text-orange-400">{meal.calories} kcal</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Carbohydrates</span>
                  <span className="font-bold text-green-400">{meal.carbs}g</span>
                </div>
                {meal.protein !== null && meal.protein !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Protein</span>
                    <span className="font-bold text-blue-400">{meal.protein}g</span>
                  </div>
                )}
                {meal.fat !== null && meal.fat !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Fat</span>
                    <span className="font-bold text-yellow-400">{meal.fat}g</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}