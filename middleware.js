import { NextResponse } from 'next/server';
import { verify } from '@/lib/auth';
export async function middleware(req) {
  const p = req.nextUrl.pathname;
  const user = await verify(req.cookies.get('auth')?.value);
  if (p.startsWith('/login')) return user ? NextResponse.redirect(new URL('/', req.url)) : undefined;
  if (!user) return NextResponse.redirect(new URL('/login', req.url));
  if ((p.startsWith('/users') || p.startsWith('/logs') || p.startsWith('/hiddnelog')) && user.role !== 'admin') return NextResponse.redirect(new URL('/', req.url));
}
export const config = { matcher: ['/((?!_next|favicon).*)'] };
