'use client';
import { useActionState } from 'react';
import { addUser } from '@/app/actions';
import Icon from './Icon';

export default function UserCreateForm() {
  const [res, action, busy] = useActionState(addUser, null);
  return (
    <form action={action} className="toolbar" style={{ borderBottom: 0 }}>
      <input name="username" placeholder="Username" required autoCapitalize="none" />
      <input name="name" placeholder="Full name" />
      <input name="password" placeholder="Password" required minLength={4} />
      <select name="role"><option value="moderator">Moderator</option><option value="admin">Admin</option></select>
      {res?.err && <div className="err" role="alert">{res.err}</div>}
      {res?.ok && <div className="ok" role="status">{res.ok}</div>}
      <button className="btn sm" disabled={busy}><Icon n="plus" size="sm" />{busy ? 'Adding…' : 'Add user'}</button>
    </form>
  );
}
