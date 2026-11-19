'use client';
import { useActionState } from 'react';
import { login } from '../actions';
export default function Login() {
  const [err, act, busy] = useActionState(login, null);
  return (
    <form action={act} className="card" style={{ maxWidth: 320, margin: '80px auto', display: 'grid', gap: 10 }}>
      <h1>Kalaan ERP</h1>
      <input name="username" placeholder="Username" autoCapitalize="none" autoFocus required />
      <input name="password" type="password" placeholder="Password" required />
      {err && <span className="due">{err}</span>}
      <button disabled={busy}>Login</button>
    </form>
  );
}
