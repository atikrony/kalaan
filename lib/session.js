import { cookies } from 'next/headers';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
import { verify } from './auth';
import { db } from './db';

export async function getUser() { return verify((await cookies()).get('auth')?.value); }

export function hashPass(p) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(p, salt, 32).toString('hex');
}
export function checkPass(p, stored) {
  const [salt, h] = (stored || '').split(':');
  if (!salt || !h) return false;
  return timingSafeEqual(Buffer.from(h, 'hex'), scryptSync(p, salt, 32));
}

// Write an audit log row and prune anything older than 30 days
export async function log(user, action, entity, entity_id, details) {
  const c = db();
  await c.from('logs').insert({ username: user?.username || '?', action, entity, entity_id: entity_id == null ? null : String(entity_id), details: details || null });
  await c.from('logs').delete().lt('created_at', new Date(Date.now() - 30 * 864e5).toISOString());
}

// Only the fields that actually changed: { field: [old, new] }
export function diff(oldRow = {}, newRow = {}) {
  const d = {};
  for (const k of Object.keys(newRow)) {
    const a = oldRow[k], b = newRow[k];
    if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null) && String(a ?? '') !== String(b ?? '')) d[k] = [a ?? null, b ?? null];
  }
  return d;
}
