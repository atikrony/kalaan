// Load data/seed.json into the store (replaces shipments, orders, payments).
// Local:  node scripts/seed.mjs                 -> writes data/db.json
// Vercel: copy KV_REST_API_URL + KV_REST_API_TOKEN from Vercel into .env.local, then run the same command.
import fs from 'fs';
import { Redis } from '@upstash/redis';

for (const line of (fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}
const seed = JSON.parse(fs.readFileSync('data/seed.json', 'utf8'));
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (url && token) {
  const r = new Redis({ url, token });
  for (const [col, rows] of Object.entries(seed)) {
    await r.del(col);
    for (let i = 0; i < rows.length; i += 200)
      await r.hset(col, Object.fromEntries(rows.slice(i, i + 200).map((x) => [x.id, JSON.stringify(x)])));
    await r.set('seq:' + col, Math.max(0, ...rows.map((x) => x.id)));
    console.log('redis', col, rows.length);
  }
} else {
  const db = fs.existsSync('data/db.json') ? JSON.parse(fs.readFileSync('data/db.json', 'utf8')) : {};
  db.seq ||= {};
  for (const [col, rows] of Object.entries(seed)) {
    db[col] = Object.fromEntries(rows.map((x) => [x.id, x]));
    db.seq[col] = Math.max(0, ...rows.map((x) => x.id));
    console.log('local', col, rows.length);
  }
  fs.writeFileSync('data/db.json', JSON.stringify(db));
}
