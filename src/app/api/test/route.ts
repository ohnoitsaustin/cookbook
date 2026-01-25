import { createClient } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const client = createClient({
      connectionString: process.env.POSTGRES_URL,
    });
    await client.connect();
    const result = await client.query('SELECT NOW()');
    await client.end();
    return NextResponse.json({ success: true, time: result.rows[0] });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ 
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}