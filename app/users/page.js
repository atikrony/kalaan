import { all } from '@/lib/store';
import { addUser, updateUser } from '@/app/actions';
import Icon from '@/components/Icon';
export const dynamic = 'force-dynamic';

export default async function Users() {
  const users = (await all('users')).sort((a, b) => a.id - b.id);
  return (<>
    <div className="page-head"><div><h1>Team & access</h1><p>The owner signs in as <b>admin</b> with APP_PASSWORD. Add a login for each moderator.</p></div></div>
    <section className="card" style={{ marginBottom: 20 }}>
      <div className="card-head"><Icon n="plus" className="pri" /><h3>Add a team member</h3></div>
      <form action={addUser} className="toolbar" style={{ borderBottom: 0 }}>
        <input name="username" placeholder="Username" required autoCapitalize="none" />
        <input name="name" placeholder="Full name" />
        <input name="password" placeholder="Password" required minLength={4} />
        <select name="role"><option value="moderator">Moderator</option><option value="admin">Admin</option></select>
        <button className="btn sm"><Icon n="plus" size="sm" />Add user</button>
      </form>
    </section>
    <section className="card">
      <div className="tbl-wrap"><table>
        <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Reset password</th><th className="r">Access</th></tr></thead>
        <tbody>{users.map((x) => <tr key={x.id}>
          <td><a href={`/logs?user=${x.username}`} className="strong">{x.name || x.username}</a><div className="mute" style={{ fontSize: 12 }}>@{x.username}</div></td>
          <td><span className={`badge ${x.role === 'admin' ? 'b-violet' : 'b-blue'}`}>{x.role}</span></td>
          <td><span className={`badge ${x.active ? 'b-green' : 'b-red'}`}>{x.active ? 'Active' : 'Disabled'}</span></td>
          <td><form action={updateUser} className="row" style={{ gap: 6, flexWrap: 'nowrap' }}><input type="hidden" name="id" value={x.id} />
            <input name="password" placeholder="New password" minLength={4} required style={{ width: 160, minHeight: 34 }} /><button className="btn ghost sm">Set</button></form></td>
          <td className="r"><form action={updateUser}><input type="hidden" name="id" value={x.id} /><input type="hidden" name="active" value={String(!x.active)} />
            <button className={`btn sm ${x.active ? 'danger' : 'okb'}`}>{x.active ? 'Disable' : 'Enable'}</button></form></td>
        </tr>)}</tbody>
      </table>{!users.length && <div className="empty">No team members yet.</div>}</div>
    </section>
  </>);
}
