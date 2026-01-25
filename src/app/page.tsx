'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Loader from '../components/Loader';

type Recipe = {
  id: number;
  name: string;
  ingredients: string[];
  instructions: string;
  prep_time: number | null;
  cook_time: number | null;
  season: string[];
  temperature_preference: string;
};

export default function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState('any');
  const [tempFilter, setTempFilter] = useState('any');
  const [isLoadingRecipes, setIsLoadingRecipes] = useState<boolean>(true);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    const response = await fetch(`/api/recipes?id=${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      fetchRecipes();
    }
  };

  const handleUpdate = async (updatedRecipe: Recipe) => {
    const response = await fetch('/api/recipes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedRecipe),
    });

    if (response.ok) {
      setEditingRecipe(null);
      fetchRecipes();
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  useEffect(() => {
    filterRecipes();
  }, [recipes, seasonFilter, tempFilter]);

  const fetchRecipes = async () => {
    const response = await fetch('/api/recipes');
    const data = await response.json();
    setRecipes(data);
    setIsLoadingRecipes(false);
  };

  const filterRecipes = () => {
    let filtered = recipes;

    if (seasonFilter !== 'any') {
      filtered = filtered.filter(r =>
        r.season.includes(seasonFilter) || r.season.includes('any')
      );
    }

    if (tempFilter !== 'any') {
      filtered = filtered.filter(r => r.temperature_preference === tempFilter || r.temperature_preference === 'any');
    }

    setFilteredRecipes(filtered);
  };

  const spinWheel = () => {
    if (filteredRecipes.length === 0) {
      alert('No recipes match your filters!');
      return;
    }

    setIsSpinning(true);
    setSelectedRecipe(null);

    // Simulate spinning for 2 seconds
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * filteredRecipes.length);
      setSelectedRecipe(filteredRecipes[randomIndex]);
      setIsSpinning(false);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="font-ballet text-5xl font-medium text-center">Lord Family Cookbook</h1>
      </div>

      {/* Wheel Spinner Section */}
      <div className="bg-gray-50 p-8 rounded-lg mb-8">
        <h2 className="text-2xl mb-4 text-center">what's for dinner?</h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block mb-2 font-medium">season</label>
            <select
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="any">any season</option>
              <option value="spring">spring</option>
              <option value="summer">summer</option>
              <option value="fall">fall</option>
              <option value="winter">winter</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium">temperature</label>
            <select
              value={tempFilter}
              onChange={(e) => setTempFilter(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="any">any temp</option>
              <option value="hot">hot</option>
              <option value="cold">cold</option>
              <option value="room-temp">room temp</option>
            </select>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={spinWheel}
            disabled={isSpinning}
            className="bg-deep-blue text-white px-8 py-4 rounded-lg text-xl font-bold disabled:bg-gray-400 transition-all transform hover:scale-105"
          >
            {isSpinning ? '🎡 spinning...' : '🎯 spin the wheel!'}
          </button>

          <p className="mt-4 text-gray-600">
            {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {selectedRecipe && (
          <div className="mt-6 bg-white p-6 rounded-lg shadow-lg relative">
            <button
              onClick={() => setSelectedRecipe(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-2xl font-bold text-center text-deep-blue mb-2">
              🎉 tonight's dinner 🎉
            </h3>
            <p className="text-3xl font-bold text-center">{selectedRecipe.name}</p>
            {(selectedRecipe.prep_time || selectedRecipe.cook_time) && (
              <p className="text-center text-gray-600 mt-2">
                {selectedRecipe.prep_time && `Prep: ${selectedRecipe.prep_time} min`}
                {selectedRecipe.prep_time && selectedRecipe.cook_time && ' | '}
                {selectedRecipe.cook_time && `Cook: ${selectedRecipe.cook_time} min`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Recipe List */}
      <div>
        <div className="flex justify-between">
          <h2 className="flex-1 text-2xl font-bold mb-4">all recipes</h2>
          <div className="flex-1 justify-self-end text-right">
            <Link className=" py-2 hover:underline" href="/add" >add a recipe</Link>
          </div>
        </div>
        {isLoadingRecipes && (
          <div className="mt-8">
            <Loader />
          </div>
        )}
        {recipes.length === 0 ? (
          <p className="text-gray-600">No recipes yet. Add your first one!</p>
        ) : (
          <div className="grid gap-4">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold">{recipe.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(recipe)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(recipe.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-gray-600 mb-2">
                  {recipe.prep_time && <span>Prep: {recipe.prep_time} min</span>}
                  {recipe.cook_time && <span>Cook: {recipe.cook_time} min</span>}
                  <span className="capitalize">{recipe.season}</span>
                  <span className="capitalize">{recipe.temperature_preference}</span>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                    View Recipe
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div>
                      <h4 className="font-bold mb-2">Ingredients:</h4>
                      <ul className="list-disc list-inside">
                        {recipe.ingredients.map((ing, i) => (
                          <li key={i}>{ing}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold mb-2">Instructions:</h4>
                      <p className="whitespace-pre-wrap">{recipe.instructions}</p>
                    </div>
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>
      {editingRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Edit Recipe</h2>
              <button
                onClick={() => setEditingRecipe(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdate(editingRecipe);
            }} className="space-y-4">
              <div>
                <label className="block mb-2 font-medium">Recipe Name</label>
                <input
                  type="text"
                  required
                  value={editingRecipe.name}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, name: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">Ingredients (one per line)</label>
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
                <label className="block mb-2 font-medium">Instructions</label>
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
                  <label className="block mb-2 font-medium">Prep Time (minutes)</label>
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
                  <label className="block mb-2 font-medium">Cook Time (minutes)</label>
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
                  <label className="block mb-2 font-medium">Seasons</label>
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

                <div>
                  <label className="block mb-2 font-medium">Temperature</label>
                  <select
                    value={editingRecipe.temperature_preference}
                    onChange={(e) => setEditingRecipe({
                      ...editingRecipe,
                      temperature_preference: e.target.value
                    })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="any">Any</option>
                    <option value="hot">Hot</option>
                    <option value="cold">Cold</option>
                    <option value="room-temp">Room Temp</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded font-medium hover:bg-blue-700"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRecipe(null)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded font-medium hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}