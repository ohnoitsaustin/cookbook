'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Loader from '../components/Loader';
import { getCurrentSeason } from '../utils/utils';
import { RecipeCard } from '../components/Recipe';
import type { Recipe, Plan } from '@/src/lib/supabase';
import { RecipeEditModal } from '../components/RecipeEditModal';
import { Search, LogOut } from 'lucide-react';
import { WeeklyPlan } from '../components/WeeklyPlan';

export default function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState(getCurrentSeason());
  const [isLoadingRecipes, setIsLoadingRecipes] = useState<boolean>(true);
  const [isLoadingPlans, setIsLoadingPlans] = useState<boolean>(true);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [spinningRecipeName, setSpinningRecipeName] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isDraggingRecipe, setIsDraggingRecipe] = useState(false);
  const [deletedPlan, setDeletedPlan] = useState<Plan | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSignOut = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    window.location.href = '/login';
  };

  const handleUpdate = async (updatedRecipe: Recipe) => {
    setIsUpdating(true);
    try {
      const response = await fetch('/api/recipes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedRecipe,
          season: updatedRecipe.season.filter(s => s !== 'any'),
        }),
      });

      if (response.ok) {
        setEditingRecipe(null);
        fetchRecipes();
      }
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
    fetchPlans();
  }, []);

  const fetchRecipes = async () => {
    const response = await fetch('/api/recipes');
    const data = await response.json();
    setRecipes(data);
    setIsLoadingRecipes(false);
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/plans');
      const data = await response.json();
      setPlans(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      setPlans([]);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleDropRecipe = async (date: string, recipeId: string) => {
    // Optimistic update
    const recipe = recipes.find(r => r.id === recipeId) || null;
    const existingPlan = plans.find(p => p.date === date);
    setPlans(prev => [...prev.filter(p => p.date !== date), { id: existingPlan?.id || 'temp', date, recipe, notes: existingPlan?.notes || '' }]);

    try {
      if (existingPlan) {
        await fetch('/api/plans', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: existingPlan.id, date, recipeId, notes: existingPlan.notes }),
        });
      } else {
        await fetch('/api/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, recipeId, notes: '' }),
        });
      }
      fetchPlans();
    } catch (error) {
      console.error('Failed to save plan:', error);
      fetchPlans();
    }
  };

  const handleRemovePlan = async (plan: Plan) => {
    // Store for undo
    setDeletedPlan(plan);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = setTimeout(() => setDeletedPlan(null), 5000);

    // Optimistic removal
    setPlans(prev => prev.filter(p => p.id !== plan.id));

    try {
      await fetch(`/api/plans?id=${plan.id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete plan:', error);
      fetchPlans();
    }
  };

  const handleUndoDelete = async () => {
    if (!deletedPlan?.recipe) return;
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);

    const plan = deletedPlan;
    setDeletedPlan(null);

    // Optimistic re-add
    setPlans(prev => [...prev, plan]);

    try {
      await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: plan.date, recipeId: plan.recipe!.id, notes: plan.notes }),
      });
      fetchPlans();
    } catch (error) {
      console.error('Failed to undo delete:', error);
      fetchPlans();
    }
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
        r.season.length === 0 || r.season.includes(seasonFilter)
      );
    }

    return filtered;
  }, [recipes, seasonFilter, searchQuery]);

  return (
    <>
      <div className="max-w-4xl mx-auto p-8">
        <div className="my-8 relative">
          <h1 className="font-bonheur-royale text-7xl font-medium text-center">
            Lord Family Cookbook
          </h1>

        </div>

        {/* Wheel Spinner Section */}
        <div className="bg-gray-50 py-8 md:px-8 rounded-lg">
          {(isLoadingRecipes || isLoadingPlans) && (
            <div className="mt-8">
              <Loader />
            </div>
          )}
          {!isLoadingPlans && recipes.length > 0 && (
            <div className="text-center">
              <WeeklyPlan plans={plans} recipes={filteredRecipes} onDropRecipe={handleDropRecipe} onRemovePlan={handleRemovePlan} isDragging={isDraggingRecipe} onWeekOffsetChange={setWeekOffset} />
            </div>
          )}
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

        {/* Recipe List */}
        <div>
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
            <div className="grid gap-4" onDragStart={() => setIsDraggingRecipe(true)} onDragEnd={() => setIsDraggingRecipe(false)}>
              {filteredRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} setEditingRecipe={setEditingRecipe} fetchRecipes={fetchRecipes} layout="preview" className="border border-gray-200 rounded-lg hover:shadow-lg transition-shadow" plans={plans} onSchedule={handleDropRecipe} weekOffset={weekOffset} />
              ))}
              {filteredRecipes.length != recipes.length &&
                <hr className="my-4 border-gray-300" />
              }
              {
                recipes.filter(r => !filteredRecipes.map(r => r.id).includes(r.id)).map(recipe =>
                  <RecipeCard key={recipe.id} recipe={recipe} setEditingRecipe={setEditingRecipe} fetchRecipes={fetchRecipes} layout="preview" className="border border-gray-200 rounded-lg hover:shadow-lg transition-shadow opacity-50" plans={plans} onSchedule={handleDropRecipe} weekOffset={weekOffset} />
                )
              }
              <div className="text-center my-8">
                <Link href="/add" className="hover:underline">add a recipe</Link>
              </div>
            </div>
          )}
        </div>
        {editingRecipe && (
          <RecipeEditModal editingRecipe={editingRecipe} setEditingRecipe={setEditingRecipe} onClose={() => setEditingRecipe(null)} onUpdate={handleUpdate} isUpdating={isUpdating} />
        )}
        {deletedPlan && (
          <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 z-50">
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 text-sm">
              <span className="text-gray-600">Removed {deletedPlan.recipe?.name} from {deletedPlan.date}</span>
              <button
                onClick={handleUndoDelete}
                className="font-medium text-deep-blue hover:underline"
              >
                undo
              </button>
            </div>
          </div>
        )}
      </div>
      <button
        onClick={handleSignOut}
        className="p-2 text-gray-400 hover:text-gray-600 flex items-center text-right gap-1 text-sm"
      >
        <LogOut size={16} />
        Sign out
      </button>
    </>
  );
}