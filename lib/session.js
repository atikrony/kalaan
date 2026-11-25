import { cookies } from 'next/headers';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
import { verify } from './auth';
import { all, put, del } from './store';

export async function getUser() { return verify((await cookies()).get('auth')?.value); }

// Passwords are stored as salted scrypt hashes (never plain text)
export function hashPass(p) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(p, salt, 32).toString('hex');
}
export function checkPass(p, stored) {
  const [salt, h] = (stored || '').split(':');
  if (!salt || !h) return false;
  return timingSafeEqual(Buffer.from(h, 'hex'), scryptSync(p, salt, 32));
}

const DAYS30 = 30 * 864e5;
export async function log(user, action, entity, entity_id, details) {
  await put('logs', { username: user?.username || '?', action, entity, entity_id: entity_id == null ? null : String(entity_id), details: details || null, created_at: new Date().toISOString() });
  if (Math.random() < 0.1) { // prune occasionally
    const old = (await all('logs')).filter((l) => Date.now() - new Date(l.created_at) > DAYS30).map((l) => l.id);
    await del('logs', old);
  }
}

export function diff(oldRow = {}, newRow = {}) {
  const d = {};
  for (const k of Object.keys(newRow)) {
    const a = oldRow[k], b = newRow[k];
    if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null) && String(a ?? '') !== String(b ?? '')) d[k] = [a ?? null, b ?? null];
  }
  return d;
}

// Initial logins from the USERS env var (set in Vercel):
//   USERS=alice:secret:admin,bob:pass123   (role optional, defaults to moderator)
// Once a user changes their password in Settings, the stored hash takes over.
export function envUsers() {
  return String(process.env.USERS || '').split(/[,\n]/).map((s) => s.trim()).filter(Boolean).map((e) => {
    const p = e.split(':');
    const username = p.shift().trim().toLowerCase();
    const role = ['admin', 'moderator'].includes(p[p.length - 1]) && p.length > 1 ? p.pop() : 'moderator';
    return { username, password: p.join(':'), role, name: username };
  }).filter((u) => u.username && u.password);
}

// Returns the user if username/password are valid (stored account wins over env)
export async function authenticate(username, password) {
  const found = (await all('users')).find((u) => u.username === username);
  if (found) return found.active && checkPass(password, found.pass_hash) ? found : null;
  const e = envUsers().find((u) => u.username === username);
  if (!e) return null;
  const a = Buffer.from(password), b = Buffer.from(e.password);
  return a.length === b.length && timingSafeEqual(a, b) ? { username: e.username, role: e.role, name: e.name } : null;
}
