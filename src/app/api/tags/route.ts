export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getTags } from '@/src/lib/db';

export async function GET() {
  try {
    const tags = await getTags();
    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}
