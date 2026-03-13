import React, { useState, useRef, useEffect } from 'react';
import Header from '../components/Header';
import { ShoppingItem, Task, FamilyMember, Recipe, TaskPriority } from '../types';
import { ShoppingCart, Home, User, BookOpen, ChevronUp, ChevronDown, Plus, X, Tag, CheckCircle2, Circle, Trash2, Camera, Loader2, Flag, AlignLeft, Lock } from 'lucide-react';

interface ListsPageProps {
  shoppingItems: ShoppingItem[];
  householdTasks: Task[];
  personalTasks: Task[];
  recipes: Recipe[];
  family: FamilyMember[];
  currentUser: FamilyMember;
  onToggleShopping: (id: string) => void;
  onAddShopping: (name: string, note?: string, category?: string) => void;
  onDeleteShopping: (id: string) => void;
  onAddHousehold: (title: string, assignedTo: string, priority: TaskPriority, note?: string) => void;
  onToggleTask: (id: string, type: 'household' | 'personal') => void;
  onAddPersonal: (title: string, priority: TaskPriority, note?: string) => void;
  onDeleteTask: (id: string, type: 'household' | 'personal') => void;
  onAddRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (id: string) => void;
  onUpdateRecipe?: (id: string, updates: Partial<Recipe>) => void;
  onAddIngredientsToShopping: (ingredients: string[]) => void;
  onAddMealToPlan: (day: string, mealName: string, ingredients: string[]) => void;
  onProfileClick: () => void;
  liquidGlass?: boolean;
}

type TabType = 'shopping' | 'household' | 'personal' | 'recipes';

const ListsPage: React.FC<ListsPageProps> = ({ 
  shoppingItems, householdTasks, personalTasks, recipes, family, currentUser,
  onToggleShopping, onAddShopping, onDeleteShopping, onAddHousehold, onToggleTask, onAddPersonal, onDeleteTask, onAddRecipe, onDeleteRecipe,
  onProfileClick, liquidGlass = false
}) => {
  // Tab State with Persistence
  const [activeTab, setActiveTab] = useState<TabType>(() => {
      const saved = localStorage.getItem('fh_lists_tab');
      if (saved === 'shopping' || saved === 'household' || saved === 'personal' || saved === 'recipes') {
          return saved;
      }
      return 'household';
  });

  useEffect(() => {
      localStorage.setItem('fh_lists_tab', activeTab);
  }, [activeTab]);

  const [newItem, setNewItem] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [selectedAssignee, setSelectedAssignee] = useState<string>(family.length > 0 ? family[0].id : (currentUser?.id || ''));
  const [showExtendedForm, setShowExtendedForm] = useState(false);
  
  // Recipe State
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const getTabContainerClass = () => liquidGlass ? "liquid-shimmer-card border-white/40 p-1 rounded-xl w-full shadow-inner relative flex" : "bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full shadow-inner flex";
  const getSliderClass = () => "absolute top-1 bottom-1 rounded-lg z-0 transition-all duration-300 ease-in-out";
  const getSliderInnerClass = () => liquidGlass ? "w-full h-full rounded-lg bg-white/40 dark:bg-white/20 backdrop-blur-md border border-white/40 shadow-sm" : "";

  const tabs = [
      { id: 'shopping', label: 'Einkauf', icon: ShoppingCart },
      { id: 'recipes', label: 'Rezepte', icon: BookOpen },
      { id: 'household', label: 'Haushalt', icon: Home },
      { id: 'personal', label: 'Privat', icon: User }
  ];

  const activeIndex = tabs.findIndex(t => t.id === activeTab);
  const widthPercent = 100 / tabs.length;

  useEffect(() => {
    if (family.length > 0 && !family.find(f => f.id === selectedAssignee)) {
        setSelectedAssignee(family[0].id);
    } else if (family.length === 0 && selectedAssignee !== currentUser.id) {
        setSelectedAssignee(currentUser.id);
    }
  }, [family, currentUser.id, selectedAssignee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    if (activeTab === 'shopping') onAddShopping(newItem.trim(), newNote.trim());
    else if (activeTab === 'household') onAddHousehold(newItem.trim(), selectedAssignee, newPriority, newNote.trim());
    else if (activeTab === 'personal') onAddPersonal(newItem.trim(), newPriority, newNote.trim());
    setNewItem(''); setNewNote('');
    setNewPriority('medium');
    setShowExtendedForm(false);
  };

  const renderPriority = (p?: TaskPriority) => {
      if (p === 'high') return <div className="w-2 h-2 rounded-full bg-red-500 mr-2 flex-shrink-0" title="Hoch"></div>;
      if (p === 'low') return <div className="w-2 h-2 rounded-full bg-blue-400 mr-2 flex-shrink-0" title="Niedrig"></div>;
      return null;
  };

  const renderShoppingList = () => (
      <div className="space-y-3">
          {shoppingItems.map(item => (
              <div key={item.id} className={`flex items-start justify-between p-3 rounded-xl border ${liquidGlass ? 'liquid-shimmer-card border-white/40' : 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700'} ${item.checked ? 'opacity-60' : ''}`} onClick={() => onToggleShopping(item.id)}>
                  <div className="flex items-start space-x-3 overflow-hidden w-full">
                      <div className="mt-0.5">{item.checked ? <CheckCircle2 className="text-gray-400" size={20}/> : <Circle className="text-orange-500" size={20}/>}</div>
                      <div className="flex-1">
                          <span className={`block text-sm font-medium ${item.checked ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{item.name}</span>
                          {item.note && <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">{item.note}</p>}
                      </div>
                  </div>
                  <button onClick={(e) => {e.stopPropagation(); onDeleteShopping(item.id)}} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={16}/></button>
              </div>
          ))}
          {shoppingItems.length === 0 && <p className="text-center text-gray-400 mt-8">Liste ist leer</p>}
      </div>
  );

  const renderTaskList = (tasks: Task[], type: 'household'|'personal') => {
      let visibleTasks = tasks;
      if (type === 'household' && currentUser.role === 'child') {
          visibleTasks = tasks.filter(t => t.assignedTo === currentUser.id);
      }
      
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const sorted = [...visibleTasks].sort((a, b) => {
          if (a.done !== b.done) return Number(a.done) - Number(b.done);
          return (priorityWeight[b.priority || 'medium'] || 2) - (priorityWeight[a.priority || 'medium'] || 2);
      });

      return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sorted.map(task => {
              const assignee = family.find(f => f.id === task.assignedTo);
              const isReadOnly = type === 'household' && currentUser.role === 'child';

              return (
              <div key={task.id} className={`flex flex-col p-3 rounded-xl border relative overflow-hidden transition-all ${liquidGlass ? 'liquid-shimmer-card border-white/40' : (task.done ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 opacity-60' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm')}`}>
                  <div className="flex items-start justify-between mb-1">
                      <div className={`flex items-center w-full ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`} onClick={() => !isReadOnly && onToggleTask(task.id, type)}>
                          {task.done ? <CheckCircle2 className="text-green-500 mr-2 flex-shrink-0" size={20}/> : <Circle className={`mr-2 flex-shrink-0 ${type==='household'?'text-blue-500':'text-purple-500'} ${isReadOnly ? 'opacity-50' : ''}`} size={20}/>}
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center">
                                  {!task.done && renderPriority(task.priority)}
                                  <span className={`text-sm font-medium line-clamp-2 leading-tight ${task.done ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}>{task.title}</span>
                              </div>
                          </div>
                      </div>
                      {(type === 'personal' || currentUser.role === 'parent') && (
                          <button onClick={(e) => {e.stopPropagation(); onDeleteTask(task.id, type)}} className="text-gray-300 hover:text-red-400 p-1 -mr-1 -mt-1"><Trash2 size={16}/></button>
                      )}
                  </div>
                  <div className={`pl-7 ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`} onClick={() => !isReadOnly && onToggleTask(task.id, type)}>
                      {task.note && <p className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-1.5 rounded-md mb-2">{task.note}</p>}
                      {type === 'household' && assignee && !task.done && (
                         <div className="flex items-center pt-1">
                            <img src={assignee.avatar} className="w-4 h-4 rounded-full border border-gray-200 dark:border-gray-700 mr-1.5" />
                            <span className={`text-[10px] font-bold ${assignee.color.replace('bg-', 'text-').split(' ')[1]}`}>{assignee.name}</span>
                         </div>
                      )}
                  </div>
              </div>
          )})}
          {sorted.length === 0 && <div className="text-center py-8 col-span-full"><p className="text-gray-400">Keine Aufgaben vorhanden.</p></div>}
      </div>
      );
  };

  const renderRecipes = () => (
      <div className="grid grid-cols-2 gap-3">
          {recipes.map(recipe => (
              <div key={recipe.id} className={`rounded-xl overflow-hidden border ${liquidGlass ? 'liquid-shimmer-card border-white/40' : 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700'}`}>
                  {recipe.image && <img src={recipe.image} className="w-full h-24 object-cover" />}
                  <div className="p-3">
                      <h4 className="font-bold text-sm mb-1 text-gray-800 dark:text-white line-clamp-1">{recipe.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{recipe.ingredients.length} Zutaten</p>
                      <button onClick={() => onDeleteRecipe(recipe.id)} className="text-xs text-red-400 hover:text-red-500">Löschen</button>
                  </div>
              </div>
          ))}
          {recipes.length === 0 && <div className="text-center text-gray-400 col-span-full py-8">Keine Rezepte.</div>}
      </div>
  );

  const canAddHousehold = activeTab === 'household' && currentUser.role === 'parent';
  const showAddForm = (activeTab !== 'household' && activeTab !== 'recipes') || canAddHousehold;

  return (
    <>
      <Header title="Listen" currentUser={currentUser} onProfileClick={onProfileClick} liquidGlass={liquidGlass} />
      
      <div className="px-4 mt-2">
        <div className={getTabContainerClass()}>
          {liquidGlass && (<div className={getSliderClass()} style={{ left: `${activeIndex * widthPercent}%`, width: `${widthPercent}%` }}><div className={getSliderInnerClass()} /></div>)}
          {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              let btnClass = liquidGlass ? (isActive ? "text-slate-900 dark:text-white font-extrabold" : "text-gray-500 dark:text-gray-400") : (isActive ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400");
              return (<button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`flex-1 py-2 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center space-x-1 transition-all z-10 ${btnClass}`}><tab.icon size={14} className="flex-shrink-0" /> <span className="truncate">{tab.label}</span></button>);
          })}
        </div>
      </div>

      <div className="p-4 pb-24">
        {/* Add Form */}
        {showAddForm && (
            <div className={`mb-6 p-3 rounded-2xl shadow-sm border animate-slide-in ${liquidGlass ? 'liquid-shimmer-card border-white/40' : 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700'}`}>
                <form onSubmit={handleSubmit}>
                    <div className="flex items-center gap-2">
                        <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder={activeTab === 'shopping' ? "Was fehlt?" : "Neue Aufgabe..."} className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 dark:text-white placeholder-gray-400 px-2" />
                        <button type="button" onClick={() => setShowExtendedForm(!showExtendedForm)} className={`p-2 rounded-full transition ${showExtendedForm ? 'bg-black/5 dark:bg-white/10 text-gray-800 dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}>{showExtendedForm ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
                        <button type="submit" disabled={!newItem.trim()} className={`p-2 rounded-xl text-white transition shadow-sm ${newItem.trim() ? (activeTab === 'shopping' ? 'bg-orange-500' : activeTab === 'household' ? 'bg-blue-500' : 'bg-purple-500') : 'bg-gray-300 dark:bg-gray-600'}`}><Plus size={20}/></button>
                    </div>
                    {showExtendedForm && (
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
                            <div className="flex items-center space-x-2">
                                <AlignLeft size={16} className="text-gray-400" />
                                <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Notiz..." className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-white outline-none" />
                            </div>
                            {activeTab !== 'shopping' && (
                                <div className="flex items-center space-x-2">
                                    <Flag size={16} className="text-gray-400" />
                                    <div className="flex space-x-2">
                                        <button type="button" onClick={() => setNewPriority('high')} className={`px-3 py-1 rounded-full text-xs font-bold border transition ${newPriority === 'high' ? 'bg-red-100 text-red-600 border-red-200' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500'}`}>Hoch</button>
                                        <button type="button" onClick={() => setNewPriority('medium')} className={`px-3 py-1 rounded-full text-xs font-bold border transition ${newPriority === 'medium' ? 'bg-gray-200 text-gray-700 border-gray-300' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500'}`}>Mittel</button>
                                        <button type="button" onClick={() => setNewPriority('low')} className={`px-3 py-1 rounded-full text-xs font-bold border transition ${newPriority === 'low' ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500'}`}>Niedrig</button>
                                    </div>
                                </div>
                            )}
                            {activeTab === 'household' && (
                                <div className="flex space-x-2 pt-1 overflow-x-auto px-1">
                                    {family.length > 0 ? family.map(member => (
                                        <button key={member.id} type="button" onClick={() => setSelectedAssignee(member.id)} className={`flex items-center space-x-1 px-2 py-1 rounded-full text-[10px] font-bold border transition ${selectedAssignee === member.id ? `${member.color} border-transparent ring-1 ring-offset-1 ring-gray-300 dark:ring-gray-600` : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
                                            <img src={member.avatar} className="w-4 h-4 rounded-full" /><span>{member.name}</span>
                                        </button>
                                    )) : <span className="text-xs text-gray-400">Keine Mitglieder</span>}
                                </div>
                            )}
                        </div>
                    )}
                </form>
            </div>
        )}

        {!showAddForm && activeTab !== 'recipes' && (
            <div className={`mb-6 p-4 rounded-xl border flex items-center justify-center text-gray-400 text-sm ${liquidGlass ? 'bg-white/20 border-white/20' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                <Lock size={16} className="mr-2" />
                Nur Eltern können Hausarbeiten hinzufügen.
            </div>
        )}

        <div className="animate-fade-in">
          {activeTab === 'shopping' && renderShoppingList()}
          {activeTab === 'recipes' && renderRecipes()}
          {activeTab === 'household' && renderTaskList(householdTasks, 'household')}
          {activeTab === 'personal' && renderTaskList(personalTasks, 'personal')}
        </div>
      </div>
    </>
  );
};

export default ListsPage;