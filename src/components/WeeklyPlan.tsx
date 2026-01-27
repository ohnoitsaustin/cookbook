import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import type { Plan, Recipe } from '@/src/lib/supabase';

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

export function WeeklyPlan({ plans, recipes, onDropRecipe, onRemovePlan, isDragging }: Props): React.ReactElement {
    const [dragOverDate, setDragOverDate] = useState<string | null>(null);
    const [spinningDates, setSpinningDates] = useState<Record<string, string>>({});
    const [weekOffset, setWeekOffset] = useState(0);

    const now = new Date();
    const sunday = new Date(now);
    const dayOfWeek = sunday.getDay();
    const daysToSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
    sunday.setDate(sunday.getDate() - daysToSunday + weekOffset * 7);
    sunday.setHours(0, 0, 0, 0);

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

        setSpinningDates(prev => ({ ...prev, [dateKey]: '' }));

        const finalIndex = Math.floor(Math.random() * recipes.length);
        const finalRecipe = recipes[finalIndex];

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

    return <div className="mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
            <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-1 text-gray-400 hover:text-gray-700 transition-colors" aria-label="Previous week">
                <ChevronLeft size={24} />
            </button>
            <h2 className="text-4xl font-bonheur-royale">dinner for the week of {daysOfTheWeek[0].longDisplay}</h2>
            <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-1 text-gray-400 hover:text-gray-700 transition-colors" aria-label="Next week">
                <ChevronRight size={24} />
            </button>
        </div>
        <div className="flex flex-col sm:grid sm:grid-cols-7 gap-1">
            {daysOfTheWeek.map((day, i) => {
                const plan = plansByDate[day.dateKey];
                const isDragOver = dragOverDate === day.dateKey;
                const isSpinning = day.dateKey in spinningDates;
                const emptyPlanMsg = emptyPlanMsgsThisWeek[i];

                return (
                    <div
                        key={day.dateKey}
                        className={`group relative text-center p-none sm:p-2 border rounded-lg transition-colors grid grid-flow-col auto-rows-auto sm:flex sm:flex-col justify-start
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
                        <div className="h-full w-24 block sm:hidden rounded-l-sm overflow-hidden">
                            {plan?.recipe?.image_url && (
                                <img
                                    src={plan.recipe.image_url}
                                    alt={plan.recipe.name}
                                    className="object-fill h-full rounded-l-sm"
                                />
                            )}
                            {plan?.recipe?.image_url == null && (
                                <div className="bg-gray-300 w-full h-full" />
                            )}
                        </div>
                        <div className="mb-2 sm:mb-1 m-2 sm:m-0 text-left w-10">
                            <h3 className={`text-xs uppercase ${day.isToday ? 'text-deep-blue font-bold' : 'text-gray-400'}`}>{day.label}</h3>
                            <p className={`text-xs ${day.isToday ? 'text-deep-blue' : 'text-gray-400'}`}>{day.shortDisplay}</p>
                            {day.isToday && <p className="text-xs block sm:hidden">Today</p>}
                        </div>

                        {plan && plan.recipe && (
                            <div className="w-full text-left sm:text-center my-2 pr-4 sm:pr-0">
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
                            <p className="text-xs font-medium text-deep-blue truncate w-full h-full leading-24">
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
                                <>
                                    <p className="text-xs text-gray-400 opacity-100 group-hover:opacity-0 mt-2">
                                        {emptyPlanMsg}
                                    </p>
                                    <button
                                        onClick={() => handleSpin(day.dateKey)}
                                        className="ml-6 sm:ml-0 w-full h-full text-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-150"
                                        aria-label="Random recipe"
                                    >
                                        🎲
                                    </button>
                                </>
                            )
                        }
                    </div>
                );
            })}
        </div>
    </div>
}
