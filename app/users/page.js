import { all, get, orderView, byIdDesc } from '@/lib/store';
import { addUser, updateUser } from '@/app/actions';
export const dynamic = 'force-dynamic';
export default async function Users() {
  const users = (await all('users')).sort((a, b) => a.id - b.id);
  return (<>
    <h1>Users</h1>
    <p className="mute">The owner logs in as <b>admin</b> with the APP_PASSWORD. Add each moderator below.</p>
    <form action={addUser} className="row card" style={{ marginBottom: 14 }}>
      <input name="username" placeholder="username" required autoCapitalize="none" />
      <input name="name" placeholder="Full name" />
      <input name="password" placeholder="password" required minLength={4} />
      <select name="role"><option>moderator</option><option>admin</option></select>
      <button>+ Add user</button>
    </form>
    <div style={{ overflowX: 'auto' }}><table><thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Status</th><th>Reset password</th><th></th></tr></thead>
      <tbody>{users.map((x) => <tr key={x.id}>
        <td><a href={`/logs?user=${x.username}`}><b>{x.username}</b></a></td><td>{x.name}</td><td>{x.role}</td>
        <td className={x.active ? 'paid' : 'due'}>{x.active ? 'Active' : 'Disabled'}</td>
        <td><form action={updateUser} className="row"><input type="hidden" name="id" value={x.id} />
          <input name="password" placeholder="new password" minLength={4} required style={{ width: 130 }} /><button className="btn2">Set</button></form></td>
        <td><form action={updateUser}><input type="hidden" name="id" value={x.id} /><input type="hidden" name="active" value={String(!x.active)} />
          <button className={x.active ? 'danger' : ''}>{x.active ? 'Disable' : 'Enable'}</button></form></td>
      </tr>)}</tbody></table></div>
  </>);
}
