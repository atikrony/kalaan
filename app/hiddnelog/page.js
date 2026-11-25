import { notFound } from 'next/navigation';
import { all, byIdDesc } from '@/lib/store';
import { getUser } from '@/lib/session';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

const when = (d) => new Date(d).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const val = (v) => (v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const ACT = { create: 'b-green', update: 'b-blue', status: 'b-violet', delete: 'b-red', login: 'b-green', logout: '', login_failed: 'b-red' };

// Hidden full audit trail: only the sysad user, not linked anywhere
export default async function HiddenLog({ searchParams }) {
  if ((await getUser())?.username !== 'sysad') notFound();
  const sp = await searchParams;
  let logs = (await all('logs')).sort(byIdDesc);
  const users = [...new Set(logs.map((l) => l.username))].sort();
  const actions = [...new Set(logs.map((l) => l.action))].sort();
  logs = logs.filter((l) => (!sp.user || l.username === sp.user) && (!sp.action || l.action === sp.action) &&
    (!sp.q || JSON.stringify(l).toLowerCase().includes(sp.q.toLowerCase())));
  return (<>
    <div className="page-head"><div><h1>Full activity log</h1><p>Every sign-in, sign-out, failed login and change, newest first ({logs.length} entries, Dhaka time).</p></div></div>
    <section className="card">
      <form className="toolbar">
        <select name="user" defaultValue={sp.user || ''}><option value="">All users</option>{users.map((u) => <option key={u}>{u}</option>)}</select>
        <select name="action" defaultValue={sp.action || ''}><option value="">All actions</option>{actions.map((a) => <option key={a}>{a}</option>)}</select>
        <input name="q" defaultValue={sp.q} placeholder="Search anything…" style={{ width: 200 }} />
        <button className="btn ghost sm">Filter</button>{(sp.user || sp.action || sp.q) && <a href="/hiddnelog" className="btn ghost sm">Reset</a>}
      </form>
      <div className="tbl-wrap"><table>
        <thead><tr><th>Date & time</th><th>User</th><th>Action</th><th>What</th><th>Details</th></tr></thead>
        <tbody>{logs.map((l) => <tr key={l.id} style={{ verticalAlign: 'top' }}>
          <td className="nowrap mute">{when(l.created_at)}</td>
          <td className="strong">{l.username}</td>
          <td className="nowrap"><span className={`badge ${ACT[l.action] || ''}`}>{l.action}</span></td>
          <td className="nowrap">{l.entity}{l.entity_id ? ` #${l.entity_id}` : ''}</td>
          <td className="diff">{l.details && Object.entries(l.details).map(([k, v]) =>
            <div key={k}><span className="mute">{k}:</span> {Array.isArray(v) && v.length === 2 ? <><s>{val(v[0])}</s> → <b>{val(v[1])}</b></> : val(v)}</div>)}</td>
        </tr>)}</tbody>
      </table>{!logs.length && <div className="empty">No activity recorded.</div>}</div>
    </section>
  </>);
}
