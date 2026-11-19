import './globals.css';
import { logout } from './actions';
import { getUser } from '@/lib/session';
export const metadata = { title: 'Kalaan ERP' };
export default async function Layout({ children }) {
  const u = await getUser();
  return (
    <html lang="en"><body>
      {u && <nav>
        <b>KALAAN</b><a href="/">Dashboard</a><a href="/orders">Orders</a><a href="/orders/new">+ New order</a>
        <a href="/shipments">Shipments</a><a href="/customers">Customers</a>
        {u.role === 'admin' && <><a href="/users">Users</a><a href="/logs">Activity log</a></>}
        <form action={logout} className="row"><span style={{ opacity: .7 }}>{u.name} ({u.role})</span><button>Logout</button></form>
      </nav>}
      <main>{children}</main>
    </body></html>
  );
}
