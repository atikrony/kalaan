'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteUser, updateUser } from '@/app/actions';
import { act } from '@/lib/act';
import Icon from './Icon';
import Modal from './Modal';

export default function UserManagementTable({ users }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [del, setDel] = useState(null);

  async function save(username, patch) {
    setBusy(username);
    setErr('');
    try {
      await act(updateUser(username, patch));
      router.refresh();
      return true;
    } catch (e) {
      setErr(e.message || 'Could not update user.');
      return false;
    } finally {
      setBusy('');
    }
  }

  async function confirmDelete() {
    setBusy(del.username);
    setErr('');
    try {
      await act(deleteUser(del.username));
      setDel(null);
      router.refresh();
    } catch (e) {
      setErr(e.message || 'Could not delete user.');
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="card">
      {err && !del && <div className="err" role="alert" style={{ margin: 16 }}>{err}</div>}
      <div className="tbl-wrap"><table>
        <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Reset password</th><th className="r">Access</th></tr></thead>
        <tbody>{users.map((user) => {
          const protectedUser = user.protected || user.username === 'sysad';
          const active = user.active !== false;
          const isBusy = busy === user.username;
          return (
            <tr key={user.username}>
              <td><a href={`/logs?user=${encodeURIComponent(user.username)}`} className="strong">{user.name || user.username}</a>
                <div className="mute" style={{ fontSize: 12 }}>@{user.username} · {user.source}</div></td>
              <td>{protectedUser
                ? <span className={`badge ${user.role === 'admin' ? 'b-violet' : 'b-blue'}`}>{user.role}</span>
                : <select aria-label={`Role for ${user.username}`} value={user.role} disabled={isBusy}
                    onChange={(e) => save(user.username, { role: e.target.value })}>
                    <option value="moderator">Moderator</option><option value="admin">Admin</option>
                  </select>}</td>
              <td><span className={`badge ${active ? 'b-green' : 'b-red'}`}>{active ? 'Active' : 'Disabled'}</span></td>
              <td>{protectedUser
                ? <span className="mute">Managed separately</span>
                : <form className="row" style={{ gap: 6, flexWrap: 'nowrap' }} onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const password = String(new FormData(form).get('password') || '');
                    if (await save(user.username, { password })) form.reset();
                  }}>
                    <input name="password" type="password" placeholder="New password" minLength={4} required
                      disabled={isBusy} style={{ width: 160, minHeight: 34 }} />
                    <button className="btn ghost sm" disabled={isBusy}>Set</button>
                  </form>}</td>
              <td className="r nowrap">
                {!protectedUser && <>
                  <button type="button" className={`btn sm ${active ? 'danger' : 'okb'}`} disabled={isBusy}
                    onClick={() => save(user.username, { active: !active })}>{active ? 'Disable' : 'Enable'}</button>{' '}
                  <button type="button" className="btn danger sm" disabled={isBusy}
                    onClick={() => { setErr(''); setDel(user); }}><Icon n="trash" size="sm" />Delete</button>
                </>}
              </td>
            </tr>
          );
        })}</tbody>
      </table>{!users.length && <div className="empty">No team members yet.</div>}</div>

      {del && <Modal size="sm" title="Delete user?" onClose={() => !busy && setDel(null)}
        foot={<>{err && <span className="err">{err}</span>}<span className="sp" />
          <button type="button" className="btn ghost" onClick={() => setDel(null)} disabled={!!busy}>Cancel</button>
          <button type="button" className="btn danger" onClick={confirmDelete} disabled={!!busy}>
            <Icon n="trash" size="sm" />{busy ? 'Deleting…' : 'Delete user'}
          </button></>}>
        <div className="err" style={{ marginBottom: 12 }}><b>Warning:</b> the user may lose access immediately.</div>
        <p style={{ margin: 0 }}>Delete <b>{del.name || del.username}</b> (@{del.username})?</p>
        {del.envBacked && <p className="mute" style={{ marginBottom: 0 }}>This account comes from Vercel's USERS environment variable. Deleting here disables it; remove it from that variable as well to remove the source account.</p>}
      </Modal>}
    </section>
  );
}
