import Airtable from 'airtable';

// Initialize Airtable client
const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
const base = airtable.base(process.env.AIRTABLE_BASE_ID!);

// Table references
const recipesTable = base(process.env.AIRTABLE_TABLE_RECIPES!);
const ingredientsTable = base(process.env.AIRTABLE_TABLE_INGREDIENTS!);
const seasonsTable = base(process.env.AIRTABLE_TABLE_SEASONS!);
const tagsTable = base(process.env.AIRTABLE_TABLE_TAGS!);

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

// Transform Airtable record to Recipe type
function transformAirtableRecipe(record: any): Recipe {
  const fields = record.fields;

  return {
    id: record.id,
    name: fields.Name || '',
    ingredients: fields.Ingredients || [],
    instructions: fields.Instructions || '',
    prep_time: fields['Prep Time'] || null,
    cook_time: fields['Cook Time'] || null,
    season: fields.Seasons || ['any'],
    image_url: fields['Image URL'] || null,
    tags: fields.Tags || [],
  };
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

// Find season record by name
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
      records.map(async (record) => {
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
              return 'any';
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
          season: seasons.filter(s => s).length > 0 ? seasons.filter(s => s) : ['any'],
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
        const season = await seasonsTable.find(id);
        return season.fields.Name as string;
      })
    );

    const tagIds = (fields.Tags as string[]) || [];
    const tags = await Promise.all(
      tagIds.map(async (id) => {
        const tag = await tagsTable.find(id);
        return tag.fields.Name as string;
      })
    );

    return {
      id: record.id,
      name: fields.Name as string || '',
      ingredients: ingredients.filter(i => i),
      instructions: fields.Instructions as string || '',
      prep_time: fields['Prep Time'] as number || null,
      cook_time: fields['Cook Time'] as number || null,
      season: seasons.filter(s => s).length > 0 ? seasons.filter(s => s) : ['any'],
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

    // Find season record IDs
    const seasonIds = await Promise.all(
      data.season.map(async (s) => {
        const id = await findSeasonId(s);
        return id || await findSeasonId('any');
      })
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
      Seasons: seasonIds.filter(id => id) as string[],
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

    // Find season record IDs
    const seasonIds = await Promise.all(
      data.season.map(async (s) => {
        const id = await findSeasonId(s);
        return id || await findSeasonId('any');
      })
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
      Seasons: seasonIds.filter(id => id) as string[],
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
      .map((record) => {
        // The linked Recipes field might be named differently
        // Try common variations or find any array field that looks like linked records
        let recipesField = record.fields.Recipes;

        // If not found, look for any field that might be the linked recipes field
        if (!recipesField) {
          const fieldNames = Object.keys(record.fields);
          const linkedRecipeField = fieldNames.find(name =>
            name.toLowerCase().includes('recipe') && Array.isArray(record.fields[name])
          );
          recipesField = linkedRecipeField ? record.fields[linkedRecipeField] : [];
        }

        const count = Array.isArray(recipesField) ? recipesField.length : 0;

        return {
          tag: record.fields.Name as string,
          count,
        };
      })
      .filter(t => t.tag) // Filter out any undefined tags
      .filter(t => t.count > 0) // Only show tags used in at least one recipe
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.tag.localeCompare(b.tag);
      });

    return tagsWithCounts;
  } catch (error) {
    console.error('Error fetching tags:', error);
    throw error;
  }
}
