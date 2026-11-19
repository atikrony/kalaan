'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { sign } from '@/lib/auth';
import { getUser, log, diff, hashPass, checkPass } from '@/lib/session';

const f = (fd, k) => { const v = fd.get(k); return v === '' || v == null ? null : v; };
const num = (fd, k) => Number(fd.get(k)) || 0;
const chk = ({ error, data }) => { if (error) throw new Error(error.message); return data; };
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
    const { data } = await db().from('users').select('*').eq('username', username).maybeSingle();
    if (data?.active && checkPass(password, data.pass_hash)) user = data;
  }
  if (!user) return 'Wrong username or password';
  (await cookies()).set('auth', await sign(user), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' });
  await log(user, 'login', 'user', user.username).catch(() => {});
  redirect('/');
}
export async function logout() { (await cookies()).delete('auth'); redirect('/login'); }

/* ---------- users (admin) ---------- */
export async function addUser(fd) {
  const u = await me(true);
  const row = { username: String(fd.get('username')).trim().toLowerCase(), name: f(fd, 'name'), role: fd.get('role') || 'moderator', pass_hash: hashPass(String(fd.get('password'))) };
  if (row.username === 'admin') throw new Error('"admin" is reserved');
  const r = chk(await db().from('users').insert(row).select('id').single());
  await log(u, 'create', 'user', r.id, { username: row.username, role: row.role }); done();
}
export async function updateUser(fd) {
  const u = await me(true), id = fd.get('id');
  const patch = {};
  if (fd.has('active')) patch.active = fd.get('active') === 'true';
  if (f(fd, 'role')) patch.role = fd.get('role');
  if (f(fd, 'password')) patch.pass_hash = hashPass(String(fd.get('password')));
  chk(await db().from('users').update(patch).eq('id', id));
  await log(u, 'update', 'user', id, { ...patch, pass_hash: patch.pass_hash ? 'changed' : undefined }); done();
}

/* ---------- orders ---------- */
async function upload(files) {
  const urls = [];
  for (const file of files) {
    if (!file?.size) continue;
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    chk(await db().storage.from('orders').upload(path, file, { contentType: file.type || 'image/jpeg' }));
    urls.push(db().storage.from('orders').getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

export async function saveOrder(fd) {
  const u = await me(), id = f(fd, 'id');
  const images = [...fd.getAll('keep'), ...(await upload(fd.getAll('images')))];
  const row = {
    shipment_id: f(fd, 'shipment_id'), order_date: f(fd, 'order_date'), source: f(fd, 'source'),
    customer: f(fd, 'customer'), phone: f(fd, 'phone'), address: f(fd, 'address'),
    product: f(fd, 'product'), qty: num(fd, 'qty') || 1, images,
    buy_rm: num(fd, 'buy_rm'), bill: num(fd, 'bill'), delivery_charge: num(fd, 'delivery_charge'),
    cod_charge: num(fd, 'cod_charge'), status: f(fd, 'status') || 'pending', note: f(fd, 'note'),
  };
  let oid = id;
  if (id) {
    const old = chk(await db().from('orders').select('*').eq('id', id).single());
    chk(await db().from('orders').update(row).eq('id', id));
    const d = diff(old, row);
    if (Object.keys(d).length) await log(u, 'update', 'order', id, d);
  } else {
    oid = chk(await db().from('orders').insert(row).select('id').single()).id;
    const adv = num(fd, 'advance');
    if (adv) chk(await db().from('payments').insert({ order_id: oid, amount: adv, kind: 'advance', method: f(fd, 'method') }));
    await log(u, 'create', 'order', oid, { customer: row.customer, product: row.product, bill: row.bill, advance: adv || undefined });
  }
  done();
  return oid;
}

export async function deleteOrder(fd) {
  const u = await me(), id = fd.get('id');
  const old = chk(await db().from('orders').select('customer,product,bill').eq('id', id).single());
  chk(await db().from('orders').delete().eq('id', id));
  await log(u, 'delete', 'order', id, old);
  done(); redirect('/orders');
}

export async function setStatus(fd) {
  const u = await me(), id = fd.get('id'), status = fd.get('status');
  const old = chk(await db().from('orders').select('status').eq('id', id).single());
  chk(await db().from('orders').update({ status }).eq('id', id));
  await log(u, 'status', 'order', id, { status: [old.status, status] }); done();
}

export async function addPayment(fd) {
  const u = await me();
  const row = { order_id: fd.get('order_id'), amount: num(fd, 'amount'), kind: fd.get('kind'), method: f(fd, 'method'), paid_on: f(fd, 'paid_on'), note: f(fd, 'note') };
  chk(await db().from('payments').insert(row));
  await log(u, 'create', 'payment', row.order_id, { amount: row.amount, kind: row.kind, method: row.method, note: row.note }); done();
}
export async function deletePayment(fd) {
  const u = await me(), id = fd.get('id');
  const old = chk(await db().from('payments').select('*').eq('id', id).single());
  chk(await db().from('payments').delete().eq('id', id));
  await log(u, 'delete', 'payment', old.order_id, { amount: old.amount, kind: old.kind, method: old.method }); done();
}

/* ---------- shipments ---------- */
export async function saveShipment(fd) {
  const u = await me(), id = f(fd, 'id');
  const row = { name: f(fd, 'name'), status: f(fd, 'status') || 'collecting', rate: num(fd, 'rate'), cargo_cost: num(fd, 'cargo_cost'), note: f(fd, 'note') };
  if (id) {
    const old = chk(await db().from('shipments').select('*').eq('id', id).single());
    chk(await db().from('shipments').update(row).eq('id', id));
    await log(u, 'update', 'shipment', id, diff(old, row));
  } else {
    const s = chk(await db().from('shipments').insert(row).select('id').single());
    await log(u, 'create', 'shipment', s.id, { name: row.name });
    done(); redirect('/shipments/' + s.id);
  }
  done();
}
export async function bulkStatus(fd) {
  const u = await me(), sid = fd.get('shipment_id'), status = fd.get('status');
  const rows = chk(await db().from('orders').update({ status }).eq('shipment_id', sid).not('status', 'in', '(delivered,cancelled,refunded)').select('id'));
  await log(u, 'status', 'shipment', sid, { status, orders: rows.length }); done();
}
export async function addPurchase(fd) {
  const u = await me();
  const row = { shipment_id: fd.get('shipment_id'), item: f(fd, 'item'), amount_rm: num(fd, 'amount_rm'), bought_on: f(fd, 'bought_on') };
  chk(await db().from('purchases').insert(row));
  await log(u, 'create', 'purchase', row.shipment_id, { item: row.item, amount_rm: row.amount_rm }); done();
}
export async function deletePurchase(fd) {
  const u = await me(), id = fd.get('id');
  const old = chk(await db().from('purchases').select('*').eq('id', id).single());
  chk(await db().from('purchases').delete().eq('id', id));
  await log(u, 'delete', 'purchase', old.shipment_id, { item: old.item, amount_rm: old.amount_rm }); done();
}
