import { all, get, orderView, byIdDesc } from '@/lib/store';
import { code } from '@/lib/util';
export const dynamic = 'force-dynamic';
const link = (l) => {
  if (!l.entity_id) return '';
  if (['order', 'payment'].includes(l.entity)) return <a href={`/orders/${l.entity_id}`}><b>{code(l.entity_id)}</b></a>;
  if (['shipment', 'purchase'].includes(l.entity)) return <a href={`/shipments/${l.entity_id}`}>Shipment #{l.entity_id}</a>;
  return l.entity_id;
};
const show = (d) => d && Object.entries(d).filter(([, v]) => v !== undefined).map(([k, v]) =>
  <div key={k}><span className="mute">{k}:</span> {Array.isArray(v) && v.length === 2 ? <><s className="mute">{fmt(v[0])}</s> → <b>{fmt(v[1])}</b></> : fmt(v)}</div>);
const fmt = (v) => (Array.isArray(v) ? `${v.length} image(s)` : v === null ? '—' : String(v));

export default async function Logs({ searchParams }) {
  const sp = await searchParams;
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  let [logs, users] = await Promise.all([all('logs'), all('users')]);
  logs = logs.filter((l) => l.created_at >= since && (!sp.user || l.username === sp.user) && (!sp.entity || l.entity === sp.entity) && (!sp.id || l.entity_id === sp.id))
    .sort(byIdDesc).slice(0, 500);
  return (<>
    <h1>Activity log <small className="mute">(last 30 days)</small></h1>
    <form className="row card" style={{ marginBottom: 14 }}>
      <select name="user" defaultValue={sp.user}><option value="">All users</option><option>admin</option>{users.map((u) => <option key={u.username}>{u.username}</option>)}</select>
      <select name="entity" defaultValue={sp.entity}><option value="">Everything</option>{['order', 'payment', 'shipment', 'purchase', 'user'].map((e) => <option key={e}>{e}</option>)}</select>
      <input name="id" defaultValue={sp.id} placeholder="Order / shipment no." style={{ width: 160 }} />
      <button>Filter</button>
    </form>
    <div style={{ overflowX: 'auto' }}><table><thead><tr><th>When</th><th>User</th><th>Action</th><th>On</th><th>Changes</th></tr></thead>
      <tbody>{logs.map((l) => <tr key={l.id}>
        <td style={{ whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'short', timeStyle: 'short' })}</td>
        <td><a href={`?user=${l.username}`}><b>{l.username}</b></a></td>
        <td><span className="badge">{l.action}</span> {l.entity}</td><td>{link(l)}</td><td>{show(l.details)}</td></tr>)}</tbody></table></div>
  </>);
}
