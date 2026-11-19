import { db } from '@/lib/db';
import { due, tk, closed } from '@/lib/util';
import OrderCard from '@/components/OrderCard';
export const dynamic = 'force-dynamic';
export default async function Dashboard() {
  const { data: orders = [] } = await db().from('order_view').select('*').order('id', { ascending: false });
  const open = orders.filter((o) => !closed(o.status));
  const count = (s) => orders.filter((o) => o.status === s).length;
  const outstanding = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'refunded').reduce((a, o) => a + Math.max(0, due(o)), 0);
  const collected = orders.reduce((a, o) => a + Number(o.paid), 0);
  const arrived = orders.filter((o) => o.status === 'arrived');
  return (<>
    <h1>Dashboard</h1>
    <div className="stats">
      <div className="card stat"><small>Open orders</small><b>{open.length}</b></div>
      <div className="card stat"><small>Advance pending</small><b>{count('pending')}</b></div>
      <div className="card stat"><small>To purchase</small><b>{count('confirmed')}</b></div>
      <div className="card stat"><small>Arrived, not delivered</small><b>{arrived.length}</b></div>
      <div className="card stat"><small>Total collected</small><b>{tk(collected)}</b></div>
      <div className="card stat"><small>Customer dues</small><b className="due">{tk(outstanding)}</b></div>
    </div>
    <h2>Arrived – ready to deliver ({arrived.length})</h2>
    <div className="grid">{arrived.map((o) => <OrderCard key={o.id} o={o} />)}</div>
    <h2>Latest orders</h2>
    <div className="grid">{orders.slice(0, 12).map((o) => <OrderCard key={o.id} o={o} />)}</div>
  </>);
}
