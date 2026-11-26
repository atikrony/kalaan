import { redirect } from 'next/navigation';
import { all, byIdDesc } from '@/lib/store';
import { getUser } from '@/lib/session';
import { code } from '@/lib/util';
export const dynamic = 'force-dynamic';

const fmt = (v) => (Array.isArray(v) ? `${v.length} image(s)` : v === null || v === undefined ? '—' : String(v));
const link = (l) => {
  if (!l.entity_id) return '';
  if (['order', 'payment'].includes(l.entity)) return <a className="pri strong" href={`/?o=${l.entity_id}`}>{code(l.entity_id)}</a>;
  if (['shipment', 'purchase'].includes(l.entity)) return <a className="pri" href={`/?s=${l.entity_id}`}>Shipment #{l.entity_id}</a>;
  return l.entity_id;
};
const ACT = { create: 'b-green', update: 'b-blue', status: 'b-violet', delete: 'b-red', login: '' };

export default async function Logs({ searchParams }) {
  if ((await getUser())?.role !== 'admin') redirect('/');
  const sp = await searchParams;
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  let [logs, users] = await Promise.all([all('logs'), all('users')]);
  logs = logs.filter((l) => l.created_at >= since && (!sp.user || l.username === sp.user) && (!sp.entity || l.entity === sp.entity) && (!sp.id || l.entity_id === sp.id))
    .sort(byIdDesc).slice(0, 500);
  return (<>
    <div className="page-head"><div><h1>Activity log</h1><p>Every change in the last 30 days — who changed what, old → new.</p></div></div>
    <section className="card">
      <form className="toolbar">
        <select name="user" defaultValue={sp.user || ''}><option value="">All users</option><option>admin</option>{users.map((u) => <option key={u.username}>{u.username}</option>)}</select>
        <select name="entity" defaultValue={sp.entity || ''}><option value="">Everything</option>{['order', 'payment', 'shipment', 'purchase', 'user'].map((e) => <option key={e}>{e}</option>)}</select>
        <input name="id" defaultValue={sp.id} placeholder="Order / shipment no." style={{ width: 180 }} />
        <button className="btn ghost sm">Filter</button>{(sp.user || sp.entity || sp.id) && <a href="/logs" className="btn ghost sm">Reset</a>}
      </form>
      <div className="tbl-wrap"><table>
        <thead><tr><th>When</th><th>User</th><th>Action</th><th>On</th><th>Changes</th></tr></thead>
        <tbody>{logs.map((l) => <tr key={l.id} style={{ verticalAlign: 'top' }}>
          <td className="nowrap mute">{new Date(l.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' })}</td>
          <td><a href={`?user=${l.username}`} className="strong">{l.username}</a></td>
          <td className="nowrap"><span className={`badge ${ACT[l.action] || ''}`}>{l.action}</span> <span className="mute">{l.entity}</span></td>
          <td className="nowrap">{link(l)}</td>
          <td className="diff">{l.details && Object.entries(l.details).filter(([, v]) => v !== undefined).map(([k, v]) =>
            <div key={k}><span className="mute">{k}:</span> {Array.isArray(v) && v.length === 2 ? <><s>{fmt(v[0])}</s> → <b>{fmt(v[1])}</b></> : fmt(v)}</div>)}</td>
        </tr>)}</tbody>
      </table>{!logs.length && <div className="empty">No activity found.</div>}</div>
    </section>
  </>);
}
