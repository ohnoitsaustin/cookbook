import Airtable from 'airtable';

// Initialize Airtable client
const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
const base = airtable.base(process.env.AIRTABLE_BASE_ID!);

// Table references (using type assertions for Airtable.js v0.12)
const recipesTable = base(process.env.AIRTABLE_TABLE_RECIPES!) as any;
const ingredientsTable = base(process.env.AIRTABLE_TABLE_INGREDIENTS!) as any;
const seasonsTable = base(process.env.AIRTABLE_TABLE_SEASONS!) as any;
const tagsTable = base(process.env.AIRTABLE_TABLE_TAGS!) as any;
const plansTable = base(process.env.AIRTABLE_TABLE_PLANS!) as any;

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
}

// Find or create an ingredient record
export async function findOrCreateIngredient(name: string): Promise<string> {
  try {
    // Search for existing ingredient
    const records = await ingredientsTable
      .select({
        filterByFormula: `{Name} = '${name.replace(/'/g, "\\'")}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (records.length > 0) {
      return records[0].id;
    }

    // Create new ingredient
    const newRecord = await ingredientsTable.create({ Name: name });
    return newRecord.id;
  } catch (error) {
    console.error('Error finding/creating ingredient:', error);
    throw error;
  }
}

// Find or create a tag record
export async function findOrCreateTag(name: string): Promise<string> {
  try {
    const normalizedName = name.toLowerCase().trim();

    // Search for existing tag (case-insensitive)
    const records = await tagsTable
      .select({
        filterByFormula: `LOWER({Name}) = '${normalizedName.replace(/'/g, "\\'")}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (records.length > 0) {
      return records[0].id;
    }

    // Create new tag
    const newRecord = await tagsTable.create({ Name: normalizedName });
    return newRecord.id;
  } catch (error) {
    console.error('Error finding/creating tag:', error);
    throw error;
  }
}

// Find or create a season record
export async function findOrCreateSeason(name: string): Promise<string> {
  try {
    const normalizedName = name.toLowerCase().trim();

    // Search for existing season (case-insensitive)
    const records = await seasonsTable
      .select({
        filterByFormula: `LOWER({Name}) = '${normalizedName.replace(/'/g, "\\'")}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (records.length > 0) {
      return records[0].id;
    }

    // Create new season
    const newRecord = await seasonsTable.create({ Name: normalizedName });
    return newRecord.id;
  } catch (error) {
    console.error('Error finding/creating season:', error);
    throw error;
  }
}

// Find season record by name (deprecated, use findOrCreateSeason)
export async function findSeasonId(seasonName: string): Promise<string | null> {
  try {
    const records = await seasonsTable
      .select({
        filterByFormula: `{Name} = '${seasonName.replace(/'/g, "\\'")}'`,
        maxRecords: 1,
      })
      .firstPage();

    return records.length > 0 ? records[0].id : null;
  } catch (error) {
    console.error('Error finding season:', error);
    throw error;
  }
}

// Get all recipes with expanded linked records
export async function getRecipes(): Promise<Recipe[]> {
  try {
    const records = await recipesTable
      .select({
        sort: [{ field: 'Created', direction: 'desc' }],
      })
      .all();

    // Transform records and fetch linked data
    const recipes = await Promise.all(
      records.map(async (record: typeof records[0]) => {
        const fields = record.fields;

        // Fetch linked ingredient names
        const ingredientIds = (fields.Ingredients as string[]) || [];
        const ingredients = await Promise.all(
          ingredientIds.map(async (id) => {
            try {
              const ing = await ingredientsTable.find(id);
              return ing.fields.Name as string;
            } catch {
              return '';
            }
          })
        );

        // Fetch linked season names
        const seasonIds = (fields.Seasons as string[]) || [];
        const seasons = await Promise.all(
          seasonIds.map(async (id) => {
            try {
              const season = await seasonsTable.find(id);
              return season.fields.Name as string;
            } catch {
              return '';
            }
          })
        );

        // Fetch linked tag names
        const tagIds = (fields.Tags as string[]) || [];
        const tags = await Promise.all(
          tagIds.map(async (id) => {
            try {
              const tag = await tagsTable.find(id);
              return tag.fields.Name as string;
            } catch {
              return '';
            }
          })
        );

        return {
          id: record.id,
          name: fields.Name as string || '',
          ingredients: ingredients.filter(i => i),
          instructions: fields.Instructions as string || '',
          prep_time: fields['Prep Time'] as number || null,
          cook_time: fields['Cook Time'] as number || null,
          season: seasons.filter(s => s && s !== 'any'),
          image_url: fields['Image URL'] as string || null,
          tags: tags.filter(t => t),
        };
      })
    );

    return recipes;
  } catch (error) {
    console.error('Error fetching recipes:', error);
    throw error;
  }
}

// Get a single recipe by ID
export async function getRecipe(id: string): Promise<Recipe | null> {
  try {
    const record = await recipesTable.find(id);
    const fields = record.fields;

    // Fetch linked data
    const ingredientIds = (fields.Ingredients as string[]) || [];
    const ingredients = await Promise.all(
      ingredientIds.map(async (id) => {
        const ing = await ingredientsTable.find(id);
        return ing.fields.Name as string;
      })
    );

    const seasonIds = (fields.Seasons as string[]) || [];
    const seasons = await Promise.all(
      seasonIds.map(async (id) => {
        try {
          const season = await seasonsTable.find(id);
          return season.fields.Name as string;
        } catch {
          return '';
        }
      })
    );

    const tagIds = (fields.Tags as string[]) || [];
    const tags = await Promise.all(
      tagIds.map(async (id) => {
        try {
          const tag = await tagsTable.find(id);
          return tag.fields.Name as string;
        } catch {
          return '';
        }
      })
    );

    return {
      id: record.id,
      name: fields.Name as string || '',
      ingredients: ingredients.filter(i => i),
      instructions: fields.Instructions as string || '',
      prep_time: fields['Prep Time'] as number || null,
      cook_time: fields['Cook Time'] as number || null,
      season: seasons.filter(s => s && s !== 'any'),
      image_url: fields['Image URL'] as string || null,
      tags: tags.filter(t => t),
    };
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return null;
  }
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
  try {
    // Create or find ingredient records
    const ingredientIds = await Promise.all(
      data.ingredients.map(ing => findOrCreateIngredient(ing))
    );

    // Create or find season records
    const seasonIds = await Promise.all(
      data.season.map(s => findOrCreateSeason(s))
    );

    // Create or find tag records
    const tagIds = await Promise.all(
      data.tags.map(tag => findOrCreateTag(tag))
    );

    // Create recipe record
    const record = await recipesTable.create({
      Name: data.name,
      Instructions: data.instructions,
      'Prep Time': data.prep_time,
      'Cook Time': data.cook_time,
      'Image URL': data.image_url || '',
      Ingredients: ingredientIds,
      Seasons: seasonIds,
      Tags: tagIds,
    });

    // Fetch and return the created recipe with linked data
    return (await getRecipe(record.id))!;
  } catch (error) {
    console.error('Error creating recipe:', error);
    throw error;
  }
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
  try {
    // Create or find ingredient records
    const ingredientIds = await Promise.all(
      data.ingredients.map(ing => findOrCreateIngredient(ing))
    );

    // Create or find season records
    const seasonIds = await Promise.all(
      data.season.map(s => findOrCreateSeason(s))
    );

    // Create or find tag records
    const tagIds = await Promise.all(
      data.tags.map(tag => findOrCreateTag(tag))
    );

    // Update recipe record
    await recipesTable.update(id, {
      Name: data.name,
      Instructions: data.instructions,
      'Prep Time': data.prep_time,
      'Cook Time': data.cook_time,
      'Image URL': data.image_url || '',
      Ingredients: ingredientIds,
      Seasons: seasonIds,
      Tags: tagIds,
    });

    // Fetch and return the updated recipe with linked data
    return (await getRecipe(id))!;
  } catch (error) {
    console.error('Error updating recipe:', error);
    throw error;
  }
}

// Delete a recipe
export async function deleteRecipe(id: string): Promise<void> {
  try {
    await recipesTable.destroy(id);
  } catch (error) {
    console.error('Error deleting recipe:', error);
    throw error;
  }
}

// Get all tags with usage counts
export async function getTags(): Promise<{ tag: string; count: number }[]> {
  try {
    const records = await tagsTable.select().all();

    const tagsWithCounts = records
      .map((record: typeof records[0]) => ({
        tag: record.fields.Name as string,
        count: (record.fields.Recipes as string[] || []).length,
      }))
      .filter((t: { count: number }) => t.count > 0)
      .sort((a: { count: number; tag: string }, b: { count: number; tag: string }) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.tag.localeCompare(b.tag);
      });

    return tagsWithCounts;
  } catch (error) {
    console.error('Error fetching tags:', error);
    throw error;
  }
}

// Create a new plan
export async function createPlan(data: {
  date: string;
  recipeId: string;
  notes: string;
}): Promise<Plan> {
  try {
    const record = await plansTable.create({
      Date: data.date,
      Recipes: [data.recipeId],
      Notes: data.notes,
    });

    return (await getPlan(record.id))!;
  } catch (error) {
    console.error('Error creating plan:', error);
    throw error;
  }
}

// get a plan
export async function getPlan(id: string): Promise<Plan | null> {
  try {
    const record = await plansTable.find(id);
    const recipeIds = (record.fields.Recipes as string[]) || [];
    return {
      id: record.id,
      date: record.fields.Date as string,
      recipe: recipeIds.length > 0 ? await getRecipe(recipeIds[0]) : null,
      notes: (record.fields.Notes as string) || '',
    }
  } catch (error) {
    console.error('Error fetching plan:', error);
    throw error;
  }
}

// get plans by date
export async function getPlans(minDate?: string, maxDate?: string): Promise<Plan[]> {
  try {
    const selectOptions: any = {
      sort: [{ field: 'Date', direction: 'asc' }],
    };
    if (minDate && maxDate) {
      selectOptions.filterByFormula = `AND({Date} >= '${minDate}', {Date} <= '${maxDate}')`;
    }

    const records = await plansTable.select(selectOptions).all();

    return await Promise.all(
      records.map(async (record: typeof records[0]) => {
        const recipeIds = (record.fields.Recipes as string[]) || [];
        return {
          id: record.id,
          date: record.fields.Date as string,
          recipe: recipeIds.length > 0 ? await getRecipe(recipeIds[0]) : null,
          notes: (record.fields.Notes as string) || '',
        };
      })
    );
  } catch (error) {
    console.error('Error fetching plans:', error);
    throw error;
  }
}

// update a plan
export async function updatePlan(
  id: string,
  data: {
    date: string;
    recipeId?: string;
    notes?: string;
  }
): Promise<Plan> {
  try {
    await plansTable.update(id, {
      Date: data.date,
      Recipes: data.recipeId ? [data.recipeId] : [],
      Notes: data.notes || '',
    });

    return (await getPlan(id))!;
  } catch (error) {
    console.error('Error updating plan:', error);
    throw error;
  }
}

// delete a plan
export async function deletePlan(id: string): Promise<void> {
  try {
    await plansTable.destroy(id);
  } catch (error) {
    console.error('Error deleting plan:', error);
    throw error;
  }
}