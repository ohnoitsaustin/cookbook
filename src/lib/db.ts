import { Pool, PoolClient } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'cookbook',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
});

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

// ── SQL helpers ────────────────────────────────────────────────────────────────

// Returns all recipe fields plus aggregated ingredients, seasons, and tags.
// Used for both standalone recipe queries and plan → recipe joins.
const RECIPE_SQL = `
  SELECT
    r.id,
    r.name,
    r.instructions,
    r.prep_time,
    r.cook_time,
    r.image_url,
    r.created_at,
    COALESCE(array_agg(DISTINCT i.name) FILTER (WHERE i.name IS NOT NULL), ARRAY[]::text[]) AS ingredients,
    COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL AND s.name <> 'any'), ARRAY[]::text[]) AS seasons,
    COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::text[]) AS tags
  FROM recipes r
  LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
  LEFT JOIN ingredients i        ON ri.ingredient_id = i.id
  LEFT JOIN recipe_seasons rs    ON r.id = rs.recipe_id
  LEFT JOIN seasons s            ON rs.season_id = s.id
  LEFT JOIN recipe_tags rt       ON r.id = rt.recipe_id
  LEFT JOIN tags t               ON rt.tag_id = t.id
`;

function toRecipe(row: Record<string, unknown>): Recipe {
  return {
    id: row.id as string,
    name: (row.name as string) || '',
    ingredients: (row.ingredients as string[]) || [],
    instructions: (row.instructions as string) || '',
    prep_time: (row.prep_time as number | null) ?? null,
    cook_time: (row.cook_time as number | null) ?? null,
    season: (row.seasons as string[]) || [],
    image_url: (row.image_url as string | null) || null,
    tags: (row.tags as string[]) || [],
  };
}

function toPlan(row: Record<string, unknown>): Plan {
  const recipe = row.recipe_id
    ? {
        id: row.recipe_id as string,
        name: (row.recipe_name as string) || '',
        ingredients: (row.recipe_ingredients as string[]) || [],
        instructions: (row.recipe_instructions as string) || '',
        prep_time: (row.recipe_prep_time as number | null) ?? null,
        cook_time: (row.recipe_cook_time as number | null) ?? null,
        season: (row.recipe_seasons as string[]) || [],
        image_url: (row.recipe_image_url as string | null) || null,
        tags: (row.recipe_tags as string[]) || [],
      }
    : null;

  return {
    id: row.id as string,
    date: row.date as string,
    notes: (row.notes as string) || '',
    recipe,
  };
}

// ── Lookups ────────────────────────────────────────────────────────────────────

export async function findOrCreateIngredient(name: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO ingredients (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [name],
  );
  return rows[0].id;
}

export async function findOrCreateTag(name: string): Promise<string> {
  const normalized = name.toLowerCase().trim();
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO tags (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [normalized],
  );
  return rows[0].id;
}

export async function findOrCreateSeason(name: string): Promise<string> {
  const normalized = name.toLowerCase().trim();
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO seasons (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [normalized],
  );
  return rows[0].id;
}

// ── Internal link helpers (run inside a transaction client) ───────────────────

async function linkIngredients(client: PoolClient, recipeId: string, names: string[]) {
  if (names.length === 0) return;
  const ids = await Promise.all(names.map(findOrCreateIngredient));
  await Promise.all(
    ids.map((id) =>
      client.query(
        'INSERT INTO recipe_ingredients (recipe_id, ingredient_id) VALUES ($1, $2)',
        [recipeId, id],
      ),
    ),
  );
}

async function linkSeasons(client: PoolClient, recipeId: string, names: string[]) {
  if (names.length === 0) return;
  const ids = await Promise.all(names.map(findOrCreateSeason));
  await Promise.all(
    ids.map((id) =>
      client.query(
        'INSERT INTO recipe_seasons (recipe_id, season_id) VALUES ($1, $2)',
        [recipeId, id],
      ),
    ),
  );
}

async function linkTags(client: PoolClient, recipeId: string, names: string[]) {
  if (names.length === 0) return;
  const ids = await Promise.all(names.map(findOrCreateTag));
  await Promise.all(
    ids.map((id) =>
      client.query(
        'INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ($1, $2)',
        [recipeId, id],
      ),
    ),
  );
}

// ── Recipes ────────────────────────────────────────────────────────────────────

export async function getRecipes(): Promise<Recipe[]> {
  const { rows } = await pool.query(
    `${RECIPE_SQL} GROUP BY r.id ORDER BY r.created_at DESC`,
  );
  return rows.map(toRecipe);
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const { rows } = await pool.query(
    `${RECIPE_SQL} WHERE r.id = $1 GROUP BY r.id`,
    [id],
  );
  return rows[0] ? toRecipe(rows[0]) : null;
}

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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO recipes (name, instructions, prep_time, cook_time, image_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [data.name, data.instructions, data.prep_time, data.cook_time, data.image_url ?? null],
    );
    const recipeId = rows[0].id;

    await Promise.all([
      linkIngredients(client, recipeId, data.ingredients),
      linkSeasons(client, recipeId, data.season),
      linkTags(client, recipeId, data.tags),
    ]);

    await client.query('COMMIT');
    return (await getRecipe(recipeId))!;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

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
  },
): Promise<Recipe> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE recipes SET name=$1, instructions=$2, prep_time=$3, cook_time=$4, image_url=$5
       WHERE id=$6`,
      [data.name, data.instructions, data.prep_time, data.cook_time, data.image_url ?? null, id],
    );

    // Clear then re-link all junction tables
    await Promise.all([
      client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]),
      client.query('DELETE FROM recipe_seasons WHERE recipe_id = $1', [id]),
      client.query('DELETE FROM recipe_tags WHERE recipe_id = $1', [id]),
    ]);

    await Promise.all([
      linkIngredients(client, id, data.ingredients),
      linkSeasons(client, id, data.season),
      linkTags(client, id, data.tags),
    ]);

    await client.query('COMMIT');
    return (await getRecipe(id))!;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteRecipe(id: string): Promise<void> {
  await pool.query('DELETE FROM recipes WHERE id = $1', [id]);
}

export async function getTags(): Promise<{ tag: string; count: number }[]> {
  const { rows } = await pool.query<{ name: string; count: string }>(
    `SELECT t.name, COUNT(rt.recipe_id)::int AS count
     FROM tags t
     LEFT JOIN recipe_tags rt ON t.id = rt.tag_id
     GROUP BY t.id, t.name
     HAVING COUNT(rt.recipe_id) > 0
     ORDER BY count DESC, t.name ASC`,
  );
  return rows.map((r) => ({ tag: r.name, count: Number(r.count) }));
}

// ── Plans ──────────────────────────────────────────────────────────────────────

const PLAN_SQL = `
  SELECT
    p.id,
    p.date::text AS date,
    p.notes,
    p.recipe_id,
    r.name               AS recipe_name,
    r.instructions       AS recipe_instructions,
    r.prep_time          AS recipe_prep_time,
    r.cook_time          AS recipe_cook_time,
    r.image_url          AS recipe_image_url,
    COALESCE(array_agg(DISTINCT i.name) FILTER (WHERE i.name IS NOT NULL), ARRAY[]::text[]) AS recipe_ingredients,
    COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL AND s.name <> 'any'), ARRAY[]::text[]) AS recipe_seasons,
    COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::text[]) AS recipe_tags
  FROM plans p
  LEFT JOIN recipes r             ON p.recipe_id = r.id
  LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
  LEFT JOIN ingredients i         ON ri.ingredient_id = i.id
  LEFT JOIN recipe_seasons rs     ON r.id = rs.recipe_id
  LEFT JOIN seasons s             ON rs.season_id = s.id
  LEFT JOIN recipe_tags rt        ON r.id = rt.recipe_id
  LEFT JOIN tags t                ON rt.tag_id = t.id
`;

export async function getPlan(id: string): Promise<Plan | null> {
  const { rows } = await pool.query(
    `${PLAN_SQL}
     WHERE p.id = $1
     GROUP BY p.id, r.id, r.name, r.instructions, r.prep_time, r.cook_time, r.image_url`,
    [id],
  );
  return rows[0] ? toPlan(rows[0]) : null;
}

export async function getPlans(minDate?: string, maxDate?: string): Promise<Plan[]> {
  const conditions: string[] = [];
  const params: string[] = [];

  if (minDate && maxDate) {
    params.push(minDate, maxDate);
    conditions.push(`p.date >= $1 AND p.date <= $2`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `${PLAN_SQL}
     ${where}
     GROUP BY p.id, r.id, r.name, r.instructions, r.prep_time, r.cook_time, r.image_url
     ORDER BY p.date ASC`,
    params,
  );
  return rows.map(toPlan);
}

export async function createPlan(data: {
  date: string;
  recipeId: string;
  notes: string;
}): Promise<Plan> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO plans (date, recipe_id, notes) VALUES ($1, $2, $3) RETURNING id`,
    [data.date, data.recipeId, data.notes || ''],
  );
  return (await getPlan(rows[0].id))!;
}

export async function updatePlan(
  id: string,
  data: { date: string; recipeId?: string; notes?: string },
): Promise<Plan> {
  await pool.query(
    `UPDATE plans SET date=$1, recipe_id=$2, notes=$3 WHERE id=$4`,
    [data.date, data.recipeId ?? null, data.notes ?? '', id],
  );
  return (await getPlan(id))!;
}

export async function deletePlan(id: string): Promise<void> {
  await pool.query('DELETE FROM plans WHERE id = $1', [id]);
}

// ── Weather cache ──────────────────────────────────────────────────────────────

export type WeatherCacheEntry = {
  date: string;
  high: number;
  low: number;
  weather_code: number;
  updated_at: string;
};

export async function getWeatherCache(dates: string[]): Promise<WeatherCacheEntry[]> {
  if (dates.length === 0) return [];
  const { rows } = await pool.query<WeatherCacheEntry>(
    'SELECT * FROM weather_cache WHERE date = ANY($1)',
    [dates],
  );
  return rows;
}

export async function upsertWeatherCache(
  entries: Omit<WeatherCacheEntry, 'updated_at'>[],
): Promise<void> {
  if (entries.length === 0) return;
  await Promise.all(
    entries.map((e) =>
      pool.query(
        `INSERT INTO weather_cache (date, high, low, weather_code, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (date) DO UPDATE
           SET high = EXCLUDED.high,
               low  = EXCLUDED.low,
               weather_code = EXCLUDED.weather_code,
               updated_at   = NOW()`,
        [e.date, e.high, e.low, e.weather_code],
      ),
    ),
  );
}
