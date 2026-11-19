import { NextResponse } from 'next/server';
import { verify } from '@/lib/auth';
export async function middleware(req) {
  const p = req.nextUrl.pathname;
  if (p.startsWith('/login')) return;
  const user = await verify(req.cookies.get('auth')?.value);
  if (!user) return NextResponse.redirect(new URL('/login', req.url));
  if ((p.startsWith('/users') || p.startsWith('/logs')) && user.role !== 'admin') return NextResponse.redirect(new URL('/', req.url));
}
export const config = { matcher: ['/((?!_next|favicon).*)'] };
