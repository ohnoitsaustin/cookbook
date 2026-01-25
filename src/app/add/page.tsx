'use client';

import { useState } from 'react';

export default function RecipesPage() {
  const [formData, setFormData] = useState({
    name: '',
    ingredients: '',
    instructions: '',
    prep_time: '',
    cook_time: '',
    seasons: [] as string[],
    temperature_preference: 'any'
  });

  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        ingredients: formData.ingredients.split('\n').filter(i => i.trim()),
        prep_time: parseInt(formData.prep_time) || null,
        cook_time: parseInt(formData.cook_time) || null,
        season: formData.seasons.length > 0 ? formData.seasons : ['any'], // Send as season for API
      })
    });

    if (response.ok) {
      setShowSuccess(true);
      setFormData({
        name: '',
        ingredients: '',
        instructions: '',
        prep_time: '',
        cook_time: '',
        seasons: [],
        temperature_preference: 'any'
      });

      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
    }
  };

  const toggleSeason = (season: string) => {
    setFormData(prev => ({
      ...prev,
      seasons: prev.seasons.includes(season)
        ? prev.seasons.filter(s => s !== season)
        : [...prev.seasons, season]
    }));
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="font-ballet text-5xl mb-8 text-center">Add a Recipe</h1>

      {showSuccess && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded transition-all duration-300 ease-in-out animate-slide-down">
          ✓ Recipe added successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block mb-2 font-medium">Recipe Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Ingredients (one per line)</label>
          <textarea
            required
            rows={6}
            value={formData.ingredients}
            onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
            className="w-full p-2 border rounded"
            placeholder="2 cups flour"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Instructions</label>
          <textarea
            required
            rows={8}
            value={formData.instructions}
            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 font-medium">Prep Time (minutes)</label>
            <input
              type="number"
              value={formData.prep_time}
              onChange={(e) => setFormData({ ...formData, prep_time: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">Cook Time (minutes)</label>
            <input
              type="number"
              value={formData.cook_time}
              onChange={(e) => setFormData({ ...formData, cook_time: e.target.value })}
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
                    checked={formData.seasons.includes(season)}
                    onChange={() => toggleSeason(season)}
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
              value={formData.temperature_preference}
              onChange={(e) => setFormData({ ...formData, temperature_preference: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="any">Any</option>
              <option value="hot">Hot</option>
              <option value="cold">Cold</option>
              <option value="room-temp">Room Temp</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded font-medium hover:bg-blue-700"
        >
          Add Recipe
        </button>
      </form>
    </div>
  );
}