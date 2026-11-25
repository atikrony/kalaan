'use client';
import { useActionState } from 'react';
import { changePassword } from '@/app/actions';
import Icon from './Icon';
import PasswordInput from './PasswordInput';

export default function PasswordForm() {
  const [res, act, busy] = useActionState(changePassword, null);
  return (
    <section className="card">
      <div className="card-head"><Icon n="user" className="pri" /><h3>Change password</h3></div>
      <form action={act} style={{ padding: 16, display: 'grid', gap: 12 }}>
        <label className="field">Current password<PasswordInput name="current" autoComplete="current-password" required /></label>
        <label className="field">New password<PasswordInput name="password" autoComplete="new-password" minLength={6} required /></label>
        <label className="field">Confirm new password<PasswordInput name="confirm" autoComplete="new-password" minLength={6} required /></label>
        {res?.err && <div className="err">{res.err}</div>}
        {res?.ok && <div style={{ color: 'var(--ok, green)', fontSize: 13 }}>{res.ok}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
      </form>
    </section>
  );
}
