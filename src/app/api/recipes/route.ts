import { createClient } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const client = createClient({
      connectionString: process.env.POSTGRES_URL,
    });
    await client.connect();

    const result = await client.query(
      `INSERT INTO recipes (name, ingredients, instructions, prep_time, cook_time, season, temperature_preference)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        body.name,
        body.ingredients,
        body.instructions,
        body.prep_time,
        body.cook_time,
        body.season,
        body.temperature_preference
      ]
    );

    await client.end();
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding recipe:', error);
    return NextResponse.json({ error: 'Failed to add recipe' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const client = createClient({
      connectionString: process.env.POSTGRES_URL,
    });
    await client.connect();

    const result = await client.query('SELECT * FROM recipes ORDER BY created_at DESC');
    
    await client.end();
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    
    const client = createClient({
      connectionString: process.env.POSTGRES_URL,
    });
    await client.connect();

    const result = await client.query(
      `UPDATE recipes 
       SET name = $1, ingredients = $2, instructions = $3, 
           prep_time = $4, cook_time = $5, season = $6, temperature_preference = $7
       WHERE id = $8
       RETURNING *`,
      [
        data.name,
        data.ingredients,
        data.instructions,
        data.prep_time,
        data.cook_time,
        data.season,
        data.temperature_preference,
        id
      ]
    );

    await client.end();
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating recipe:', error);
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const client = createClient({
      connectionString: process.env.POSTGRES_URL,
    });
    await client.connect();

    await client.query('DELETE FROM recipes WHERE id = $1', [id]);
    
    await client.end();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 });
  }
}