import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Recipe } from "@/src/lib/airtable";

let dragIconEl: HTMLImageElement | null = null;
function getDragIcon(): HTMLImageElement {
    if (!dragIconEl) {
        dragIconEl = document.createElement('img');
        dragIconEl.src = '/fork-and-knife.svg';
        dragIconEl.style.width = '32px';
        dragIconEl.style.height = '32px';
        dragIconEl.style.position = 'absolute';
        dragIconEl.style.top = '-9999px';
        document.body.appendChild(dragIconEl);
    }
    return dragIconEl;
}

const seasonEmojis: Record<string, string> = {
    spring: '🌸',
    summer: '☀️',
    fall: '🍂',
    winter: '❄️'
};

type Props = {
    recipe: Recipe,
    className?: string,
    setEditingRecipe: (recipe: Recipe) => void,
    fetchRecipes: () => void,
    layout?: 'preview' | 'full',
}

export const RecipeCard = ({ recipe, className, setEditingRecipe, fetchRecipes, layout }: Props) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleEdit = (recipe: Recipe) => {
        setEditingRecipe(recipe);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this recipe?')) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/recipes?id=${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                fetchRecipes?.();
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const layoutClass = layout === 'preview' ? 'flex flex-col sm:flex-row' : '';
    const imgContainerClass = layout === 'preview' ? 'w-full sm:w-48 h-48 sm:h-auto flex-shrink-0 overflow-hidden' : '';
    const imgClass = layout === 'preview' ? 'w-full h-full object-cover rounded-t-lg sm:rounded-l-lg sm:rounded-t-none' : 'h-full rounded-lg';

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('recipeId', recipe.id);
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setDragImage(getDragIcon(), 16, 16);
    };

    return <div key={recipe.id} className={`${className} ${layoutClass} bg-white cursor-grab active:cursor-grabbing`} draggable onDragStart={handleDragStart}>
        {recipe.image_url && (
            <div className={imgContainerClass}>
                <img
                    src={recipe.image_url}
                    alt={recipe.name}
                    className={`w-full ${imgClass} object-cover`}
                />
            </div>
        )}
        <div className="flex-grow p-4">
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-5xl font-bonheur-royale">{recipe.name}</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleEdit(recipe)}
                        disabled={isDeleting}
                        className="text-gray-600 hover:text-gray-400 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Edit recipe"
                    >
                        <Pencil size={18} />
                    </button>
                    <button
                        onClick={() => handleDelete(recipe.id)}
                        disabled={isDeleting}
                        className="text-gray-600 hover:text-gray-400 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Delete recipe"
                    >
                        <Trash2 size={18} className={isDeleting ? 'animate-pulse' : ''} />
                    </button>
                </div>
            </div>
            <div className="flex gap-4 text-sm text-gray-600 mb-2">
                {recipe.prep_time && <span>prep: {recipe.prep_time} min</span>}
                {recipe.cook_time && <span>cook: {recipe.cook_time} min</span>}
                {recipe.season.length > 0 && (
                    <span className="flex items-center gap-1">
                        {recipe.season.map(s => seasonEmojis[s] || s).join(' ')}
                    </span>
                )}
            </div>
            {recipe.tags && recipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {recipe.tags.slice(0, 3).map(tag => (
                        <span
                            key={tag}
                            className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                            {tag}
                        </span>
                    ))}
                    {recipe.tags.length > 3 && (
                        <span className="inline-block px-2 py-0.5 text-gray-500 text-xs">
                            +{recipe.tags.length - 3} more
                        </span>
                    )}
                </div>
            )}
            <div className="mt-2">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="cursor-pointer text-gray-600 hover:text-gray-800"
                >
                    {isOpen ? 'hide recipe' : 'view recipe'}
                </button>
                <div
                    className={`overflow-hidden transition-all duration-600 ease-in-out ${isOpen ? 'max-h-[2000px] mt-4' : 'max-h-0'
                        }`}
                >
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-bold mb-2">ingredients:</h4>
                            <ul className="list-disc list-inside">
                                {recipe.ingredients.map((ing, i) => (
                                    <li key={i}>{ing}</li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-2">instructions:</h4>
                            <p className="whitespace-pre-wrap">{recipe.instructions}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
}