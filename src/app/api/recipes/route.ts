export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  createRecipe,
  deleteRecipe,
  getRecipes,
  updateRecipe,
} from '@/src/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const recipe = await createRecipe({
      name: body.name,
      ingredients: body.ingredients,
      instructions: body.instructions,
      prep_time: body.prep_time,
      cook_time: body.cook_time,
      season: body.season,
      image_url: body.image_url,
      tags: body.tags || [],
    });

    return NextResponse.json(recipe);
  } catch (error) {
    console.error('Error adding recipe:', error);
    return NextResponse.json({ error: 'Failed to add recipe' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const recipes = await getRecipes();
    return NextResponse.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    const recipe = await updateRecipe(id, {
      name: data.name,
      ingredients: data.ingredients,
      instructions: data.instructions,
      prep_time: data.prep_time,
      cook_time: data.cook_time,
      season: data.season,
      image_url: data.image_url,
      tags: data.tags || [],
    });

    return NextResponse.json(recipe);
  } catch (error) {
    console.error('Error updating recipe:', error);
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Recipe ID required' }, { status: 400 });
    }

    await deleteRecipe(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 });
  }
}
