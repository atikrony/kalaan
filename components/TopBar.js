'use client';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Icon from './Icon';
import OrderModal from './OrderModal';
import ShipmentModal from './ShipmentModal';
import { logout } from '@/app/actions';

// Any client component can open a modal: openModal('order' | 'shipment', data)
export const openModal = (kind, data = {}) => window.dispatchEvent(new CustomEvent('kl:open', { detail: { kind, data } }));

export default function TopBar({ user, ships }) {
  const path = usePathname(), sp = useSearchParams();
  const [modal, setModal] = useState(null);
  const [menu, setMenu] = useState(false);
  const [nav, setNav] = useState(false);
  const isAdmin = user.role === 'admin';
  const canManageUsers = isAdmin || user.username === 'sysad';
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setDark(t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);
  const toggleTheme = () => {
    const t = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('theme', t); } catch {}
    setDark(!dark);
  };

  useEffect(() => {
    const h = (e) => setModal(e.detail);
    window.addEventListener('kl:open', h);
    return () => window.removeEventListener('kl:open', h);
  }, []);
  useEffect(() => { setMenu(false); setNav(false); }, [path, sp]);

  const links = [['/', 'Orders'], ['/reconciliation', 'Reconciliation'], ['/customers', 'Customers'],
    ...(canManageUsers ? [['/users', 'Team']] : []), ...(isAdmin ? [['/logs', 'Activity']] : [])];
  const active = (h) => (h === '/' ? path === '/' : path.startsWith(h));
  const initials = (user.name || user.username).split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const defShip = sp.get('s') && sp.get('s') !== 'none' ? +sp.get('s') : ships.find((s) => s.status === 'collecting')?.id;

  return (<>
    <header className="top">
      <button className="btn ghost icon burger" onClick={() => setNav(!nav)} aria-label="Menu"><Icon n="menu" /></button>
      <a href="/" className="brand"><span className="logo"><Icon n="logo" /></span><span>Kalaan ERP</span></a>
      <nav className={`nav ${nav ? 'open' : ''}`}>{links.map(([h, t]) => <a key={h} href={h} className={active(h) ? 'on' : ''}>{t}</a>)}</nav>
      <form action="/" className="search">
        <div className="search-box">
        <Icon n="search" size="sm" />
        <input onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
          onFocus={(e) => { // grow to ~800px, but stop just after the "Orders" tab
            const box = e.currentTarget.parentElement, right = box.getBoundingClientRect().right;
            const tab = document.querySelector('.nav a'), stop = tab && tab.offsetParent ? tab.getBoundingClientRect().right + 12 : box.getBoundingClientRect().left;
            box.style.setProperty('--sw', Math.max(box.offsetWidth, Math.min(800, right - stop)) + 'px');
          }} name="q" key={sp.get('q')} defaultValue={sp.get('q') || ''} placeholder="Search KL-0012, customer, phone, product…" aria-label="Search orders" />
        </div>
      </form>
      <button className="btn ghost hide-md" onClick={() => openModal('shipment')}><Icon n="truck" size="sm" />New Shipment</button>
      <button className="btn" onClick={() => openModal('order', { shipment_id: defShip })}><Icon n="plus" size="sm" /><span className="hide-sm">New Order</span></button>
      <button className="btn ghost icon theme-btn" onClick={toggleTheme} title={dark ? 'Switch to light theme' : 'Switch to dark theme'} aria-label="Toggle theme"><Icon n={dark ? 'sun' : 'moon'} /></button>
      <div className="menu">
        <button className="avatar" onClick={() => setMenu(!menu)} aria-label="Account">{initials}</button>
        {menu && <div className="menu-pop">
          <div className="who"><b>{user.name || user.username}</b><div className="mute" style={{ fontSize: 12 }}>@{user.username} · {user.role}</div></div>
          <button onClick={() => openModal('shipment')}><Icon n="truck" size="sm" />New shipment</button>
          <a href="/settings"><Icon n="users" size="sm" />Settings</a>
          {canManageUsers && <a href="/users"><Icon n="users" size="sm" />Team & access</a>}
          {isAdmin && <a href="/logs"><Icon n="clock" size="sm" />Activity log</a>}
          <form action={logout}><button><Icon n="logout" size="sm" />Log out</button></form>
        </div>}
      </div>
    </header>
    {modal?.kind === 'order' && <OrderModal order={modal.data} ships={ships} onClose={() => setModal(null)} />}
    {modal?.kind === 'shipment' && <ShipmentModal ship={modal.data} isAdmin={isAdmin} onClose={() => setModal(null)} />}
  </>);
}
