import { useState } from "react";
import type { Recipe } from "@/src/lib/supabase";
import { TagInput } from "@/src/components/TagInput";
import { resizeImage } from "@/src/utils/resizeImage";

export const RecipeEditModal = ({ onClose, onUpdate, editingRecipe, setEditingRecipe, isUpdating }: { onClose: () => void, onUpdate: (updatedRecipe: Recipe) => void, editingRecipe: Recipe, setEditingRecipe: (recipe: Recipe | null) => void, isUpdating: boolean }) => {
    const [uploading, setUploading] = useState(false);
    const [generating, setGenerating] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const resized = await resizeImage(file);
        const formData = new FormData();
        formData.append('file', resized);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (data.url) {
                setEditingRecipe({ ...editingRecipe, image_url: data.url } as Recipe);
            }
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleGenerateImage = async () => {
        if (!editingRecipe.name.trim()) return;
        setGenerating(true);
        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editingRecipe.name }),
            });
            const data = await response.json();
            if (data.url) {
                setEditingRecipe({ ...editingRecipe, image_url: data.url } as Recipe);
            } else {
                alert(data.error || 'Image generation failed');
            }
        } catch (error) {
            console.error('Generate failed:', error);
            alert('Image generation failed');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">edit recipe</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={(e) => {
                    e.preventDefault();
                    onUpdate(editingRecipe);
                }} className="space-y-4">
                    <div>
                        <label className="block mb-2 font-medium">recipe name</label>
                        <input
                            type="text"
                            required
                            value={editingRecipe.name}
                            onChange={(e) => setEditingRecipe({ ...editingRecipe, name: e.target.value })}
                            className="w-full p-2 border rounded"
                        />
                    </div>
                    <div>
                        <label className="block mb-2 font-medium">recipe image</label>
                        {editingRecipe.image_url && (
                            <div className="mb-2">
                                <img
                                    src={editingRecipe.image_url}
                                    alt="Recipe preview"
                                    className="w-full max-w-md h-48 object-cover rounded"
                                />
                                <button
                                    type="button"
                                    onClick={() => setEditingRecipe({ ...editingRecipe, image_url: null })}
                                    className="text-red-600 text-sm mt-2"
                                >
                                    Remove image
                                </button>
                            </div>
                        )}
                        <div className="flex gap-2 items-center">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={uploading || generating}
                                className="flex-1 p-2 border rounded"
                            />
                            <button
                                type="button"
                                onClick={handleGenerateImage}
                                disabled={generating || uploading || !editingRecipe.name.trim()}
                                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400 whitespace-nowrap"
                            >
                                {generating ? 'Generating...' : 'Generate with AI'}
                            </button>
                        </div>
                        {uploading && <p className="text-sm text-gray-600 mt-1">Uploading...</p>}
                        {generating && <p className="text-sm text-gray-600 mt-1">Generating image from recipe name...</p>}
                    </div>
                    <div>
                        <label className="block mb-2 font-medium">ingredients (one per line)</label>
                        <textarea
                            required
                            rows={6}
                            value={editingRecipe.ingredients.join('\n')}
                            onChange={(e) => setEditingRecipe({
                                ...editingRecipe,
                                ingredients: e.target.value.split('\n').filter(i => i.trim())
                            })}
                            className="w-full p-2 border rounded"
                        />
                    </div>

                    <div>
                        <label className="block mb-2 font-medium">instructions</label>
                        <textarea
                            required
                            rows={8}
                            value={editingRecipe.instructions}
                            onChange={(e) => setEditingRecipe({ ...editingRecipe, instructions: e.target.value })}
                            className="w-full p-2 border rounded"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-2 font-medium">prep time (minutes)</label>
                            <input
                                type="number"
                                value={editingRecipe.prep_time || ''}
                                onChange={(e) => setEditingRecipe({
                                    ...editingRecipe,
                                    prep_time: parseInt(e.target.value) || null
                                })}
                                className="w-full p-2 border rounded"
                            />
                        </div>

                        <div>
                            <label className="block mb-2 font-medium">cook time (minutes)</label>
                            <input
                                type="number"
                                value={editingRecipe.cook_time || ''}
                                onChange={(e) => setEditingRecipe({
                                    ...editingRecipe,
                                    cook_time: parseInt(e.target.value) || null
                                })}
                                className="w-full p-2 border rounded"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-2 font-medium">seasons</label>
                            <div className="space-y-2">
                                {['spring', 'summer', 'fall', 'winter'].map(season => (
                                    <label key={season} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={editingRecipe.season.includes(season)}
                                            onChange={(e) => {
                                                const newSeasons = e.target.checked
                                                    ? [...editingRecipe.season, season]
                                                    : editingRecipe.season.filter(s => s !== season);
                                                setEditingRecipe({ ...editingRecipe, season: newSeasons });
                                            }}
                                            className="w-4 h-4"
                                        />
                                        <span className="capitalize">{season}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block mb-2 font-medium">tags</label>
                        <TagInput
                            selectedTags={editingRecipe.tags}
                            onChange={(tags) => setEditingRecipe({ ...editingRecipe, tags })}
                        />
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={isUpdating}
                            className="flex-1 bg-blue-600 text-white py-3 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isUpdating ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setEditingRecipe(null)}
                            disabled={isUpdating}
                            className="flex-1 bg-gray-300 text-gray-700 py-3 rounded font-medium hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};