import { all, get, orderView, byIdDesc } from '@/lib/store';
import { ORDER_STATUS, due } from '@/lib/util';
import OrderCard from '@/components/OrderCard';
import Sheet from '@/components/Sheet';
export const dynamic = 'force-dynamic';
export default async function Orders({ searchParams }) {
  const sp = await searchParams;
  let [orders, ships] = await Promise.all([orderView(), all('shipments')]);
  ships.sort(byIdDesc);
  if (sp.shipment) orders = orders.filter((o) => o.shipment_id === +sp.shipment);
  if (sp.status) orders = orders.filter((o) => o.status === sp.status);
  if (sp.q) {
    const s = sp.q.trim().toLowerCase(), idm = s.match(/^kl-?0*(\d+)$/);
    orders = idm ? orders.filter((o) => o.id === +idm[1]) : orders.filter((o) => [o.customer, o.phone, o.product].join(' ').toLowerCase().includes(s));
  }
  const list = sp.due ? orders.filter((o) => due(o) > 0) : orders;
  const view = sp.view || 'sheet';
  const link = (v) => '?' + new URLSearchParams({ ...sp, view: v });
  return (<>
    <div className="row"><h1>Orders ({list.length})</h1><span className="sp" />
      <a className="btn btn2" href={link(view === 'grid' ? 'sheet' : 'grid')}>{view === 'grid' ? 'Sheet view' : 'Photo view'}</a>
      <a className="btn" href="/orders/new">+ New order</a></div>
    <form className="row card noprint" style={{ marginBottom: 14 }}>
      <input name="q" defaultValue={sp.q} placeholder="Search name, phone, product, KL-0012" style={{ flex: 1, minWidth: 200 }} />
      <select name="shipment" defaultValue={sp.shipment}><option value="">All shipments</option>{ships.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <select name="status" defaultValue={sp.status}><option value="">All status</option>{ORDER_STATUS.map((s) => <option key={s}>{s}</option>)}</select>
      <label className="row"><input type="checkbox" name="due" value="1" defaultChecked={!!sp.due} /> Has due</label>
      <input type="hidden" name="view" value={view} /><button>Filter</button>
    </form>
    {view === 'grid' ? <div className="grid">{list.map((o) => <OrderCard key={o.id} o={o} />)}</div>
      : <Sheet key={JSON.stringify(sp)} orders={list} ships={ships} defShip={+sp.shipment || ships.find((s) => s.status === 'collecting')?.id} />}
  </>);
}
