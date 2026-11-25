'use client';
import { useActionState } from 'react';
import { login } from '../actions';
import Icon from '@/components/Icon';
import PasswordInput from '@/components/PasswordInput';

export default function Login() {
  const [err, act, busy] = useActionState(login, null);
  return (
    <div className="login">
      <form action={act} className="card">
        <div className="brand" style={{ marginBottom: 6 }}><span className="logo"><Icon n="logo" /></span>Kalaan ERP</div>
        <p className="mute" style={{ margin: '0 0 8px' }}>Sign in to manage pre-orders and shipments.</p>
        <label className="field">Username<input name="username" autoCapitalize="none" autoComplete="username" autoFocus required /></label>
        <label className="field">Password<PasswordInput name="password" autoComplete="current-password" required /></label>
        {err && <div className="err">{err}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
