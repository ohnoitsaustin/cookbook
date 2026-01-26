import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Plan } from '@/src/lib/airtable';

function formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

type Props = {
    plans: Plan[];
    onDropRecipe: (date: string, recipeId: string) => void;
}

export function WeeklyPlan({ plans, onDropRecipe }: Props): React.ReactElement {
    const [dragOverDate, setDragOverDate] = useState<string | null>(null);

    const now = new Date();
    const monday = new Date(now);
    const dayOfWeek = monday.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    monday.setDate(monday.getDate() - daysToMonday);
    monday.setHours(0, 0, 0, 0);

    const daysOfTheWeek = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateKey = formatDateKey(date);
        return {
            dateKey,
            displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            label: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"][i],
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

    return <div className="mb-8">
        <h2 className="mb-2">dinner this week</h2>
        <div className="flex">
            {daysOfTheWeek.map((day) => {
                const plan = plansByDate[day.dateKey];
                const isDragOver = dragOverDate === day.dateKey;

                return (
                    <div
                        key={day.dateKey}
                        className={`w-1/7 text-center p-2 border rounded-lg m-1 transition-colors min-h-[120px] flex flex-col
                            ${day.isToday ? 'border-deep-blue border-2' : 'border-gray-300'}
                            ${isDragOver ? 'border-deep-blue bg-light-blue/20 border-2' : ''}
                        `}
                        onDragOver={(e) => handleDragOver(e, day.dateKey)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, day.dateKey)}
                    >
                        <div className="mb-1">
                            <h3 className={`text-xs uppercase ${day.isToday ? 'text-deep-blue font-bold' : 'text-gray-400'}`}>{day.label}</h3>
                            <span className={`text-xs ${day.isToday ? 'text-deep-blue' : 'text-gray-400'}`}>{day.displayDate}</span>
                        </div>

                        <div className="flex-grow flex items-center justify-center">
                            {plan && plan.recipe ? (
                                <div className="w-full">
                                    {plan.recipe.image_url && (
                                        <img
                                            src={plan.recipe.image_url}
                                            alt={plan.recipe.name}
                                            className="w-full h-12 object-cover rounded mb-1"
                                        />
                                    )}
                                    <p className="text-xs font-medium leading-tight truncate" title={plan.recipe.name}>
                                        {plan.recipe.name}
                                    </p>
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300">
                                    <Plus size={20} />
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
}
