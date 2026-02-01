import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import type { Plan, Recipe } from '@/src/lib/supabase';
import { weatherCodeToEmoji } from '@/src/utils/utils';

type WeatherDay = {
    high: number;
    low: number;
    emoji: string;
};

function formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

type Props = {
    plans: Plan[];
    recipes: Recipe[];
    onDropRecipe: (date: string, recipeId: string) => void;
    onRemovePlan: (plan: Plan) => void;
    isDragging: boolean;
    onWeekOffsetChange?: (offset: number) => void;
}

const emptyPlanMsgs = [
    "our feelings",
    "our words",
    "braaaains",
    "scrounging",
    "scavenging",
    "who knows",
    "something",
    "food",
]

export function WeeklyPlan({ plans, recipes, onDropRecipe, onRemovePlan, isDragging, onWeekOffsetChange }: Props): React.ReactElement {
    const [dragOverDate, setDragOverDate] = useState<string | null>(null);
    const [spinningDates, setSpinningDates] = useState<Record<string, string>>({});
    const [weekOffset, setWeekOffset] = useState(0);
    const [weather, setWeather] = useState<Record<string, WeatherDay>>({});

    const location = { lat: 39.1653, lng: -86.5264 }; // Bloomington, IN

    const now = new Date();
    const sunday = new Date(now);
    const dayOfWeek = sunday.getDay();
    const daysToSunday = dayOfWeek;
    sunday.setDate(sunday.getDate() - daysToSunday + weekOffset * 7);
    sunday.setHours(0, 0, 0, 0);

    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    const startDate = formatDateKey(sunday);
    const endDate = formatDateKey(saturday);

    // Fetch weather (with DB caching) when dates change
    useEffect(() => {
        const fetchWeather = async () => {
            try {
                const res = await fetch(
                    `/api/weather?startDate=${startDate}&endDate=${endDate}&lat=${location.lat}&lng=${location.lng}`
                );
                const data = await res.json();
                const days: Record<string, WeatherDay> = {};
                for (const [date, entry] of Object.entries(data)) {
                    const w = entry as { high: number; low: number; weather_code: number };
                    days[date] = {
                        high: w.high,
                        low: w.low,
                        emoji: weatherCodeToEmoji(w.weather_code),
                    };
                }
                setWeather(days);
            } catch {
                // silently fail — weather is non-critical
            }
        };

        fetchWeather();
    }, [startDate, endDate]);

    console.log(sunday);

    const daysOfTheWeek = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(sunday);
        date.setDate(sunday.getDate() + i);
        const dateKey = formatDateKey(date);
        return {
            dateKey,
            longDisplay: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            shortDisplay: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            label: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][i],
            isToday: formatDateKey(now) === dateKey,
        };
    });

    const plansByDate: Record<string, Plan> = {};
    for (const plan of plans) {
        plansByDate[plan.date] = plan;
    }

    const handleDragOver = (e: React.DragEvent, dateKey: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDragOverDate(dateKey);
    };

    const handleDragLeave = () => {
        setDragOverDate(null);
    };

    const handleDrop = (e: React.DragEvent, dateKey: string) => {
        e.preventDefault();
        setDragOverDate(null);
        const recipeId = e.dataTransfer.getData('recipeId');
        if (recipeId) {
            onDropRecipe(dateKey, recipeId);
        }
    };

    const handleSpin = (dateKey: string) => {
        if (recipes.length === 0 || spinningDates[dateKey]) return;

        // Get recipe IDs already planned for this week
        const usedRecipeIds = new Set(
            daysOfTheWeek
                .map(day => plansByDate[day.dateKey]?.recipe?.id)
                .filter(Boolean)
        );

        // Filter out already-used recipes
        const availableRecipes = recipes.filter(r => !usedRecipeIds.has(r.id));
        const recipesToPickFrom = availableRecipes.length > 0 ? availableRecipes : recipes;

        setSpinningDates(prev => ({ ...prev, [dateKey]: '' }));

        const finalIndex = Math.floor(Math.random() * recipesToPickFrom.length);
        const finalRecipe = recipesToPickFrom[finalIndex];

        let currentIndex = 0;
        let spinCount = 0;
        const totalSpins = 20;
        const baseDelay = 20;

        const spin = () => {
            if (spinCount >= totalSpins) {
                setSpinningDates(prev => {
                    const next = { ...prev };
                    delete next[dateKey];
                    return next;
                });
                onDropRecipe(dateKey, finalRecipe.id);
                return;
            }

            setSpinningDates(prev => ({ ...prev, [dateKey]: recipes[currentIndex].name }));
            currentIndex = (currentIndex + 1) % recipes.length;
            spinCount++;

            const delay = baseDelay + (spinCount / totalSpins) * 200;
            setTimeout(spin, delay);
        };

        spin();
    };

    const emptyPlanMsgsThisWeek = useMemo(
        () => Array.from({ length: 7 }, () => emptyPlanMsgs[Math.floor(Math.random() * emptyPlanMsgs.length)]),
        [weekOffset]
    );

    const handleUseLastWeek = useCallback((dateKey: string) => {
        if (plansByDate[dateKey]) return;
        const planDate = new Date(dateKey);
        planDate.setDate(planDate.getDate() - 7);
        const lastWeek = planDate.toISOString().split('T')[0];
        const planFromLastWeek = plansByDate[lastWeek];

        if (planFromLastWeek?.recipe) {
            onDropRecipe(dateKey, planFromLastWeek.recipe.id);
        }
    }, [plansByDate, onDropRecipe]);

    return <div className="mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
            <button onClick={() => { const next = weekOffset - 1; setWeekOffset(next); onWeekOffsetChange?.(next); }} className="p-1 text-gray-400 hover:text-gray-700 transition-colors" aria-label="Previous week">
                <ChevronLeft size={24} />
            </button>
            <h2 className="text-2xl">dinner{'\u00A0'}for{'\u00A0'}the{'\u00A0'}week{'\u00A0'}of {daysOfTheWeek[0].longDisplay.replaceAll(' ', '\u00A0')}</h2>
            <button onClick={() => { const next = weekOffset + 1; setWeekOffset(next); onWeekOffsetChange?.(next); }} className="p-1 text-gray-400 hover:text-gray-700 transition-colors" aria-label="Next week">
                <ChevronRight size={24} />
            </button>
        </div>
        <div className="flex flex-col sm:grid sm:grid-cols-7 gap-1">
            {daysOfTheWeek.map((day, i) => {
                const plan = plansByDate[day.dateKey];
                const planDate = new Date(day.dateKey);
                planDate.setDate(planDate.getDate() - 7);
                const lastWeek = planDate.toISOString().split('T')[0];
                const planFromLastWeek = plansByDate[lastWeek];
                const isDragOver = dragOverDate === day.dateKey;
                const isSpinning = day.dateKey in spinningDates;
                const emptyPlanMsg = emptyPlanMsgsThisWeek[i];

                return (
                    <div
                        key={day.dateKey}
                        className={`group relative text-center p-none sm:p-2 border rounded-lg bg-white transition-colors flex flex-row sm:flex sm:flex-col justify-start content-stretch
                            ${day.isToday ? 'border-deep-blue border-2 shadow-lg' : 'border-gray-300'}
                            ${isDragOver ? 'border-deep-blue bg-light-blue/20 border-2' : ''}
                        `}
                        onDragOver={(e) => handleDragOver(e, day.dateKey)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, day.dateKey)}
                    >
                        {plan && plan.recipe && (
                            <button
                                onClick={() => onRemovePlan(plan)}
                                className="absolute top-1 right-1 p-0.5 rounded text-gray-300 hover:text-red-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10"
                                aria-label="Remove meal"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                        {plan?.recipe?.image_url && (
                            <div className="flex-none w-20 block sm:hidden rounded-l-sm overflow-hidden">
                                <img
                                    src={plan.recipe.image_url}
                                    alt={plan.recipe.name}
                                    className="object-cover h-full rounded-l-sm"
                                />
                            </div>
                        )}
                        {plan?.recipe?.image_url == null && (
                            <div className="flex flex-col justify-center w-20 block sm:hidden">
                                <div className="text-4xl my-1">🍽</div>
                                <p className="text-xs text-gray-400 my-2 text-center">{emptyPlanMsg}</p>
                            </div>
                        )}
                        <div className="mb-2 sm:mb-1 m-2 sm:m-0 text-left w-10">
                            <h3 className={`text-xs uppercase ${day.isToday ? 'text-deep-blue font-bold' : 'text-gray-500'}`}>{day.label}</h3>
                            <p className={`text-xs ${day.isToday ? 'text-deep-blue' : 'text-gray-500'}`}>{day.shortDisplay}</p>
                            {day.isToday && <p className="text-xs block sm:hidden">Today</p>}
                            {weather[day.dateKey] && (
                                <p className={`text-xs whitespace-nowrap ${day.isToday ? 'text-deep-blue' : 'text-gray-500'}`}>
                                    <span className="text-xl block sm:inline sm:text-xs">{weather[day.dateKey].emoji}{' '}</span>

                                    <span>{weather[day.dateKey].high}°/{weather[day.dateKey].low}°</span>
                                </p>
                            )}
                        </div>

                        {plan && plan.recipe && (
                            <div className="w-full text-left sm:text-center my-2 pr-4 sm:pr-0 ml-6 sm:ml-0">
                                {plan.recipe.image_url && (
                                    <img
                                        src={plan.recipe.image_url}
                                        alt={plan.recipe.name}
                                        className="w-full hidden sm:block h-12 object-cover rounded mb-1"
                                    />
                                )}
                                <p className="text-lg sm:text-xs font-medium leading-tight" title={plan.recipe.name}>
                                    {plan.recipe.name}
                                </p>
                                {plan.recipe.prep_time && <p className="text-xs text-gray-500">prep: {plan.recipe.prep_time} mins</p>}
                                {plan.recipe.cook_time && <p className="text-xs text-gray-500">cook: {plan.recipe.cook_time} mins</p>}
                            </div>
                        )}
                        {isSpinning && (
                            <p className="ml-6 sm:ml-0 text-left flex-grow-1 text-lg sm:text-xs font-medium text-deep-blue truncate flex items-center justify-center sm:justify-start">
                                {spinningDates[day.dateKey]}
                            </p>
                        )}
                        {plan?.recipe == null && isDragging && (
                            <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 mx-auto my-auto flex items-center justify-center text-gray-300">
                                <Plus size={20} />
                            </div>
                        )}

                        {plan?.recipe == null && !isSpinning && !isDragging &&
                            (
                                <div className="flex-grow-1 flex flex-col justify-end sm:justify-start ml-6 sm:ml-0">
                                    <div className="text-xs text-gray-400 hidden sm:block  mt-2 text-center">
                                        <div className="text-4xl my-1">🍽</div>
                                        <p>{emptyPlanMsg}</p>
                                    </div>
                                    <hr className="border-gray-200 my-2 hidden sm:block" />

                                    <button
                                        onClick={() => handleSpin(day.dateKey)}
                                        className="my-2 text-xs cursor-pointer bg-deep-blue text-white rounded p-2 text-center w-9/10"
                                        aria-label="Random recipe"
                                    >
                                        random
                                    </button>
                                    {planFromLastWeek?.recipe != null &&
                                        <button
                                            onClick={() => handleUseLastWeek(day.dateKey)}
                                            className="mb-2 text-xs cursor-pointer bg-deep-blue text-white rounded p-2 text-center w-9/10"
                                            aria-label="Use last week's plan"
                                        >
                                            repeat<br />
                                            <span className="text-8">({planFromLastWeek.recipe.name})</span>
                                        </button>
                                    }

                                </div>
                            )
                        }
                    </div>
                );
            })}
        </div>
    </div>
}
