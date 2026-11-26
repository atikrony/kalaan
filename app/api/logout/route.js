import { NextResponse } from 'next/server';

// Used when a signed-in account was deleted or disabled: clear the stale cookie and go to the login page.
export function GET(req) {
  const res = NextResponse.redirect(new URL('/login', req.url));
  res.cookies.delete('auth');
  return res;
}
