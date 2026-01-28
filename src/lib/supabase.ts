import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type Recipe = {
  id: string;
  name: string;
  ingredients: string[];
  instructions: string;
  prep_time: number | null;
  cook_time: number | null;
  season: string[];
  image_url?: string | null;
  tags: string[];
};

export type Plan = {
  id: string;
  date: string;
  recipe: Recipe | null;
  notes: string;
};

// Find or create an ingredient record, returns its id
export async function findOrCreateIngredient(name: string): Promise<string> {
  const { data, error } = await supabase
    .from('ingredients')
    .upsert({ name }, { onConflict: 'name' })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

// Find or create a tag record, returns its id
export async function findOrCreateTag(name: string): Promise<string> {
  const normalizedName = name.toLowerCase().trim();

  const { data, error } = await supabase
    .from('tags')
    .upsert({ name: normalizedName }, { onConflict: 'name' })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

// Find or create a season record, returns its id
export async function findOrCreateSeason(name: string): Promise<string> {
  const normalizedName = name.toLowerCase().trim();

  const { data, error } = await supabase
    .from('seasons')
    .upsert({ name: normalizedName }, { onConflict: 'name' })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

// Helper: build a Recipe from a Supabase row with joined data
function toRecipe(row: any): Recipe {
  return {
    id: row.id,
    name: row.name || '',
    ingredients: (row.recipe_ingredients || []).map((ri: any) => ri.ingredients?.name).filter(Boolean),
    instructions: row.instructions || '',
    prep_time: row.prep_time ?? null,
    cook_time: row.cook_time ?? null,
    season: (row.recipe_seasons || [])
      .map((rs: any) => rs.seasons?.name)
      .filter((s: string) => s && s !== 'any'),
    image_url: row.image_url || null,
    tags: (row.recipe_tags || []).map((rt: any) => rt.tags?.name).filter(Boolean),
  };
}

const RECIPE_SELECT = `
  *,
  recipe_ingredients(ingredients(name)),
  recipe_seasons(seasons(name)),
  recipe_tags(tags(name))
`;

// Get all recipes with joined linked records
export async function getRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_SELECT)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toRecipe);
}

// Get a single recipe by ID
export async function getRecipe(id: string): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_SELECT)
    .eq('id', id)
    .single();

  if (error) return null;
  return toRecipe(data);
}

// Create a new recipe
export async function createRecipe(data: {
  name: string;
  ingredients: string[];
  instructions: string;
  prep_time: number | null;
  cook_time: number | null;
  season: string[];
  image_url?: string | null;
  tags: string[];
}): Promise<Recipe> {
  // Insert recipe row
  const { data: recipe, error } = await supabase
    .from('recipes')
    .insert({
      name: data.name,
      instructions: data.instructions,
      prep_time: data.prep_time,
      cook_time: data.cook_time,
      image_url: data.image_url || null,
    })
    .select('id')
    .single();

  if (error) throw error;
  const recipeId = recipe.id;

  // Link ingredients, seasons, tags in parallel
  await Promise.all([
    linkIngredients(recipeId, data.ingredients),
    linkSeasons(recipeId, data.season),
    linkTags(recipeId, data.tags),
  ]);

  return (await getRecipe(recipeId))!;
}

// Update a recipe
export async function updateRecipe(
  id: string,
  data: {
    name: string;
    ingredients: string[];
    instructions: string;
    prep_time: number | null;
    cook_time: number | null;
    season: string[];
    image_url?: string | null;
    tags: string[];
  }
): Promise<Recipe> {
  // Update recipe row
  const { error } = await supabase
    .from('recipes')
    .update({
      name: data.name,
      instructions: data.instructions,
      prep_time: data.prep_time,
      cook_time: data.cook_time,
      image_url: data.image_url || null,
    })
    .eq('id', id);

  if (error) throw error;

  // Clear old junctions and re-link
  await Promise.all([
    supabase.from('recipe_ingredients').delete().eq('recipe_id', id),
    supabase.from('recipe_seasons').delete().eq('recipe_id', id),
    supabase.from('recipe_tags').delete().eq('recipe_id', id),
  ]);

  await Promise.all([
    linkIngredients(id, data.ingredients),
    linkSeasons(id, data.season),
    linkTags(id, data.tags),
  ]);

  return (await getRecipe(id))!;
}

// Delete a recipe
export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) throw error;
}

// Get all tags with usage counts
export async function getTags(): Promise<{ tag: string; count: number }[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('name, recipe_tags(recipe_id)');

  if (error) throw error;

  return (data || [])
    .map((t: any) => ({
      tag: t.name as string,
      count: (t.recipe_tags || []).length,
    }))
    .filter((t) => t.count > 0)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.tag.localeCompare(b.tag);
    });
}

// Create a new plan
export async function createPlan(data: {
  date: string;
  recipeId: string;
  notes: string;
}): Promise<Plan> {
  const { data: plan, error } = await supabase
    .from('plans')
    .insert({
      date: data.date,
      recipe_id: data.recipeId,
      notes: data.notes || '',
    })
    .select('id')
    .single();

  if (error) throw error;
  return (await getPlan(plan.id))!;
}

// Get a single plan
export async function getPlan(id: string): Promise<Plan | null> {
  const { data, error } = await supabase
    .from('plans')
    .select(`*, recipes(${RECIPE_SELECT})`)
    .eq('id', id)
    .single();

  if (error) return null;

  return {
    id: data.id,
    date: data.date,
    recipe: data.recipes ? toRecipe(data.recipes) : null,
    notes: data.notes || '',
  };
}

// Get plans with optional date range
export async function getPlans(minDate?: string, maxDate?: string): Promise<Plan[]> {
  let query = supabase
    .from('plans')
    .select(`*, recipes(${RECIPE_SELECT})`)
    .order('date', { ascending: true });

  if (minDate && maxDate) {
    query = query.gte('date', minDate).lte('date', maxDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    date: row.date,
    recipe: row.recipes ? toRecipe(row.recipes) : null,
    notes: row.notes || '',
  }));
}

// Update a plan
export async function updatePlan(
  id: string,
  data: {
    date: string;
    recipeId?: string;
    notes?: string;
  }
): Promise<Plan> {
  const { error } = await supabase
    .from('plans')
    .update({
      date: data.date,
      recipe_id: data.recipeId || null,
      notes: data.notes || '',
    })
    .eq('id', id);

  if (error) throw error;
  return (await getPlan(id))!;
}

// Delete a plan
export async function deletePlan(id: string): Promise<void> {
  const { error } = await supabase.from('plans').delete().eq('id', id);
  if (error) throw error;
}

// --- Internal helpers ---

async function linkIngredients(recipeId: string, names: string[]) {
  if (names.length === 0) return;
  const ids = await Promise.all(names.map((n) => findOrCreateIngredient(n)));
  const rows = ids.map((ingredient_id) => ({ recipe_id: recipeId, ingredient_id }));
  const { error } = await supabase.from('recipe_ingredients').insert(rows);
  if (error) throw error;
}

async function linkSeasons(recipeId: string, names: string[]) {
  if (names.length === 0) return;
  const ids = await Promise.all(names.map((n) => findOrCreateSeason(n)));
  const rows = ids.map((season_id) => ({ recipe_id: recipeId, season_id }));
  const { error } = await supabase.from('recipe_seasons').insert(rows);
  if (error) throw error;
}

async function linkTags(recipeId: string, names: string[]) {
  if (names.length === 0) return;
  const ids = await Promise.all(names.map((n) => findOrCreateTag(n)));
  const rows = ids.map((tag_id) => ({ recipe_id: recipeId, tag_id }));
  const { error } = await supabase.from('recipe_tags').insert(rows);
  if (error) throw error;
}

// --- Weather Cache ---

export type WeatherCacheEntry = {
  date: string;
  high: number;
  low: number;
  weather_code: number;
  updated_at: string;
};

export async function getWeatherCache(dates: string[]): Promise<WeatherCacheEntry[]> {
  const { data, error } = await supabase
    .from('weather_cache')
    .select('*')
    .in('date', dates);

  if (error) throw error;
  return data || [];
}

export async function upsertWeatherCache(entries: Omit<WeatherCacheEntry, 'updated_at'>[]): Promise<void> {
  const rows = entries.map(e => ({
    ...e,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('weather_cache')
    .upsert(rows, { onConflict: 'date' });

  if (error) throw error;
}
