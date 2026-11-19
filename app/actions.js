'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { put as blobPut } from '@vercel/blob';
import fs from 'fs/promises';
import path from 'path';
import { all, get, put, del } from '@/lib/store';
import { sign } from '@/lib/auth';
import { getUser, log, diff, hashPass, checkPass } from '@/lib/session';

const f = (fd, k) => { const v = fd.get(k); return v === '' || v == null ? null : String(v); };
const num = (fd, k) => Number(fd.get(k)) || 0;
const id = (fd, k = 'id') => (f(fd, k) ? Number(fd.get(k)) : null);
const today = () => new Date().toISOString().slice(0, 10);
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
  else {
    const found = (await all('users')).find((u) => u.username === username);
    if (found?.active && checkPass(password, found.pass_hash)) user = found;
  }
  if (!user) return 'Wrong username or password';
  (await cookies()).set('auth', await sign(user), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' });
  await log(user, 'login', 'user', user.username);
  redirect('/');
}
export async function logout() { (await cookies()).delete('auth'); redirect('/login'); }

/* ---------- users (admin) ---------- */
export async function addUser(fd) {
  const u = await me(true);
  const username = String(fd.get('username')).trim().toLowerCase();
  if (username === 'admin' || (await all('users')).some((x) => x.username === username)) throw new Error('Username taken');
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
  const images = [...fd.getAll('keep'), ...(await upload(fd.getAll('images')))];
  const row = {
    shipment_id: id(fd, 'shipment_id'), order_date: f(fd, 'order_date'), source: f(fd, 'source'),
    customer: f(fd, 'customer'), phone: f(fd, 'phone'), address: f(fd, 'address'),
    product: f(fd, 'product'), qty: num(fd, 'qty') || 1, images,
    buy_rm: num(fd, 'buy_rm'), bill: num(fd, 'bill'), delivery_charge: num(fd, 'delivery_charge'),
    cod_charge: num(fd, 'cod_charge'), status: f(fd, 'status') || 'pending', note: f(fd, 'note'),
  };
  if (oid) {
    const old = await get('orders', oid);
    await put('orders', { ...old, ...row });
    const d = diff(old, row);
    if (Object.keys(d).length) await log(u, 'update', 'order', oid, d);
    done(); return oid;
  }
  const o = await put('orders', { ...row, created_at: new Date().toISOString() });
  const adv = num(fd, 'advance');
  if (adv) await put('payments', { order_id: o.id, amount: adv, kind: 'advance', method: f(fd, 'method'), paid_on: today() });
  await log(u, 'create', 'order', o.id, { customer: row.customer, product: row.product, bill: row.bill, advance: adv || undefined });
  done(); return o.id;
}

export async function deleteOrder(fd) {
  const u = await me(), oid = id(fd), old = await get('orders', oid);
  await del('orders', oid);
  await del('payments', (await all('payments')).filter((p) => p.order_id === oid).map((p) => p.id));
  await log(u, 'delete', 'order', oid, { customer: old?.customer, product: old?.product, bill: old?.bill });
  done(); redirect('/orders');
}

export async function setStatus(fd) {
  const u = await me(), o = await get('orders', id(fd)), status = f(fd, 'status');
  const before = o.status; o.status = status;
  await put('orders', o);
  await log(u, 'status', 'order', o.id, { status: [before, status] }); done();
}

export async function addPayment(fd) {
  const u = await me();
  const row = await put('payments', { order_id: id(fd, 'order_id'), amount: num(fd, 'amount'), kind: f(fd, 'kind'), method: f(fd, 'method'), paid_on: f(fd, 'paid_on') || today(), note: f(fd, 'note') });
  await log(u, 'create', 'payment', row.order_id, { amount: row.amount, kind: row.kind, method: row.method, note: row.note }); done();
}
export async function deletePayment(fd) {
  const u = await me(), p = await get('payments', id(fd));
  await del('payments', p.id);
  await log(u, 'delete', 'payment', p.order_id, { amount: p.amount, kind: p.kind, method: p.method }); done();
}

/* ---------- shipments ---------- */
export async function saveShipment(fd) {
  const u = await me(), sid = id(fd);
  const row = { name: f(fd, 'name'), status: f(fd, 'status') || 'collecting', rate: num(fd, 'rate'), cargo_cost: num(fd, 'cargo_cost'), note: f(fd, 'note') };
  if (sid) {
    const old = await get('shipments', sid);
    await put('shipments', { ...old, ...row });
    await log(u, 'update', 'shipment', sid, diff(old, row));
    return done();
  }
  const s = await put('shipments', { ...row, created_at: new Date().toISOString() });
  await log(u, 'create', 'shipment', s.id, { name: row.name });
  done(); redirect('/shipments/' + s.id);
}
export async function bulkStatus(fd) {
  const u = await me(), sid = id(fd, 'shipment_id'), status = f(fd, 'status');
  const list = (await all('orders')).filter((o) => o.shipment_id === sid && !['delivered', 'cancelled', 'refunded'].includes(o.status));
  for (const o of list) await put('orders', { ...o, status });
  await log(u, 'status', 'shipment', sid, { status, orders: list.length }); done();
}
export async function addPurchase(fd) {
  const u = await me();
  const row = await put('purchases', { shipment_id: id(fd, 'shipment_id'), item: f(fd, 'item'), amount_rm: num(fd, 'amount_rm'), bought_on: f(fd, 'bought_on') || today() });
  await log(u, 'create', 'purchase', row.shipment_id, { item: row.item, amount_rm: row.amount_rm }); done();
}
export async function deletePurchase(fd) {
  const u = await me(), p = await get('purchases', id(fd));
  await del('purchases', p.id);
  await log(u, 'delete', 'purchase', p.shipment_id, { item: p.item, amount_rm: p.amount_rm }); done();
}

/* ---------- sheet (inline editing) ---------- */
const NUMS = ['buy_rm', 'bill', 'delivery_charge', 'cod_charge', 'qty', 'shipment_id'];
const clean = (k, v) => (NUMS.includes(k) ? (v === '' || v == null ? (k === 'shipment_id' ? null : 0) : Number(v)) : v === '' ? null : v);

export async function updateOrderField(oid, patch) {
  const u = await me(), old = await get('orders', oid);
  if (!old) throw new Error('Order not found');
  const p = Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, clean(k, v)]));
  const d = diff(old, p);
  if (!Object.keys(d).length) return old;
  const row = await put('orders', { ...old, ...p });
  await log(u, Object.keys(p).length === 1 && p.status ? 'status' : 'update', 'order', oid, d);
  done(); return row;
}

export async function createOrderQuick(data) {
  const u = await me();
  if (!data.customer || !data.product) throw new Error('Customer and product are required');
  const row = Object.fromEntries(['shipment_id', 'customer', 'phone', 'product', 'buy_rm', 'bill', 'delivery_charge', 'cod_charge', 'status', 'note', 'address'].map((k) => [k, clean(k, data[k])]));
  const o = await put('orders', { source: 'Page', qty: 1, images: [], order_date: today(), ...row, status: row.status || (Number(data.advance) ? 'confirmed' : 'pending'), created_at: new Date().toISOString() });
  const adv = Number(data.advance) || 0;
  if (adv) await put('payments', { order_id: o.id, amount: adv, kind: 'advance', method: data.method || 'bKash', paid_on: today() });
  await log(u, 'create', 'order', o.id, { customer: o.customer, product: o.product, bill: o.bill, advance: adv || undefined });
  done(); return { ...o, paid: adv };
}

export async function quickPayment(oid, amount, kind = 'payment', method = 'bKash') {
  const u = await me();
  amount = Number(amount) || 0;
  if (!amount) return;
  await put('payments', { order_id: oid, amount, kind, method, paid_on: today(), note: 'Sheet' });
  await log(u, 'create', 'payment', oid, { amount, kind, method }); done();
}

export async function addOrderImage(fd) {
  const u = await me(), o = await get('orders', Number(fd.get('id')));
  const urls = await upload(fd.getAll('images'));
  o.images = [...(o.images || []), ...urls];
  await put('orders', o);
  await log(u, 'update', 'order', o.id, { images: `+${urls.length} photo` }); done();
  return o.images;
}
