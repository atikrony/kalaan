// Tiny data store.
// Production (Vercel): Redis from Vercel Storage tab (Upstash) — each collection is a hash id -> JSON.
// Local dev (no Redis env): a JSON file at ./data/db.json
import { Redis } from '@upstash/redis';
import fs from 'fs/promises';
import path from 'path';

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const tok = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && tok ? new Redis({ url, token: tok }) : null;

const FILE = path.join(process.cwd(), 'data', 'db.json');
async function readFile() { try { return JSON.parse(await fs.readFile(FILE, 'utf8')); } catch { return {}; } }
async function writeFile(d) { await fs.mkdir(path.dirname(FILE), { recursive: true }); await fs.writeFile(FILE, JSON.stringify(d)); }

export async function all(col) {
  if (redis) return Object.values((await redis.hgetall(col)) || {}).map((v) => (typeof v === 'string' ? JSON.parse(v) : v));
  return Object.values((await readFile())[col] || {});
}
export async function get(col, id) {
  if (id == null) return null;
  if (redis) { const v = await redis.hget(col, String(id)); return typeof v === 'string' ? JSON.parse(v) : v || null; }
  return (await readFile())[col]?.[id] || null;
}
export async function put(col, obj) {
  if (redis) {
    if (!obj.id) obj.id = await redis.incr('seq:' + col);
    await redis.hset(col, { [obj.id]: JSON.stringify(obj) });
    return obj;
  }
  const d = await readFile();
  d.seq ||= {}; d[col] ||= {};
  if (!obj.id) obj.id = d.seq[col] = (d.seq[col] || 0) + 1;
  d[col][obj.id] = obj;
  await writeFile(d);
  return obj;
}
export async function del(col, ids) {
  ids = [].concat(ids).map(String);
  if (!ids.length) return;
  if (redis) return redis.hdel(col, ...ids);
  const d = await readFile();
  ids.forEach((i) => delete d[col]?.[i]);
  await writeFile(d);
}

// Orders with "paid" and "shipment_name" attached (paid = advances + payments - refunds)
export async function orderView() {
  const [orders, pays, ships] = await Promise.all([all('orders'), all('payments'), all('shipments')]);
  const paid = {};
  for (const p of pays) paid[p.order_id] = (paid[p.order_id] || 0) + (p.kind === 'refund' ? -p.amount : +p.amount);
  const sn = Object.fromEntries(ships.map((s) => [s.id, s.name]));
  return orders.map((o) => ({ ...o, paid: paid[o.id] || 0, shipment_name: sn[o.shipment_id] })).sort((a, b) => b.id - a.id);
}
export const byIdDesc = (a, b) => b.id - a.id;
