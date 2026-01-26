'use client';

import { getCurrentSeason } from '@/src/utils/utils';
import Link from 'next/link';
import { useState } from 'react';
import { TagInput } from '@/src/components/TagInput';

export default function RecipesPage() {
  const [formData, setFormData] = useState({
    name: '',
    ingredients: '',
    instructions: '',
    prep_time: '',
    cook_time: '',
    seasons: [] as string[],
    image_url: '' as string | null,
    tags: [] as string[],
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ingredients: formData.ingredients.split('\n').filter(i => i.trim()),
          prep_time: parseInt(formData.prep_time) || null,
          cook_time: parseInt(formData.cook_time) || null,
          season: formData.seasons,
          image_url: formData.image_url,
          tags: formData.tags,
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
          image_url: null,
          tags: [],
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });

        setTimeout(() => {
          setShowSuccess(false);
        }, 5000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleImport = async () => {
    if (!importUrl.trim()) return;

    setImporting(true);
    try {
      const response = await fetch('/api/import-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl }),
      });

      if (response.ok) {
        const importedRecipe = await response.json();
        setFormData({
          name: importedRecipe.name,
          ingredients: importedRecipe.ingredients.join('\n'),
          instructions: importedRecipe.instructions,
          prep_time: importedRecipe.prep_time?.toString() || '',
          cook_time: importedRecipe.cook_time?.toString() || '',
          seasons: [getCurrentSeason()],
          image_url: importedRecipe.image_url,
          tags: importedRecipe.tags || [],
        });
        setImportUrl('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to import recipe');
      }
    } catch (error) {
      alert('Failed to import recipe');
    } finally {
      setImporting(false);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.url) {
        setFormData(prev => ({ ...prev, image_url: data.url }));
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <Link className="hover:underline" href="/">Home</Link>
      <h1 className="text-5xl mb-8 font-bonheur-royale text-center">Add a Recipe</h1>

      {showSuccess && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded transition-all duration-300 ease-in-out animate-slide-down">
          ✓ Recipe added successfully!
        </div>
      )}

      <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h2 className="font-bold mb-3">Import from URL</h2>
        <p className="text-sm text-gray-600 mb-3">
          Paste a recipe URL from popular cooking sites (AllRecipes, NYT Cooking, etc.)
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="https://www.allrecipes.com/recipe/..."
            className="flex-1 p-2 border rounded"
            disabled={importing}
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || !importUrl.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {importing ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block mb-2 font-medium">recipe name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Recipe Image</label>
          {formData.image_url && (
            <div className="mb-2">
              <img
                src={formData.image_url}
                alt="Recipe preview"
                className="w-full max-w-md h-48 object-cover rounded"
              />
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, image_url: null }))}
                className="text-red-600 text-sm mt-2"
              >
                Remove image
              </button>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={uploading}
            className="w-full p-2 border rounded"
          />
          {uploading && <p className="text-sm text-gray-600 mt-1">Uploading...</p>}
        </div>

        <div>
          <label className="block mb-2 font-medium">ingredients (one per line)</label>
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
          <label className="block mb-2 font-medium">instructions</label>
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
            <label className="block mb-2 font-medium">prep time (minutes)</label>
            <input
              type="number"
              value={formData.prep_time}
              onChange={(e) => setFormData({ ...formData, prep_time: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">cook time (minutes)</label>
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
            <label className="block mb-2 font-medium">seasons</label>
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
        </div>

        <div>
          <label className="block mb-2 font-medium">tags</label>
          <TagInput
            selectedTags={formData.tags}
            onChange={(tags) => setFormData({ ...formData, tags })}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-3 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {submitting ? 'Adding recipe...' : 'add recipe'}
        </button>
      </form>
    </div>
  );
}