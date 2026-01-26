'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Loader from '../components/Loader';
import { getCurrentSeason } from '../utils/utils';
import { RecipeCard } from './Recipe';
import type { Recipe } from '@/src/lib/airtable';
import { RecipeEditModal } from './RecipeEditModal';
import { Search } from 'lucide-react';

export default function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState(getCurrentSeason());
  const [isLoadingRecipes, setIsLoadingRecipes] = useState<boolean>(true);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [spinningRecipeName, setSpinningRecipeName] = useState<string>('');

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

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(query) ||
        r.ingredients.some(ing => ing.toLowerCase().includes(query)) ||
        r.instructions.toLowerCase().includes(query) ||
        (r.tags && r.tags.some(tag => tag.toLowerCase().includes(query))) ||
        r.season.some(season => season.toLowerCase().includes(query))
      );
    }

    // Season filter
    if (seasonFilter !== 'any') {
      filtered = filtered.filter(r =>
        r.season.includes(seasonFilter) || r.season.includes('any')
      );
    }

    return filtered;
  }, [recipes, seasonFilter, searchQuery]);

  const spinWheel = () => {
    if (filteredRecipes.length === 0) {
      alert('No recipes match your filters!');
      return;
    }

    setIsSpinning(true);
    setSelectedRecipe(null);

    // Pick the final recipe
    const finalIndex = Math.floor(Math.random() * filteredRecipes.length);
    const finalRecipe = filteredRecipes[finalIndex];

    // Animate through recipes
    let currentIndex = 0;
    let spinCount = 0;
    const totalSpins = 20; // Number of times to cycle through recipes
    const baseDelay = 20; // Starting delay in ms

    const spin = () => {
      if (spinCount >= totalSpins) {
        // Stop spinning and show final recipe
        setSpinningRecipeName('');
        setSelectedRecipe(finalRecipe);
        setIsSpinning(false);
        return;
      }

      // Show current recipe name
      setSpinningRecipeName(filteredRecipes[currentIndex].name);

      // Move to next recipe
      currentIndex = (currentIndex + 1) % filteredRecipes.length;
      spinCount++;

      // Gradually slow down the spinning
      const delay = baseDelay + (spinCount / totalSpins) * 200;
      setTimeout(spin, delay);
    };

    spin();
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="my-8">
        <h1 className="font-bonheur-royale text-7xl font-medium text-center">
          Lord Family Cookbook
        </h1>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 bg-white" size={20} />
          <input
            type="text"
            placeholder="Search recipes, ingredients, instructions, tags, or seasons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-sm text-gray-600 mt-2">
            Found {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''} matching "{searchQuery}"
          </p>
        )}
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
            {isSpinning ? '🎡 spinning...' : <><span className="wiggle-emoji">🧄</span> spin the wheel!</>}
          </button>




          <p className="mt-4 text-gray-600">
            {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''} available
          </p>
        </div>
        {isSpinning && spinningRecipeName && (
          <div className="mt-6 p-6 bg-white rounded-lg shadow-md min-h-[80px] flex items-center justify-center">
            <p className="text-3xl font-bold text-deep-blue">
              {spinningRecipeName}
            </p>
          </div>
        )}
        {selectedRecipe && (
          <div className="mt-6 bg-white p-6 rounded-lg shadow-lg relative">
            <button
              onClick={() => setSelectedRecipe(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl z-10"
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-2xl font-bold text-center text-deep-blue mb-2">
              🎉 tonight's dinner 🎉
            </h3>
            <RecipeCard recipe={selectedRecipe} setEditingRecipe={setEditingRecipe} fetchRecipes={fetchRecipes} />
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
        ) : filteredRecipes.length === 0 && searchQuery ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No recipes found matching your search.</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-blue-600 hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} setEditingRecipe={setEditingRecipe} fetchRecipes={fetchRecipes} layout="preview" className="border border-gray-200 rounded-lg hover:shadow-lg transition-shadow" />
            ))}
            <div className="text-center my-8">
              <Link href="/add" className="hover:underline">add a recipe</Link>
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