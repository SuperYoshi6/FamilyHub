import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { MealPlan, MealRequest, FamilyMember, Recipe, PlaceRecommendation } from '../types';
import { suggestActivities } from '../services/gemini';
import { Sparkles, ChefHat, RefreshCcw, Utensils, MessageCircleHeart, Trash2, Plus, Store, Search, ExternalLink, Loader2, ShoppingCart, Edit3, Coffee, Sun, Moon, Save, X, Lock, BookOpen, Heart, CheckSquare, ListPlus, FileText } from 'lucide-react';

interface MealsPageProps {
  plan: MealPlan[];
  requests: MealRequest[];
  family: FamilyMember[];
  currentUser: FamilyMember;
  onUpdatePlan: (plan: MealPlan[]) => void;
  onAddRequest: (dish: string) => void;
  onDeleteRequest: (id: string) => void;
  onAddIngredientsToShopping?: (ingredients: string[]) => void;
  onProfileClick: () => void;
  recipes?: Recipe[];
  onAddRecipe?: (recipe: Recipe) => void;
  onPlanGenerated?: () => void;
  liquidGlass?: boolean;
}

type TabType = 'plan' | 'wishes';

const MealsPage: React.FC<MealsPageProps> = ({ 
    plan, requests, family, currentUser, 
    onUpdatePlan, onAddRequest, onDeleteRequest, onAddIngredientsToShopping, 
    onProfileClick, recipes = [], onAddRecipe, onPlanGenerated, liquidGlass = false
}) => {
  const isChild = currentUser.role === 'child';
  
  // Tab State with Persistence
  const [activeTab, setActiveTab] = useState<TabType>(() => {
      const saved = localStorage.getItem('fh_meals_tab');
      if (saved === 'plan' || saved === 'wishes') {
          return saved;
      }
      return isChild ? 'wishes' : 'plan';
  });

  useEffect(() => {
      localStorage.setItem('fh_meals_tab', activeTab);
  }, [activeTab]);
  
  const [editingDay, setEditingDay] = useState<string | null>(null);
  
  // Wish State
  const [newWish, setNewWish] = useState('');


  const getCurrentWeekCycle = () => {
      const days = [];
      const today = new Date();
      const currentDay = today.getDay();
      const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1; 
      
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - distanceToMonday);

      for (let i = 0; i < 7; i++) {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + i);
          days.push({
              dateObj: d,
              dayName: d.toLocaleDateString('de-DE', { weekday: 'long' }),
              dateStr: d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
              isToday: d.toDateString() === today.toDateString()
          });
      }
      return days;
  };

  const displayDays = getCurrentWeekCycle();


  const handleWishSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(newWish.trim()) {
          onAddRequest(newWish.trim());
          setNewWish('');
      }
  };


  const updateMealEntry = (dayName: string, field: string, value: any) => {
      const existingMeal = plan.find(p => p.day === dayName);
      let newPlan = [...plan];
      if (existingMeal) {
          newPlan = newPlan.map(p => p.day === dayName ? { ...p, [field]: value } : p);
      } else {
          newPlan.push({
              id: Date.now().toString(), day: dayName, mealName: '', breakfast: '', lunch: '', ingredients: [], recipeHint: '', instructions: '',
              [field]: value
          } as MealPlan);
      }
      onUpdatePlan(newPlan);
  };

  // --- Renderers ---
  const renderPlan = () => (
    <div className="space-y-6 animate-fade-in">

        <div className="space-y-4">
          {displayDays.map((dayObj, index) => {
            const meal = plan.find(p => p.day === dayObj.dayName);
            const isEditing = editingDay === dayObj.dayName;
            
            return (
                <div key={index} className={`rounded-xl shadow-sm border overflow-hidden relative transition-all ${dayObj.isToday ? 'ring-1 ring-emerald-400' : ''} ${liquidGlass ? 'liquid-shimmer-card border-white/40' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
                    <div className={`px-4 py-2 border-b flex justify-between items-center ${liquidGlass ? 'bg-emerald-100/30 border-white/20' : 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800'}`}>
                        <div className="flex items-center gap-2"><span className="font-bold text-emerald-800 dark:text-emerald-300">{dayObj.dayName}</span></div>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">{dayObj.dateStr}</span>
                    </div>
                    <div className="p-4 relative">
                        {!isChild && (<button onClick={() => setEditingDay(isEditing ? null : dayObj.dayName)} className="absolute top-2 right-2 p-2 text-gray-400 hover:text-blue-500 rounded-lg">{isEditing ? <X size={18}/> : <Edit3 size={18} />}</button>)}
                        {!isEditing ? (
                            <div>
                                {meal && (meal.breakfast || meal.lunch || meal.mealName) ? (
                                    <div className="space-y-3">
                                        {meal.mealName && (<div><div className="flex items-start text-sm font-medium"><Moon size={14} className="mt-0.5 mr-2 text-indigo-500" /><span className={liquidGlass ? 'text-slate-900 dark:text-white' : 'text-gray-900 dark:text-white'}>{meal.mealName}</span></div></div>)}
                                        {meal.breakfast && (<div className="flex items-start text-sm"><Coffee size={14} className="mt-0.5 mr-2 text-orange-400" /><span className="text-gray-700 dark:text-gray-200">{meal.breakfast}</span></div>)}
                                        {meal.lunch && (<div className="flex items-start text-sm"><Sun size={14} className="mt-0.5 mr-2 text-yellow-500" /><span className="text-gray-700 dark:text-gray-200">{meal.lunch}</span></div>)}
                                    </div>
                                ) : (<div className="text-center py-2"><p className="text-sm text-gray-400 italic">Nichts geplant</p></div>)}
                            </div>
                        ) : (
                            <div className="space-y-3 animate-fade-in">
                                <input type="text" className={`w-full rounded-lg p-2 text-sm outline-none ${liquidGlass ? 'bg-white/40 border border-white/30' : 'bg-gray-50 dark:bg-gray-700 border border-gray-200'}`} value={meal?.mealName || ''} onChange={(e) => updateMealEntry(dayObj.dayName, 'mealName', e.target.value)} placeholder="Abendessen" />
                                <div className="flex justify-end pt-2"><button onClick={() => setEditingDay(null)} className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center hover:bg-emerald-600 transition"><Save size={12} className="mr-1"/> Fertig</button></div>
                            </div>
                        )}
                    </div>
                </div>
            );
          })}
        </div>
    </div>
  );

  // --- Dynamic Slider Helpers ---
  const getTabContainerClass = () => {
      if (liquidGlass) {
          return "liquid-shimmer-card border-white/40 p-1 rounded-xl relative flex";
      }
      return "bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex";
  };

  const getSliderClass = () => {
      return "absolute top-1 bottom-1 rounded-lg z-0 transition-all duration-300 ease-in-out";
  };

  const getSliderInnerClass = () => {
      if (liquidGlass) {
          return "w-full h-full rounded-lg bg-white/40 dark:bg-white/20 backdrop-blur-md border border-white/40 shadow-sm";
      }
      return ""; 
  };

  // Re-enable plan tab for everyone (ReadOnly for child)
  const tabs = [];
  tabs.push({ id: 'plan', label: 'Planer', icon: Utensils });
  tabs.push({ id: 'wishes', label: 'Wünsche', icon: MessageCircleHeart });

  const activeIndex = tabs.findIndex(t => t.id === activeTab);
  const widthPercent = 100 / tabs.length;

  return (
    <>
      <Header title="Essen" currentUser={currentUser} onProfileClick={onProfileClick} liquidGlass={liquidGlass} />
      
      <div className="px-4 mt-2 mb-4">
        <div className={getTabContainerClass()}>
          {liquidGlass && (
              <div className={getSliderClass()} style={{ left: `${activeIndex * widthPercent}%`, width: `${widthPercent}%` }}>
                  <div className={getSliderInnerClass()} />
              </div>
          )}
          {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              let btnClass = "";
              if (liquidGlass) {
                  btnClass = isActive ? "text-slate-900 dark:text-white font-extrabold" : "text-slate-500 dark:text-slate-400";
              } else {
                  btnClass = isActive ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200";
              }
              return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-1 transition-all z-10 ${btnClass}`}>
                    <tab.icon size={16} /> <span className="hidden sm:inline">{tab.label}</span> <span className="sm:hidden">{tab.label}</span>
                  </button>
              );
          })}
        </div>
      </div>

      <div className="p-4 pb-24">
         {activeTab === 'plan' && renderPlan()}
         {activeTab === 'wishes' && (
             <div className="animate-fade-in">
                 <div className={`p-6 rounded-2xl border mb-6 ${liquidGlass ? 'liquid-shimmer-card border-orange-200/50' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-100'}`}>
                      <h3 className="text-lg font-bold text-orange-900 dark:text-orange-300 mb-2">Worauf hast du Hunger?</h3>
                      <form onSubmit={handleWishSubmit} className="flex gap-2">
                          <input type="text" value={newWish} onChange={(e) => setNewWish(e.target.value)} placeholder="z.B. Pfannkuchen" className={`flex-1 rounded-xl p-3 text-sm outline-none ${liquidGlass ? 'bg-white/50 border border-white/40' : 'bg-white border-orange-200'}`} />
                          <button type="submit" className="bg-orange-500 text-white p-3 rounded-xl hover:bg-orange-600 shadow-md"><Plus size={20} /></button>
                      </form>
                  </div>
                  <div className="space-y-3">
                      {requests.map(req => (
                          <div key={req.id} className={`p-4 rounded-xl shadow-sm border flex justify-between items-center ${liquidGlass ? 'liquid-shimmer-card border-white/40' : 'bg-white dark:bg-gray-800 border-gray-100'}`}>
                              <div><p className="font-bold text-gray-800 dark:text-white">{req.dishName}</p></div>
                              <button onClick={() => onDeleteRequest(req.id)} className="text-gray-300 hover:text-red-400 p-2"><Trash2 size={18} /></button>
                          </div>
                      ))}
                  </div>
             </div>
         )}
      </div>
    </>
  );
};

export default MealsPage;