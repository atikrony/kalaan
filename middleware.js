import { NextResponse } from 'next/server';
import { verify } from '@/lib/auth';
export async function middleware(req) {
  const p = req.nextUrl.pathname;
  const user = await verify(req.cookies.get('auth')?.value);
  if (p.startsWith('/login')) return user ? NextResponse.redirect(new URL('/', req.url)) : undefined;
  if (!user) return NextResponse.redirect(new URL('/login', req.url));
  if (p.startsWith('/hiddnelog') && user.username !== 'sysad') return NextResponse.rewrite(new URL('/_hidden-404', req.url));
  if (p.startsWith('/users') && user.role !== 'admin' && user.username !== 'sysad') return NextResponse.redirect(new URL('/', req.url));
  if (p.startsWith('/logs') && user.role !== 'admin') return NextResponse.redirect(new URL('/', req.url));
}
export const config = { matcher: ['/((?!_next|favicon).*)'] };
