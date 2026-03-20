import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { MealPlan, MealRequest, FamilyMember, Recipe } from '../types';
import { Coffee, Sun, Moon, Plus, Trash2, Edit3, Save, X, ChefHat } from 'lucide-react';

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
  
  const [activeTab, setActiveTab] = useState<TabType>(() => {
      const saved = localStorage.getItem('fh_meals_tab');
      return (saved === 'plan' || saved === 'wishes') ? saved : (isChild ? 'wishes' : 'plan');
  });

  useEffect(() => {
      localStorage.setItem('fh_meals_tab', activeTab);
  }, [activeTab]);
  
  const [editingDay, setEditingDay] = useState<string | null>(null);
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

  const renderPlan = () => {
      const currentHour = new Date().getHours();
      return (
          <div className="space-y-6 animate-fade-in">
              {displayDays.map((day) => {
                  const dayPlan = plan.find(p => p.day === day.dayName);
                  const isBreakfastTime = day.isToday && currentHour >= 5 && currentHour < 11;
                  const isLunchTime = day.isToday && currentHour >= 11 && currentHour < 15;
                  const isDinnerTime = day.isToday && (currentHour >= 18 || currentHour < 5); // Dinner is the main focus in evening

                  return (
                      <div key={day.dayName} className={`rounded-2xl border ${day.isToday ? 'border-blue-200 dark:border-blue-800 ring-2 ring-blue-500/10' : 'border-gray-100 dark:border-gray-700'} ${day.isToday ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'bg-white dark:bg-gray-800'} overflow-hidden shadow-sm`}>
                          <div className={`p-3 flex justify-between items-center ${day.isToday ? 'bg-blue-500 text-white' : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'}`}>
                              <span className="font-bold flex items-center gap-2">{day.dayName} <span className="text-[10px] opacity-60 font-normal">{day.dateStr}</span></span>
                              {day.isToday && <span className="text-[10px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full">Heute</span>}
                          </div>
                          
                          <div className="p-4 space-y-4">
                              {/* Breakfast Slot */}
                              <div className={`flex items-start space-x-3 p-2 rounded-xl border border-transparent transition-all ${isBreakfastTime ? 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800' : ''}`}>
                                  <div className={`p-2 rounded-lg ${isBreakfastTime ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}><Coffee size={16}/></div>
                                  <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start">
                                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isBreakfastTime ? 'text-orange-600' : 'text-gray-400'}`}>Frühstück</span>
                                          {!isChild && <button onClick={() => setEditingDay(isEditing('breakfast', day.dayName) ? null : day.dayName + '-breakfast')} className="text-gray-300 hover:text-blue-500 p-1"><Edit3 size={12} /></button>}
                                      </div>
                                      {isEditing('breakfast', day.dayName) ? (
                                          <input autoFocus defaultValue={dayPlan?.breakfast} onBlur={(e) => { updateMealEntry(day.dayName, 'breakfast', e.target.value); setEditingDay(null); }} className="w-full bg-transparent border-b border-blue-500 outline-none text-sm font-medium" />
                                      ) : (
                                          <p className={`text-sm truncate ${dayPlan?.breakfast ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-400 italic'}`}>{dayPlan?.breakfast || 'Nicht geplant'}</p>
                                      )}
                                  </div>
                              </div>

                              {/* Lunch Slot */}
                              <div className={`flex items-start space-x-3 p-2 rounded-xl border border-transparent transition-all ${isLunchTime ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-800' : ''}`}>
                                  <div className={`p-2 rounded-lg ${isLunchTime ? 'bg-yellow-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}><Sun size={16}/></div>
                                  <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start">
                                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isLunchTime ? 'text-yellow-600' : 'text-gray-400'}`}>Mittagessen</span>
                                          {!isChild && <button onClick={() => setEditingDay(isEditing('lunch', day.dayName) ? null : day.dayName + '-lunch')} className="text-gray-300 hover:text-blue-500 p-1"><Edit3 size={12} /></button>}
                                      </div>
                                      {isEditing('lunch', day.dayName) ? (
                                          <input autoFocus defaultValue={dayPlan?.lunch} onBlur={(e) => { updateMealEntry(day.dayName, 'lunch', e.target.value); setEditingDay(null); }} className="w-full bg-transparent border-b border-blue-500 outline-none text-sm font-medium" />
                                      ) : (
                                          <p className={`text-sm truncate ${dayPlan?.lunch ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-400 italic'}`}>{dayPlan?.lunch || 'Nicht geplant'}</p>
                                      )}
                                  </div>
                              </div>

                              {/* Dinner Slot (Main) */}
                              <div className={`flex items-start space-x-3 p-2 rounded-xl border border-transparent transition-all ${isDinnerTime ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800' : ''}`}>
                                  <div className={`p-2 rounded-lg ${isDinnerTime ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}><Moon size={16}/></div>
                                  <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start">
                                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isDinnerTime ? 'text-indigo-600' : 'text-gray-400'}`}>Hauptspeise</span>
                                          {!isChild && <button onClick={() => setEditingDay(isEditing('main', day.dayName) ? null : day.dayName)} className="text-gray-300 hover:text-blue-500 p-1"><Edit3 size={12} /></button>}
                                      </div>
                                      {isEditing('main', day.dayName) ? (
                                          <input autoFocus defaultValue={dayPlan?.mealName} onBlur={(e) => { updateMealEntry(day.dayName, 'mealName', e.target.value); setEditingDay(null); }} className="w-full bg-transparent border-b border-blue-500 outline-none text-sm font-bold" />
                                      ) : (
                                          <p className={`text-sm truncate ${dayPlan?.mealName ? 'text-gray-800 dark:text-white font-bold' : 'text-gray-400 italic'}`}>{dayPlan?.mealName || 'Nicht geplant'}</p>
                                      )}
                                  </div>
                              </div>
                          </div>
                      </div>
                  );
              })}
          </div>
      );
  };

  const isEditing = (slot: string, d: string) => {
      if (slot === 'main') return editingDay === d;
      return editingDay === `${d}-${slot}`;
  };

  return (
    <>
      <Header title="Essen" currentUser={currentUser} onProfileClick={onProfileClick} liquidGlass={liquidGlass} />
      
      <div className="px-4 mt-2 mb-4">
        <div className={`p-1 rounded-xl flex ${liquidGlass ? 'bg-white/20 border border-white/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <button onClick={() => setActiveTab('plan')} className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'plan' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}><Sun size={16}/> Planer</button>
            <button onClick={() => setActiveTab('wishes')} className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'wishes' ? 'bg-white dark:bg-gray-700 shadow-sm text-orange-600 dark:text-orange-400' : 'text-gray-500'}`}><ChefHat size={16}/> Wünsche</button>
        </div>
      </div>

      <div className="p-4 pb-24">
         {activeTab === 'plan' ? renderPlan() : (
             <div className="animate-fade-in space-y-4 text-gray-800 dark:text-white">
                 <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-3xl">
                    <h3 className="text-lg font-bold text-orange-600 mb-4">Worauf hast du Hunger?</h3>
                    <form onSubmit={handleWishSubmit} className="flex gap-2">
                        <input type="text" value={newWish} onChange={(e) => setNewWish(e.target.value)} placeholder="Gericht eingeben..." className="flex-1 rounded-2xl p-3 text-sm outline-none bg-white dark:bg-gray-800 border-none shadow-inner" />
                        <button type="submit" className="bg-orange-500 text-white p-3 rounded-2xl hover:bg-orange-600 shadow-lg"><Plus size={20} /></button>
                    </form>
                 </div>
                 
                 <div className="space-y-3">
                     {requests.length === 0 && <p className="text-center text-gray-400 italic py-8">Noch keine Wünsche...</p>}
                     {requests.map(req => {
                         const requester = family.find(f => f.id === req.requestedBy);
                         return (
                            <div key={req.id} className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img src={requester?.avatar || ''} className="w-8 h-8 rounded-full border-2 border-orange-100" />
                                    <div>
                                        <p className="font-bold text-sm">{req.dishName}</p>
                                        <p className="text-[10px] text-gray-400">Von {requester?.name || 'Unbekannt'}</p>
                                    </div>
                                </div>
                                <button onClick={() => onDeleteRequest(req.id)} className="p-2 text-gray-300 hover:text-red-500 transition"><Trash2 size={18}/></button>
                            </div>
                         );
                     })}
                 </div>
             </div>
         )}
      </div>
    </>
  );
};

export default MealsPage;