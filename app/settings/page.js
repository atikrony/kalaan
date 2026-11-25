'use client';
import { useActionState } from 'react';
import { changePassword } from '../actions';
import Icon from '@/components/Icon';

export default function Settings() {
  const [res, act, busy] = useActionState(changePassword, null);
  return (<>
    <div className="page-head"><div><h1>Settings</h1><p>Change the password you use to sign in.</p></div></div>
    <section className="card" style={{ maxWidth: 440 }}>
      <div className="card-head"><Icon n="users" className="pri" /><h3>Change password</h3></div>
      <form action={act} style={{ padding: 16, display: 'grid', gap: 10 }}>
        <label className="field">Current password<input name="current" type="password" autoComplete="current-password" required /></label>
        <label className="field">New password<input name="password" type="password" autoComplete="new-password" minLength={6} required /></label>
        <label className="field">Confirm new password<input name="confirm" type="password" autoComplete="new-password" minLength={6} required /></label>
        {res?.err && <div className="err">{res.err}</div>}
        {res?.ok && <div className="mute" style={{ color: 'var(--ok, green)' }}>{res.ok}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
      </form>
    </section>
  </>);
}
