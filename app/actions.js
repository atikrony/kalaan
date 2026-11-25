'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { put as blobPut } from '@vercel/blob';
import fs from 'fs/promises';
import path from 'path';
import { all, get, put, del } from '@/lib/store';
import { sign } from '@/lib/auth';
import { getUser, log, diff, hashPass, authenticate, envUsers } from '@/lib/session';
import { today } from '@/lib/util';

const f = (fd, k) => { const v = fd.get(k); return v === '' || v == null ? null : String(v).trim(); };
const num = (fd, k) => Number(fd.get(k)) || 0;
const id = (fd, k = 'id') => (f(fd, k) ? Number(fd.get(k)) : null);
const done = () => revalidatePath('/', 'layout');
async function me(admin) {
  const u = await getUser();
  if (!u) redirect('/login');
  if (admin && u.role !== 'admin') throw new Error('Admin only');
  return u;
}

/* ---------- auth ---------- */
export async function login(_, fd) {
  const username = String(fd.get('username') || '').trim().toLowerCase(), password = String(fd.get('password') || '');
  let user = null;
  if (username === 'admin' && process.env.APP_PASSWORD && password === process.env.APP_PASSWORD) user = { username: 'admin', role: 'admin', name: 'Owner' };
  else user = await authenticate(username, password);
  if (!user) { await log({ username }, 'login_failed', 'user', username); return 'Wrong username or password'; }
  (await cookies()).set('auth', await sign(user), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' });
  await log(user, 'login', 'user', user.username);
  redirect('/');
}
export async function logout() { const u = await getUser(); if (u) await log(u, 'logout', 'user', u.username); (await cookies()).delete('auth'); redirect('/login'); }

/* ---------- own account ---------- */
export async function changePassword(_, fd) {
  const u = await me();
  if (u.username === 'admin') return { err: 'The owner password is set by APP_PASSWORD in Vercel.' };
  const cur = String(fd.get('current') || ''), next = String(fd.get('password') || ''), again = String(fd.get('confirm') || '');
  if (next.length < 6) return { err: 'New password must be at least 6 characters.' };
  if (next !== again) return { err: 'New passwords do not match.' };
  if (!(await authenticate(u.username, cur))) return { err: 'Current password is wrong.' };
  let row = (await all('users')).find((x) => x.username === u.username);
  if (!row) {
    const e = envUsers().find((x) => x.username === u.username);
    row = { username: u.username, name: e?.name || u.name, role: e?.role || u.role, active: true, created_at: new Date().toISOString() };
  }
  row.pass_hash = hashPass(next);
  try { await put('users', row); } catch (e) { return { err: e.message }; }
  await log(u, 'update', 'user', row.id, { username: row.username, password: 'changed (self)' });
  return { ok: 'Password updated.' };
}

/* ---------- users (admin) ---------- */
export async function addUser(fd) {
  const u = await me(true);
  const username = String(fd.get('username')).trim().toLowerCase();
  if (username === 'admin' || envUsers().some((x) => x.username === username) || (await all('users')).some((x) => x.username === username)) throw new Error('Username taken');
  const row = await put('users', { username, name: f(fd, 'name'), role: f(fd, 'role') || 'moderator', active: true, pass_hash: hashPass(String(fd.get('password'))), created_at: new Date().toISOString() });
  await log(u, 'create', 'user', row.id, { username, role: row.role }); done();
}
export async function updateUser(fd) {
  const u = await me(true), row = await get('users', id(fd));
  const ch = {};
  if (fd.has('active')) row.active = ch.active = fd.get('active') === 'true';
  if (f(fd, 'password')) { row.pass_hash = hashPass(String(fd.get('password'))); ch.password = 'changed'; }
  await put('users', row);
  await log(u, 'update', 'user', row.id, { username: row.username, ...ch }); done();
}

/* ---------- images: Vercel Blob in prod, public/uploads locally ---------- */
async function upload(files) {
  const urls = [];
  for (const file of files) {
    if (!file?.size) continue;
    const name = `orders/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    if (process.env.BLOB_READ_WRITE_TOKEN) urls.push((await blobPut(name, file, { access: 'public', contentType: 'image/jpeg' })).url);
    else {
      const p = path.join(process.cwd(), 'public', 'uploads', name);
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, Buffer.from(await file.arrayBuffer()));
      urls.push('/uploads/' + name);
    }
  }
  return urls;
}

/* ---------- orders ---------- */
export async function saveOrder(fd) {
  const u = await me(), oid = id(fd);
  if (!f(fd, 'customer') || !f(fd, 'product')) throw new Error('Customer and product are required');
  const images = [...fd.getAll('keep'), ...(await upload(fd.getAll('images')))];
  const adv = num(fd, 'advance');
  const row = {
    shipment_id: id(fd, 'shipment_id'), order_date: f(fd, 'order_date') || today(), source: f(fd, 'source') || 'Page',
    customer: f(fd, 'customer'), phone: f(fd, 'phone'), address: f(fd, 'address'),
    product: f(fd, 'product'), qty: num(fd, 'qty') || 1, images,
    buy_rm: num(fd, 'buy_rm'), bill: num(fd, 'bill'), delivery_charge: num(fd, 'delivery_charge'),
    cod_charge: num(fd, 'cod_charge'), status: f(fd, 'status') || (adv ? 'confirmed' : 'pending'), note: f(fd, 'note'),
  };
  if (oid) {
    const old = await get('orders', oid);
    await put('orders', { ...old, ...row });
    const d = diff(old, row);
    if (Object.keys(d).length) await log(u, 'update', 'order', oid, d);
    done(); return { id: oid, shipment_id: row.shipment_id };
  }
  const o = await put('orders', { ...row, created_at: new Date().toISOString() });
  if (adv) await put('payments', { order_id: o.id, amount: adv, kind: 'advance', method: f(fd, 'method') || 'bKash', paid_on: today() });
  await log(u, 'create', 'order', o.id, { customer: row.customer, product: row.product, bill: row.bill, advance: adv || undefined });
  done(); return { id: o.id, shipment_id: row.shipment_id };
}

export async function deleteOrder(oid) {
  const u = await me(), old = await get('orders', oid);
  await del('orders', oid);
  await del('payments', (await all('payments')).filter((p) => p.order_id === oid).map((p) => p.id));
  await log(u, 'delete', 'order', oid, { customer: old?.customer, product: old?.product, bill: old?.bill });
  done();
}

const NUMS = ['buy_rm', 'bill', 'delivery_charge', 'cod_charge', 'qty', 'shipment_id'];
const clean = (k, v) => (NUMS.includes(k) ? (v === '' || v == null ? (k === 'shipment_id' ? null : 0) : Number(v)) : v === '' ? null : v);
export async function updateOrderField(oid, patch) {
  const u = await me(), old = await get('orders', oid);
  if (!old) throw new Error('Order not found');
  const p = Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, clean(k, v)]));
  const d = diff(old, p);
  if (!Object.keys(d).length) return;
  await put('orders', { ...old, ...p });
  await log(u, Object.keys(p).length === 1 && p.status ? 'status' : 'update', 'order', oid, d);
  done();
}

export async function addOrderImages(fd) {
  const u = await me(), o = await get('orders', Number(fd.get('id')));
  const urls = await upload(fd.getAll('images'));
  o.images = [...(o.images || []), ...urls];
  await put('orders', o);
  await log(u, 'update', 'order', o.id, { images: `+${urls.length} photo` }); done();
}
export async function removeOrderImage(oid, url) {
  const u = await me(), o = await get('orders', oid);
  o.images = (o.images || []).filter((x) => x !== url);
  await put('orders', o);
  await log(u, 'update', 'order', o.id, { images: '−1 photo' }); done();
}

/* ---------- payments ---------- */
export async function addPayment(fd) {
  const u = await me();
  const amount = num(fd, 'amount');
  if (!amount) return;
  const row = await put('payments', { order_id: id(fd, 'order_id'), amount, kind: f(fd, 'kind') || 'payment', method: f(fd, 'method'), paid_on: f(fd, 'paid_on') || today(), note: f(fd, 'note') });
  await log(u, 'create', 'payment', row.order_id, { amount: row.amount, kind: row.kind, method: row.method, note: row.note }); done();
}
export async function deletePayment(pid) {
  const u = await me(), p = await get('payments', pid);
  if (!p) return;
  await del('payments', p.id);
  await log(u, 'delete', 'payment', p.order_id, { amount: p.amount, kind: p.kind, method: p.method }); done();
}

/* ---------- shipments ---------- */
export async function saveShipment(fd) {
  const u = await me(), sid = id(fd);
  if (!f(fd, 'name')) throw new Error('Shipment name is required');
  const row = {
    name: f(fd, 'name'), status: f(fd, 'status') || 'collecting', mode: f(fd, 'mode'),
    carrier: f(fd, 'carrier'), tracking: f(fd, 'tracking'), eta: f(fd, 'eta'),
    rate: num(fd, 'rate'), cargo_cost: num(fd, 'cargo_cost'), note: f(fd, 'note'),
  };
  if (fd.has('track')) { // tracking stage + the date each step happened
    row.track = f(fd, 'track');
    const i = TRACK_KEYS.indexOf(row.track);
    row.track_at = Object.fromEntries(TRACK_KEYS.map((k, j) => [k, j <= i ? f(fd, 'at_' + k) || today() : null]).filter(([, v]) => v));
  }
  if (sid) {
    const old = await get('shipments', sid);
    await put('shipments', { ...old, ...row });
    const d = diff(old, row);
    if (Object.keys(d).length) await log(u, 'update', 'shipment', sid, d);
    done(); return sid;
  }
  const s = await put('shipments', { ...row, created_at: new Date().toISOString() });
  await log(u, 'create', 'shipment', s.id, { name: row.name });
  done(); return s.id;
}
export async function deleteShipment(sid) {
  const u = await me(true);
  if ((await all('orders')).some((o) => o.shipment_id === sid)) throw new Error('Move or delete its orders first');
  const old = await get('shipments', sid);
  await del('shipments', sid);
  await del('purchases', (await all('purchases')).filter((p) => p.shipment_id === sid).map((p) => p.id));
  await log(u, 'delete', 'shipment', sid, { name: old?.name }); done();
}
export async function bulkStatus(sid, status) {
  const u = await me();
  const list = (await all('orders')).filter((o) => o.shipment_id === sid && !['delivered', 'cancelled', 'refunded'].includes(o.status));
  for (const o of list) await put('orders', { ...o, status });
  await log(u, 'status', 'shipment', sid, { status, orders: list.length }); done();
  return list.length;
}
export async function addPurchase(fd) {
  const u = await me();
  const row = await put('purchases', { shipment_id: id(fd, 'shipment_id'), item: f(fd, 'item'), amount_rm: num(fd, 'amount_rm'), bought_on: f(fd, 'bought_on') || today() });
  await log(u, 'create', 'purchase', row.shipment_id, { item: row.item, amount_rm: row.amount_rm }); done();
}
export async function deletePurchase(pid) {
  const u = await me(), p = await get('purchases', pid);
  if (!p) return;
  await del('purchases', p.id);
  await log(u, 'delete', 'purchase', p.shipment_id, { item: p.item, amount_rm: p.amount_rm }); done();
}

/* ---------- data management (sysad only) ---------- */
async function sysad() {
  const u = await me();
  if (u.username !== 'sysad') throw new Error('Not allowed');
  return u;
}
export async function sysadDelete(kind, rid) {
  const u = await sysad();
  rid = Number(rid);
  if (kind === 'shipment') {
    const old = await get('shipments', rid);
    if (!old) throw new Error('Shipment not found');
    const orders = (await all('orders')).filter((o) => o.shipment_id === rid);
    for (const o of orders) await put('orders', { ...o, shipment_id: null });
    await del('purchases', (await all('purchases')).filter((p) => p.shipment_id === rid).map((p) => p.id));
    await del('shipments', rid);
    await log(u, 'delete', 'shipment', rid, { name: old.name, orders_unassigned: orders.length, by: 'data management' });
  } else if (kind === 'order') {
    const old = await get('orders', rid);
    if (!old) throw new Error('Order not found');
    const pays = (await all('payments')).filter((p) => p.order_id === rid);
    await del('payments', pays.map((p) => p.id));
    await del('orders', rid);
    await log(u, 'delete', 'order', rid, { customer: old.customer, product: old.product, bill: old.bill, payments_removed: pays.length, by: 'data management' });
  } else if (kind === 'payment' || kind === 'purchase') {
    const col = kind + 's', old = await get(col, rid);
    if (!old) throw new Error('Not found');
    await del(col, rid);
    await log(u, 'delete', kind, kind === 'payment' ? old.order_id : old.shipment_id, { ...old, id: undefined, by: 'data management' });
  } else throw new Error('Unknown type');
  done();
}
export async function sysadUpdate(kind, rid, patch) {
  const u = await sysad();
  const col = { payment: 'payments', purchase: 'purchases' }[kind];
  if (!col) throw new Error('Unknown type');
  const old = await get(col, Number(rid));
  if (!old) throw new Error('Not found');
  const NUM = ['amount', 'amount_rm'];
  const p = Object.fromEntries(Object.entries(patch).filter(([k]) => k in old || ['note', 'method'].includes(k))
    .map(([k, v]) => [k, NUM.includes(k) ? Number(v) || 0 : v === '' ? null : v]));
  const d = diff(old, p);
  if (!Object.keys(d).length) return;
  await put(col, { ...old, ...p });
  await log(u, 'update', kind, kind === 'payment' ? old.order_id : old.shipment_id, { ...d, by: 'data management' });
  done();
}

/* ---------- parcel tracking ---------- */
const TRACK_KEYS = ['packed', 'my_cargo', 'bd_warehouse', 'received'];
export async function setTrack(sid, stage) {
  const u = await me(), old = await get('shipments', Number(sid));
  if (!old) throw new Error('Shipment not found');
  const i = stage ? TRACK_KEYS.indexOf(stage) : -1;
  if (stage && i < 0) throw new Error('Unknown stage');
  const at = { ...(old.track_at || {}) };
  TRACK_KEYS.forEach((k, j) => { if (j > i) delete at[k]; else if (!at[k]) at[k] = today(); });
  let status = old.status;
  if (status !== 'closed') {
    if (stage === 'received') status = 'arrived';
    else if (stage === 'my_cargo' || stage === 'bd_warehouse') status = 'in_transit';
    else if (['in_transit', 'arrived'].includes(status)) status = 'purchasing';
  }
  await put('shipments', { ...old, track: stage || null, track_at: at, status });
  await log(u, 'update', 'shipment', old.id, { tracking: [old.track || 'not sent', stage || 'not sent'], ...(status !== old.status ? { status: [old.status, status] } : {}) });
  done();
}
