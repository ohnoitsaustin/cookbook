export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { password } = await request.json();

  console.log('APP_PASSWORD length:', process.env.APP_PASSWORD?.length, '| received length:', password?.length);
  if (password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('session', 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
