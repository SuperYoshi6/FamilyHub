import React, { useState, useRef, useEffect } from 'react';
import Header from '../components/Header';
import SlidingTabs from '../components/SlidingTabs';
import { ShoppingItem, Task, FamilyMember, Recipe, TaskPriority } from '../types';
import { ShoppingCart, Home, User, BookOpen, ChevronUp, ChevronDown, Plus, Tag, CheckCircle2, Circle, Trash2, Flag, AlignLeft, Lock, Loader2, Calendar, Clock, Utensils, X, Coffee, Sun } from 'lucide-react';

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
    onToggleShopping, onAddShopping, onDeleteShopping, onAddHousehold, onToggleTask,
    onAddPersonal, onDeleteTask, onAddRecipe, onDeleteRecipe, onUpdateRecipe,
    onAddIngredientsToShopping, onAddMealToPlan, mealPlan, onProfileClick, liquidGlass
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
    const [newCategory, setNewCategory] = useState('Sonstiges');
    const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
    const [selectedAssignee, setSelectedAssignee] = useState<string>(family.length > 0 ? family[0].id : (currentUser?.id || ''));
    const [showExtendedForm, setShowExtendedForm] = useState(false);
    const [recipeLink, setRecipeLink] = useState('');
    const [isScraping, setIsScraping] = useState(false);
    const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
    const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());

    // Manual Recipe Form State
    const [showManualForm, setShowManualForm] = useState(false);
    const [planningRecipeId, setPlanningRecipeId] = useState<string | null>(null);
    const [planDay, setPlanDay] = useState<string>(new Date().toLocaleDateString('de-DE', { weekday: 'long' }));
    const [planSlot, setPlanSlot] = useState<'breakfast' | 'lunch' | 'main'>('main');
    const [manualName, setManualName] = useState('');
    const [manualDesc, setManualDesc] = useState('');
    const [manualImageUrl, setManualImageUrl] = useState('');
    const [manualIngredients, setManualIngredients] = useState<{ name: string, amount: string }[]>([{ name: '', amount: '' }]);

    const SHOPPING_CATEGORIES = [
        "Obst & Gemüse", "Fleisch & Fisch", "Molkereiprodukte",
        "Backwaren", "Vorratsschrank", "Getränke", "Haushalt", "Sonstiges"
    ];

    const tabs = [
        { id: 'shopping', label: 'Einkauf', icon: ShoppingCart },
        { id: 'recipes', label: 'Rezepte', icon: BookOpen },
        { id: 'household', label: 'Haushalt', icon: Home },
        { id: 'personal', label: 'Privat', icon: User }
    ];

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
        if (activeTab === 'shopping') onAddShopping(newItem.trim(), newNote.trim(), newCategory);
        else if (activeTab === 'household') onAddHousehold(newItem.trim(), selectedAssignee, newPriority, newNote.trim());
        else if (activeTab === 'personal') onAddPersonal(newItem.trim(), newPriority, newNote.trim());
        setNewItem(''); setNewNote('');
        setNewCategory('Sonstiges');
        setNewPriority('medium');
        setShowExtendedForm(false);
    };

    const renderPriority = (p?: TaskPriority) => {
        if (p === 'high') return <div className="w-2 h-2 rounded-full bg-red-500 mr-2 flex-shrink-0" title="Hoch"></div>;
        if (p === 'low') return <div className="w-2 h-2 rounded-full bg-blue-400 mr-2 flex-shrink-0" title="Niedrig"></div>;
        return null;
    };

    const handleAddRecipeByLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipeLink.trim() || isScraping) return;

        setIsScraping(true);
        try {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(recipeLink.trim())}`;
            const response = await fetch(proxyUrl);
            const html = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const jsonLdTags = doc.querySelectorAll('script[type="application/ld+json"]');

            let recipeData: any = null;

            jsonLdTags.forEach(tag => {
                try {
                    const parsed = JSON.parse(tag.innerHTML);
                    if (parsed['@type'] === 'Recipe') {
                        recipeData = parsed;
                    } else if (Array.isArray(parsed)) {
                        const found = parsed.find(i => i['@type'] === 'Recipe');
                        if (found) recipeData = found;
                    } else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
                        const found = parsed['@graph'].find((i: any) => i['@type'] === 'Recipe');
                        if (found) recipeData = found;
                    }
                } catch (e) { }
            });

            if (!recipeData) {
                // Fallback for Title at least
                const title = doc.querySelector('title')?.textContent || "Gescanntes Rezept";
                const fallbackRecipe: Recipe = {
                    id: Date.now().toString(),
                    name: title.split(' | ')[0].split(' - ')[0],
                    ingredients: [],
                    image: "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800",
                    description: "Konnte Metadaten nicht automatisch lesen. Bitte Details manuell ergänzen."
                };
                onAddRecipe(fallbackRecipe);
            } else {
                // Better Ingredient Parsing
                const parseIng = (s: string) => {
                    const parts = s.trim().split(/\s+/);
                    if (parts.length > 1) {
                        const maybeAmount = parts[0];
                        // If it starts with a number or is a common fraction indicator
                        if (/^[\d,./-]+/.test(maybeAmount) || ["etwas", "einige", "eine", "ein"].includes(maybeAmount.toLowerCase())) {
                            const secondPartIsUnit = parts.length > 2 && parts[1].length < 10;
                            if (secondPartIsUnit) {
                                return { amount: `${parts[0]} ${parts[1]}`, name: parts.slice(2).join(' ') };
                            }
                            return { amount: parts[0], name: parts.slice(1).join(' ') };
                        }
                    }
                    return { amount: '', name: s };
                };

                const ingredientsStrings = Array.isArray(recipeData.recipeIngredient) ? recipeData.recipeIngredient : [];
                const ingredients = ingredientsStrings.map((s: string) => parseIng(s));

                let descriptionView = "";
                const instructions = recipeData.recipeInstructions;
                if (typeof instructions === 'string') {
                    descriptionView = instructions;
                } else if (Array.isArray(instructions)) {
                    descriptionView = instructions
                        .map((step: any) => {
                            if (typeof step === 'string') return step;
                            if (step.text) return step.text;
                            if (step.itemListElement && Array.isArray(step.itemListElement)) {
                                return step.itemListElement.map((s: any) => s.text || s.name || "").join('\n');
                            }
                            return step.name || "";
                        })
                        .filter(s => !!s && s.toLowerCase() !== 'zubereitung')
                        .join('\n\n');
                }

                let source = "Internet";
                try {
                    source = new URL(recipeLink).hostname.replace('www.', '').split('.')[0];
                    source = source.charAt(0).toUpperCase() + source.slice(1);
                } catch (e) { }

                let imageUrl = "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800";
                if (recipeData.image) {
                    if (typeof recipeData.image === 'string') imageUrl = recipeData.image;
                    else if (Array.isArray(recipeData.image)) imageUrl = recipeData.image[0];
                    else if (recipeData.image.url) imageUrl = recipeData.image.url;
                }

                const finalRecipe: Recipe = {
                    id: Date.now().toString(),
                    name: recipeData.name || "Gescanntes Rezept",
                    ingredients,
                    image: imageUrl,
                    description: descriptionView || "Keine Anleitung gefunden.",
                    source,
                    url: recipeLink.trim()
                };
                onAddRecipe(finalRecipe);
            }
            setRecipeLink('');
        } catch (err) {
            console.error("Scraping failed:", err);
            alert("Konnte das Rezept nicht laden. Prüfe die URL oder trage es manuell ein.");
        } finally {
            setIsScraping(false);
        }
    };

    const handleManualRecipeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualName.trim()) return;

        const newRecipe: Recipe = {
            id: Date.now().toString(),
            name: manualName,
            ingredients: manualIngredients.filter(i => i.name.trim()),
            image: manualImageUrl || undefined,
            description: manualDesc,
            source: 'Manuell'
        };

        onAddRecipe(newRecipe);
        setManualName('');
        setManualDesc('');
        setManualImageUrl('');
        setManualIngredients([{ name: '', amount: '' }]);
        setShowManualForm(false);
    };

    const addIngredientRow = () => {
        setManualIngredients([...manualIngredients, { name: '', amount: '' }]);
    };

    const updateIngredient = (index: number, field: 'name' | 'amount', value: string) => {
        const next = [...manualIngredients];
        next[index][field] = value;
        setManualIngredients(next);
    };

    const removeIngredient = (index: number) => {
        setManualIngredients(manualIngredients.filter((_, i) => i !== index));
    };

    const renderShoppingList = () => {
        const grouped: Record<string, ShoppingItem[]> = {};
        shoppingItems.forEach(item => {
            const cat = item.category || 'Sonstiges';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(item);
        });

        const categories = Object.keys(grouped).sort((a, b) => {
            if (a === 'Sonstiges') return 1;
            if (b === 'Sonstiges') return -1;
            return a.localeCompare(b);
        });

        return (
            <div className="space-y-6">
                {categories.map(cat => (
                    <div key={cat} className="space-y-2">
                        <h4 className="text-[10px] font-extrabold uppercase text-gray-400 ml-2 tracking-wider flex items-center">
                            <Tag size={10} className="mr-1" /> {cat}
                        </h4>
                        <div className="space-y-2">
                            {grouped[cat].map(item => (
                                <div key={item.id} className={`flex items-start justify-between p-3 rounded-xl border transition-all bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700 ${item.checked ? 'opacity-60' : ''}`} onClick={() => onToggleShopping(item.id)}>
                                    <div className="flex items-start space-x-3 overflow-hidden w-full">
                                        <div className="mt-0.5">{item.checked ? <CheckCircle2 className="text-gray-400" size={20} /> : <Circle className="text-orange-500" size={20} />}</div>
                                        <div className="flex-1">
                                            <span className={`block text-sm font-medium ${item.checked ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{item.name}</span>
                                            {item.note && <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">{item.note}</p>}
                                        </div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); onDeleteShopping(item.id) }} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {shoppingItems.length === 0 && <p className="text-center text-gray-400 mt-8">Liste ist leer</p>}
            </div>
        );
    };

    const renderTaskList = (tasks: Task[], type: 'household' | 'personal') => {
        let visibleTasks = tasks;
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const sorted = [...visibleTasks].sort((a, b) => {
            if (a.done !== b.done) return Number(a.done) - Number(b.done);
            return (priorityWeight[b.priority || 'medium'] || 2) - (priorityWeight[a.priority || 'medium'] || 2);
        });

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sorted.map(task => {
                    const assignee = family.find(f => f.id === task.assignedTo);
                    const isReadOnly = false;

                    return (
                        <div key={task.id} className={`flex flex-col p-3 rounded-xl border relative overflow-hidden transition-all ${task.done ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 opacity-60' : `bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${liquidGlass ? 'shadow-none' : 'shadow-sm'}`}`}>
                            <div className="flex items-start justify-between mb-1">
                                <div className={`flex items-center w-full ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`} onClick={() => !isReadOnly && onToggleTask(task.id, type)}>
                                    {task.done ? <CheckCircle2 className="text-green-500 mr-2 flex-shrink-0" size={20} /> : <Circle className={`mr-2 flex-shrink-0 ${type === 'household' ? 'text-blue-500' : 'text-purple-500'} ${isReadOnly ? 'opacity-50' : ''}`} size={20} />}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center">
                                            {!task.done && renderPriority(task.priority)}
                                            <span className={`text-sm font-medium line-clamp-2 leading-tight ${task.done ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}>{task.title}</span>
                                        </div>
                                    </div>
                                </div>
                                {(type === 'personal' || currentUser.role === 'parent') && (
                                    <button onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id, type) }} className="text-gray-300 hover:text-red-400 p-1 -mr-1 -mt-1"><Trash2 size={16} /></button>
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
                    )
                })}
                {sorted.length === 0 && <div className="text-center py-8 col-span-full"><p className="text-gray-400">Keine Aufgaben vorhanden.</p></div>}
            </div>
        );
    };

    const renderRecipes = () => (
        <div className="space-y-4">
            <div className="px-1">
                <SlidingTabs
                    tabs={[
                        { id: 'link', label: 'Link' },
                        { id: 'manual', label: 'Manuell' }
                    ]}
                    activeTabId={showManualForm ? 'manual' : 'link'}
                    onTabChange={(id) => setShowManualForm(id === 'manual')}
                    liquidGlass={liquidGlass}
                />
            </div>

            {!showManualForm ? (
                <form onSubmit={handleAddRecipeByLink} className={`p-4 rounded-xl border flex gap-2 items-center bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700`}>
                    <input
                        type="url"
                        value={recipeLink}
                        onChange={(e) => setRecipeLink(e.target.value)}
                        placeholder="Rezept-Link einfügen"
                        className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm placeholder:truncate"
                    />
                    <button
                        type="submit"
                        disabled={!recipeLink.trim() || isScraping}
                        className="flex-shrink-0 bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1 shadow-sm whitespace-nowrap"
                    >
                        {isScraping ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Hinzufügen
                    </button>
                </form>
            ) : (
                <form onSubmit={handleManualRecipeSubmit} className="p-4 rounded-xl border bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700 space-y-4 animate-slide-in">
                    <input
                        type="text"
                        placeholder="Name des Gerichts"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        className="w-full bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm outline-none border border-gray-100 dark:border-gray-600 focus:ring-1 focus:ring-orange-400"
                        required
                    />

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Zutaten</label>
                        {manualIngredients.map((ing, idx) => (
                            <div key={idx} className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Menge (z.B. 500g)"
                                    value={ing.amount}
                                    onChange={(e) => updateIngredient(idx, 'amount', e.target.value)}
                                    className="w-24 bg-white dark:bg-gray-700 rounded-lg px-2 py-1.5 text-xs outline-none border border-gray-100 dark:border-gray-600"
                                />
                                <input
                                    type="text"
                                    placeholder="Zutat"
                                    value={ing.name}
                                    onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                                    className="flex-1 bg-white dark:bg-gray-700 rounded-lg px-2 py-1.5 text-xs outline-none border border-gray-100 dark:border-gray-600"
                                />
                                {manualIngredients.length > 1 && (
                                    <button type="button" onClick={() => removeIngredient(idx)} className="text-red-400 p-1"><Trash2 size={14} /></button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={addIngredientRow} className="text-[10px] font-bold text-orange-500 flex items-center gap-1 mt-1 hover:underline">
                            <Plus size={12} /> Zutat hinzufügen
                        </button>
                    </div>

                    <textarea
                        placeholder="Zubereitung..."
                        value={manualDesc}
                        onChange={(e) => setManualDesc(e.target.value)}
                        className="w-full bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm outline-none border border-gray-100 dark:border-gray-600 focus:ring-1 focus:ring-orange-400 min-h-[80px]"
                    />

                    <input
                        type="url"
                        placeholder="Bild-URL (optional)"
                        value={manualImageUrl}
                        onChange={(e) => setManualImageUrl(e.target.value)}
                        className="w-full bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm outline-none border border-gray-100 dark:border-gray-600"
                    />

                    <button type="submit" disabled={!manualName.trim()} className="w-full bg-orange-500 text-white font-bold py-2.5 rounded-xl shadow-md active:scale-95 transition disabled:opacity-50">
                        Speichern
                    </button>
                </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(recipes || []).map(recipe => {
                    const isExpanded = expandedRecipeId === recipe.id;
                    const formatIng = (ing: any) => {
                        if (typeof ing === 'string') {
                            if (ing.startsWith('{')) {
                                try {
                                    const obj = JSON.parse(ing);
                                    return `${obj.amount || ''} ${obj.name || ''}`.trim();
                                } catch (e) { return ing; }
                            }
                            return ing;
                        }
                        return `${ing.amount || ''} ${ing.name || ''}`.trim();
                    };
                    const ingredientList = recipe.ingredients.map(ing => formatIng(ing));

                    return (
                        <div key={recipe.id} className={`rounded-xl overflow-hidden border flex flex-col bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700`}>
                            {recipe.image && <img src={recipe.image} className="w-full h-32 object-cover cursor-pointer" onClick={() => {
                                if (isExpanded) {
                                    setExpandedRecipeId(null);
                                } else {
                                    setExpandedRecipeId(recipe.id);
                                    setSelectedIngredients(new Set(ingredientList));
                                }
                            }} />}
                            <div className="p-3 flex-1 flex flex-col">
                                <h4
                                    className="font-bold text-sm mb-1 text-gray-800 dark:text-white cursor-pointer hover:text-orange-500 transition-colors flex justify-between items-center"
                                    onClick={() => {
                                        if (isExpanded) {
                                            setExpandedRecipeId(null);
                                        } else {
                                            setExpandedRecipeId(recipe.id);
                                            setSelectedIngredients(new Set(ingredientList));
                                        }
                                    }}
                                >
                                    {recipe.name}
                                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                </h4>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded uppercase font-bold">
                                        {recipe.source || 'Rezept'}
                                    </span>
                                    <span className="text-[10px] text-gray-400">{recipe.ingredients.length} Zutaten</span>
                                </div>

                                {isExpanded && (
                                    <div className="mt-2 mb-4 animate-fade-in border-t border-gray-100 dark:border-gray-700 pt-2">
                                        {recipe.description && (
                                            <div className="mb-4">
                                                <div className="flex justify-between items-center mb-1">
                                                    <h5 className="text-[10px] font-bold uppercase text-gray-400">Zubereitung</h5>
                                                    {recipe.url && (
                                                        <a
                                                            href={recipe.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] text-blue-500 flex items-center gap-1 hover:underline"
                                                        >
                                                            Original anzeigen <AlignLeft size={10} />
                                                        </a>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">{recipe.description}</p>
                                            </div>
                                        )}

                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <h5 className="text-[10px] font-bold uppercase text-gray-400">Zutaten ({selectedIngredients.size}/{recipe.ingredients.length})</h5>
                                                <button
                                                    className="text-[10px] text-blue-500 hover:underline"
                                                    onClick={() => {
                                                        if (selectedIngredients.size === recipe.ingredients.length) {
                                                            setSelectedIngredients(new Set());
                                                        } else {
                                                            setSelectedIngredients(new Set(ingredientList));
                                                        }
                                                    }}
                                                >
                                                    {selectedIngredients.size === recipe.ingredients.length ? 'Keine' : 'Alle'}
                                                </button>
                                            </div>
                                            <ul className="space-y-1 mt-1 max-h-40 overflow-y-auto custom-scrollbar">
                                                {ingredientList.map((ing, idx) => (
                                                    <li key={idx} className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                                                        <label className="flex items-center gap-2 cursor-pointer w-full hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded-md transition-colors">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded text-orange-500 focus:ring-orange-500 bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                                                                checked={selectedIngredients.has(ing)}
                                                                onChange={() => {
                                                                    const next = new Set(selectedIngredients);
                                                                    if (next.has(ing)) next.delete(ing);
                                                                    else next.add(ing);
                                                                    setSelectedIngredients(next);
                                                                }}
                                                            />
                                                            <span>{ing}</span>
                                                        </label>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-auto flex justify-between items-center pt-2">
                                    {isExpanded ? (
                                        <button
                                            onClick={() => {
                                                onAddIngredientsToShopping(Array.from(selectedIngredients));
                                                setExpandedRecipeId(null);
                                            }}
                                            disabled={selectedIngredients.size === 0}
                                            className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-orange-600 transition-colors shadow-sm disabled:opacity-50 disabled:shadow-none"
                                        >
                                            <ShoppingCart size={14} /> Auf die Einkaufsliste setzen
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onAddIngredientsToShopping(ingredientList)}
                                            className="text-[10px] bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-1 rounded-md font-bold flex items-center gap-1 hover:bg-orange-200 transition-colors"
                                        >
                                            <ShoppingCart size={10} /> +Alle ({recipe.ingredients.length})
                                        </button>
                                    )}

                                    {currentUser.role !== 'child' && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setPlanningRecipeId(recipe.id);
                                                    setPlanSlot('main');
                                                }}
                                                className="text-[10px] bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-md font-bold flex items-center gap-1 hover:bg-blue-200 transition-colors"
                                            >
                                                <Calendar size={10} /> Planen
                                            </button>

                                            <button onClick={() => onDeleteRecipe(recipe.id)} className="text-[10px] text-red-400 hover:text-red-500 p-1">Löschen</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
                {recipes.length === 0 && <div className="text-center text-gray-400 col-span-full py-8">Keine Rezepte.</div>}
            </div>
        </div>
    );

    const canAddHousehold = activeTab === 'household' && currentUser.role === 'parent';
    const showAddForm = (activeTab !== 'household' && activeTab !== 'recipes') || canAddHousehold;

    return (
        <main className="p-0 pb-24">
            {/* Header / Tabs Section (Sticky) */}
            <div className={`sticky top-0 z-40 transition-all duration-500 ${liquidGlass ? 'backdrop-blur-xl bg-white/5 border-b border-white/20' : ''}`}>
                <Header title="Listen" currentUser={currentUser} onProfileClick={onProfileClick} liquidGlass={liquidGlass} />

                <div className="px-4 pb-4">
                    <SlidingTabs
                        tabs={tabs}
                        activeTabId={activeTab}
                        onTabChange={(id) => setActiveTab(id as TabType)}
                        liquidGlass={liquidGlass}
                        className="w-full"
                    />
                </div>
            </div>

            <div className="p-4 min-h-[calc(100vh-96px)]">
                {/* Add Form */}
                {showAddForm && (
                    <div className={`mb-6 p-3 rounded-2xl border animate-slide-in ${liquidGlass ? 'bg-white/10 shadow-none' : 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700 shadow-sm'}`}>
                        <form onSubmit={handleSubmit}>
                            <div className="flex items-center gap-2 p-1 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl border border-transparent focus-within:border-orange-500/30 dark:focus-within:border-orange-400/30 transition-all">
                                <input
                                    type="text"
                                    value={newItem}
                                    onChange={(e) => setNewItem(e.target.value)}
                                    placeholder={activeTab === 'shopping' ? "Was fehlt?" : "Neue Aufgabe..."}
                                    className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 dark:text-white placeholder-gray-400 px-3 py-2 min-w-0"
                                />
                                <div className="flex items-center gap-1 pr-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowExtendedForm(!showExtendedForm)}
                                        className={`p-2 rounded-lg transition-colors ${showExtendedForm ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                    >
                                        {showExtendedForm ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!newItem.trim()}
                                        className={`p-2 rounded-lg text-white transition-all shadow-sm active:scale-95 ${newItem.trim() ? (activeTab === 'shopping' ? 'bg-orange-500 hover:bg-orange-600' : activeTab === 'household' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-purple-500 hover:bg-purple-600') : 'bg-gray-300 dark:bg-gray-600'}`}
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>
                            {showExtendedForm && (
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <AlignLeft size={16} className="text-gray-400" />
                                        <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Notiz..." className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-white outline-none" />
                                    </div>

                                    {activeTab === 'shopping' && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Kategorie</label>
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {SHOPPING_CATEGORIES.map(cat => (
                                                    <button
                                                        key={cat}
                                                        type="button"
                                                        onClick={() => setNewCategory(cat)}
                                                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition ${newCategory === cat ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

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
                    <div className={`mb-6 p-4 rounded-xl border flex items-center justify-center text-gray-400 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700`}>
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

            {/* Planning Modal */}
            {planningRecipeId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className={`${liquidGlass ? 'liquid-shimmer-card' : 'bg-white dark:bg-gray-800 shadow-2xl'} w-full max-w-sm rounded-[32px] overflow-hidden border border-gray-100 dark:border-gray-700 animate-scale-in`}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <Calendar className="text-blue-500" /> Gericht planen
                                </h3>
                                <button onClick={() => setPlanningRecipeId(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Wochentag wählen</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'].map(d => (
                                            <button
                                                key={d}
                                                onClick={() => setPlanDay(d)}
                                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${planDay === d ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200'}`}
                                            >
                                                {d.substring(0, 2)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Mahlzeit wählen</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'breakfast', label: 'Frühstück', icon: Coffee },
                                            { id: 'lunch', label: 'Mittag', icon: Sun },
                                            { id: 'main', label: 'Abend', icon: Utensils }
                                        ].map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => setPlanSlot(s.id as any)}
                                                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${planSlot === s.id ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10 text-orange-600' : 'border-gray-100 dark:border-gray-700 bg-transparent text-gray-400'}`}
                                            >
                                                <s.icon size={18} />
                                                <span className="text-[10px] font-bold">{s.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        const r = recipes.find(x => x.id === planningRecipeId);
                                        if (r) {
                                            const formattedIngs = r.ingredients.map(ing => typeof ing === 'string' ? ing : `${ing.amount} ${ing.name}`.trim());
                                            onAddMealToPlan(planDay, r.name, formattedIngs, planSlot);
                                            setPlanningRecipeId(null);
                                        }
                                    }}
                                    className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl active:scale-95 transition-all mt-4 ${liquidGlass ? 'shadow-none' : 'shadow-xl shadow-blue-500/20'}`}
                                >
                                    Im Plan speichern
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default ListsPage;