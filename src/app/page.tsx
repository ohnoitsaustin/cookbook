'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Loader from '../components/Loader';
import { getCurrentSeason } from '../utils/utils';
import { Recipe } from './Recipe';
import { RecipeEditModal } from './RecipeEditModal';



export default function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState(getCurrentSeason());
  const [isLoadingRecipes, setIsLoadingRecipes] = useState<boolean>(true);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

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

  const fetchRecipes = async () => {
    const response = await fetch('/api/recipes');
    const data = await response.json();
    setRecipes(data);
    setIsLoadingRecipes(false);
  };

  const filteredRecipes = useMemo(() => {
    let filtered = recipes;

    if (seasonFilter !== 'any') {
      filtered = filtered.filter(r =>
        r.season.includes(seasonFilter) || r.season.includes('any')
      );
    }

    return filtered;
  }, [recipes, seasonFilter]);

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
    }, 700);
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="my-8">
        <h1 className="font-bonheur-royale text-7xl font-medium text-center">Lord Family Cookbook</h1>
      </div>

      {/* Wheel Spinner Section */}
      <div className="bg-gray-50 p-8 rounded-lg mb-8">
        <h2 className="text-2xl mb-4 text-center">what's for dinner this {seasonFilter} day?</h2>

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
            <Recipe recipe={selectedRecipe} setEditingRecipe={setEditingRecipe} fetchRecipes={fetchRecipes} />
          </div>
        )}
      </div>

      {/* Recipe List */}
      <div>
        {isLoadingRecipes && (
          <div className="mt-8">
            <Loader />
          </div>
        )}
        {recipes.length === 0 && !isLoadingRecipes ? (
          <div className="text-center">
            <div className="my-4 text-4xl">🍽</div>
            <Link href="/add" className="text-blue-500 hover:underline">add a recipe</Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRecipes.map((recipe) => (
              <Recipe key={recipe.id} recipe={recipe} setEditingRecipe={setEditingRecipe} fetchRecipes={fetchRecipes} layout="preview" className="border rounded-lg hover:shadow-lg transition-shadow" />
            ))}
            {recipes.filter(r => !filteredRecipes.includes(r)).map(recipe => (
              <Recipe key={recipe.id} recipe={recipe} setEditingRecipe={setEditingRecipe} fetchRecipes={fetchRecipes} layout="preview" className="border rounded-lg hover:shadow-lg transition-shadow" />
            ))}
            <div className="text-center my-8">
              <Link href="/add" className=" hover:underline">add a recipe</Link>
            </div>
          </div>
        )}
      </div>
      {editingRecipe && (
        <RecipeEditModal editingRecipe={editingRecipe} setEditingRecipe={setEditingRecipe} onClose={() => setEditingRecipe(null)} onUpdate={handleUpdate} />
      )}
    </div>
  );
}