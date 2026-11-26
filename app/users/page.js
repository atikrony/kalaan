import { all } from '@/lib/store';
import { envUsers } from '@/lib/session';
import Icon from '@/components/Icon';
import UserCreateForm from '@/components/UserCreateForm';
import UserManagementTable from '@/components/UserManagementTable';
export const dynamic = 'force-dynamic';

export default async function Users() {
  const [stored, initialUsers] = await Promise.all([all('users'), Promise.resolve(envUsers())]);
  const envByUsername = new Map(initialUsers.map((user) => [user.username, user]));
  const users = stored.map((user) => ({
    id: user.id, username: user.username, name: user.name, role: user.role,
    active: user.active !== false, source: envByUsername.has(user.username) ? 'USERS environment' : 'Database',
    envBacked: envByUsername.has(user.username), protected: user.username === 'admin' || user.username === 'sysad',
  }));
  for (const user of initialUsers) {
    if (!stored.some((row) => row.username === user.username) && !(user.username === 'admin' && process.env.APP_PASSWORD)) {
      users.push({
        username: user.username, name: user.name, role: user.role, active: true,
        source: 'USERS environment', envBacked: true, protected: user.username === 'sysad',
      });
    }
  }
  if (process.env.APP_PASSWORD && !users.some((user) => user.username === 'admin')) {
    users.push({ username: 'admin', name: 'Owner', role: 'admin', active: true, source: 'APP_PASSWORD', protected: true });
  }
  users.sort((a, b) => a.username.localeCompare(b.username));
  return (<>
    <div className="page-head"><div><h1>Team & access</h1><p>The owner signs in as <b>admin</b> with APP_PASSWORD. Sysad and admins can manage team accounts.</p></div></div>
    <section className="card" style={{ marginBottom: 20 }}>
      <div className="card-head"><Icon n="plus" className="pri" /><h3>Add a team member</h3></div>
      <UserCreateForm />
    </section>
    <UserManagementTable users={users} />
  </>);
}
