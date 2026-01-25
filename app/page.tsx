'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Recipe = {
  id: number;
  name: string;
  ingredients: string[];
  instructions: string;
  prep_time: number | null;
  cook_time: number | null;
  season: string;
  temperature_preference: string;
};

export default function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState('any');
  const [tempFilter, setTempFilter] = useState('any');

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
  };

  const filterRecipes = () => {
    let filtered = recipes;
    
    if (seasonFilter !== 'any') {
      filtered = filtered.filter(r => r.season === seasonFilter || r.season === 'any');
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Family Cookbook</h1>
        <Link 
          href="/recipes" 
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Add Recipe
        </Link>
      </div>

      {/* Wheel Spinner Section */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-lg mb-8">
        <h2 className="text-2xl font-bold mb-4 text-center">What's for Dinner?</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block mb-2 font-medium">Season</label>
            <select
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="any">Any Season</option>
              <option value="spring">Spring</option>
              <option value="summer">Summer</option>
              <option value="fall">Fall</option>
              <option value="winter">Winter</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium">Temperature</label>
            <select
              value={tempFilter}
              onChange={(e) => setTempFilter(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="any">Any Temp</option>
              <option value="hot">Hot</option>
              <option value="cold">Cold</option>
              <option value="room-temp">Room Temp</option>
            </select>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={spinWheel}
            disabled={isSpinning}
            className="bg-purple-600 text-white px-8 py-4 rounded-lg text-xl font-bold hover:bg-purple-700 disabled:bg-gray-400 transition-all transform hover:scale-105"
          >
            {isSpinning ? '🎡 Spinning...' : '🎯 Spin the Wheel!'}
          </button>
          
          <p className="mt-4 text-gray-600">
            {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {selectedRecipe && (
          <div className="mt-6 bg-white p-6 rounded-lg shadow-lg animate-bounce">
            <h3 className="text-2xl font-bold text-center text-purple-600 mb-2">
              🎉 Tonight's Dinner 🎉
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
        <h2 className="text-2xl font-bold mb-4">All Recipes</h2>
        {recipes.length === 0 ? (
          <p className="text-gray-600">No recipes yet. Add your first one!</p>
        ) : (
          <div className="grid gap-4">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-bold mb-2">{recipe.name}</h3>
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
    </div>
  );
}