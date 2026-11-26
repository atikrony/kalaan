'use client';
import { useActionState } from 'react';
import { addUser } from '@/app/actions';
import Icon from './Icon';

export default function UserCreateForm() {
  const [res, action, busy] = useActionState(addUser, null);
  const v = res?.err ? res.values || {} : {};
  return (
    <form action={action} className="toolbar" style={{ borderBottom: 0 }} key={res ? JSON.stringify(res) : 'new'}>
      <input name="username" placeholder="Username" required autoCapitalize="none" defaultValue={v.username} />
      <input name="name" placeholder="Full name" defaultValue={v.name} />
      <input name="password" type="password" placeholder="Password" required minLength={4} autoComplete="new-password" />
      <select name="role" defaultValue={v.role || 'moderator'}><option value="moderator">Moderator</option><option value="admin">Admin</option></select>
      {res?.err && <div className="err" role="alert">{res.err}</div>}
      {res?.ok && <div className="ok" role="status">{res.ok}</div>}
      <button className="btn sm" disabled={busy}><Icon n="plus" size="sm" />{busy ? 'Adding…' : 'Add user'}</button>
    </form>
  );
}
