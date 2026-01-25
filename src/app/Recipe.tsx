import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

export type Recipe = {
    id: number;
    name: string;
    ingredients: string[];
    instructions: string;
    prep_time: number | null;
    cook_time: number | null;
    season: string[];
    image_url?: string | null;
};

type Props = {
    recipe: Recipe,
    className?: string,
    setEditingRecipe: (recipe: Recipe) => void,
    fetchRecipes: () => void,
    layout?: 'preview' | 'full',
}

export const Recipe = ({ recipe, className, setEditingRecipe, fetchRecipes, layout }: Props) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleEdit = (recipe: Recipe) => {
        setEditingRecipe(recipe);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this recipe?')) return;

        const response = await fetch(`/api/recipes?id=${id}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            fetchRecipes?.();
        }
    };

    const layoutClass = layout === 'preview' ? 'flex flex-row' : '';
    const imgContainerClass = layout === 'preview' ? 'w-48 flex-shrink-0' : '';
    const imgClass = layout === 'preview' ? 'h-full min-h-full rounded-l-lg' : 'h-full rounded-lg ';

    return <div key={recipe.id} className={`${className} ${layoutClass} bg-white`}>
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
                <h3 className="text-xl font-bold">{recipe.name}</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleEdit(recipe)}
                        className="text-gray-600 hover:text-gray-400 p-1"
                        aria-label="Edit recipe"
                    >
                        <Pencil size={18} />
                    </button>
                    <button
                        onClick={() => handleDelete(recipe.id)}
                        className="text-gray-600 hover:text-gray-400 p-1"
                        aria-label="Delete recipe"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
            <div className="flex gap-4 text-sm text-gray-600 mb-2">
                {recipe.prep_time && <span>prep: {recipe.prep_time} min</span>}
                {recipe.cook_time && <span>cook: {recipe.cook_time} min</span>}
                <span>season: {recipe.season.join(', ')}</span>
            </div>
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