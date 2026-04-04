export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Image generation is not available' }, { status: 501 });
}
