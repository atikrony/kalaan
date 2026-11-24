import { all, orderView, byIdDesc } from '@/lib/store';
import { shipStats } from '@/lib/calc';
import { label, tk, rm, pct, due, code, fmtDate, live, n, METHODS } from '@/lib/util';
import Icon from '@/components/Icon';
export const dynamic = 'force-dynamic';

export default async function Reconciliation({ searchParams }) {
  const sp = await searchParams;
  const [orders, ships, pays, buys] = await Promise.all([orderView(), all('shipments'), all('payments'), all('purchases')]);
  ships.sort(byIdDesc);
  const rows = ships.map((s) => ({ s, x: shipStats(s, orders, buys, pays) }));
  const tot = (k) => rows.reduce((a, r) => a + (r.x[k] || 0), 0);
  const profitRows = rows.filter((r) => r.x.profit != null);
  const totalProfit = profitRows.reduce((a, r) => a + r.x.profit, 0);
  const profitBase = profitRows.reduce((a, r) => a + r.x.bills, 0);

  // Cash in by method, for a period
  const days = +sp.days || 30;
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const recent = pays.filter((p) => (p.paid_on || '') >= since);
  const byMethod = [...METHODS, null].map((m) => {
    const ps = recent.filter((p) => (p.method || null) === m);
    const inn = ps.filter((p) => p.kind !== 'refund').reduce((a, p) => a + n(p.amount), 0);
    const out = ps.filter((p) => p.kind === 'refund').reduce((a, p) => a + n(p.amount), 0);
    return { m: m || 'Other', inn, out, count: ps.length };
  }).filter((r) => r.count);
  const cashIn = byMethod.reduce((a, r) => a + r.inn, 0), cashOut = byMethod.reduce((a, r) => a + r.out, 0);

  const debtors = orders.filter((o) => live(o) && due(o) > 0).sort((a, b) => due(b) - due(a));
  const arrivedDue = debtors.filter((o) => o.status === 'arrived');
  const orderMap = Object.fromEntries(orders.map((o) => [o.id, o]));
  const latest = [...pays].sort((a, b) => String(b.paid_on || '').localeCompare(String(a.paid_on || '')) || b.id - a.id).slice(0, 25);

  return (<>
    <div className="page-head"><div><h1>Reconciliation & financials</h1><p>Batch profitability, receivables and cash collected.</p></div></div>

    <section className="kpis">
      <div className="card kpi"><div className="head"><span className="eyebrow">Total billed</span><Icon n="archive" /></div>
        <div className="val"><span className="big">{tk(tot('bills'))}</span><span className="mute">{tot('count')} orders</span></div></div>
      <div className="card kpi"><div className="head" style={{ color: 'var(--ok)' }}><span className="eyebrow">Collected</span><Icon n="wallet" /></div>
        <div className="val"><span className="big ok">{tk(orders.reduce((a, o) => a + n(o.paid), 0))}</span></div></div>
      <div className="card kpi"><div className="head" style={{ color: 'var(--warn)' }}><span className="eyebrow">Customer dues</span><Icon n="receipt" /></div>
        <div className="val"><span className="big warn">{tk(debtors.reduce((a, o) => a + due(o), 0))}</span><span className="tag amber">{debtors.length} orders</span></div></div>
      <div className="card kpi"><div className="head" style={{ color: 'var(--ok)' }}><span className="eyebrow">Net earned (priced batches)</span><Icon n="trend" /></div>
        <div className="val"><span className={`big ${totalProfit < 0 ? 'bad' : 'ok'}`}>{tk(totalProfit)}</span><span className="tag green">{pct(profitBase ? totalProfit / profitBase : null)} margin</span></div></div>
    </section>

    <section className="card" style={{ marginBottom: 20 }}>
      <div className="card-head"><Icon n="layers" className="pri" /><h3>Batch profitability</h3><span className="sp" /><span className="mute">Profit = bills − (RM spent × rate) − cargo − COD</span></div>
      <div className="tbl-wrap"><table>
        <thead><tr><th>Shipment</th><th>Status</th><th className="r">Orders</th><th className="r">Bills</th><th className="r">Collected</th><th className="r">Due</th>
          <th className="r">Spent (RM)</th><th className="r">Rate</th><th className="r">Cargo</th><th className="r">Net earned</th><th className="r">Margin</th></tr></thead>
        <tbody>{rows.map(({ s, x }) => <tr key={s.id}>
          <td><a href={`/?s=${s.id}`} className="pri strong">{s.name}</a></td>
          <td><span className={`badge b-${s.status}`}>{label(s.status)}</span></td>
          <td className="r money">{x.count}</td><td className="r money">{tk(x.bills)}</td>
          <td className="r money ok">{tk(x.collected)}</td><td className="r money warn">{tk(x.due)}</td>
          <td className="r money">{rm(x.spentRm)}</td><td className="r money">{x.rate ? `৳${x.rate}` : <span className="mute">—</span>}</td>
          <td className="r money">{tk(x.cargo)}</td>
          <td className={`r money strong ${x.profit == null ? 'mute' : x.profit < 0 ? 'bad' : 'ok'}`}>{x.profit == null ? 'set rate' : tk(x.profit)}</td>
          <td className="r money">{pct(x.margin)}</td></tr>)}</tbody>
        <tfoot><tr><td colSpan={2}>Total</td><td className="r">{tot('count')}</td><td className="r">{tk(tot('bills'))}</td><td className="r ok">{tk(tot('collected'))}</td>
          <td className="r warn">{tk(tot('due'))}</td><td className="r">{rm(tot('spentRm'))}</td><td></td><td className="r">{tk(tot('cargo'))}</td>
          <td className={`r ${totalProfit < 0 ? 'bad' : 'ok'}`}>{tk(totalProfit)}</td><td className="r">{pct(profitBase ? totalProfit / profitBase : null)}</td></tr></tfoot>
      </table></div>
    </section>

    <div className="split">
      <section className="card">
        <div className="card-head"><Icon n="wallet" className="warn" /><h3>Receivables</h3><span className="badge b-amber">{debtors.length} with due</span><span className="sp" />
          {arrivedDue.length > 0 && <span className="mute">{arrivedDue.length} arrived & ready to collect</span>}</div>
        <div className="tbl-wrap"><table className="lt">
          <thead><tr><th>Order</th><th>Customer</th><th>Shipment</th><th>Status</th><th className="r">Bill</th><th className="r">Paid</th><th className="r">Due</th></tr></thead>
          <tbody>{debtors.slice(0, 100).map((o) => <tr key={o.id}>
            <td><a className="id" href={`/?o=${o.id}`}>{code(o.id)}</a></td><td className="nowrap">{o.customer}<div className="mute" style={{ fontSize: 12 }}>{o.phone}</div></td>
            <td className="mute nowrap">{o.shipment_name || 'Unassigned'}</td><td><span className={`badge b-${o.status || 'pending'}`}>{label(o.status || 'pending')}</span></td>
            <td className="r money">{tk(+o.bill + n(o.delivery_charge))}</td><td className="r money ok">{tk(o.paid)}</td><td className="r money strong warn">{tk(due(o))}</td></tr>)}</tbody>
        </table>{!debtors.length && <div className="empty">Everyone has paid in full 🎉</div>}</div>
      </section>

      <div className="stack">
        <section className="card">
          <div className="card-head"><Icon n="receipt" className="pri" /><h3>Cash by method</h3><span className="sp" />
            <form className="row" style={{ gap: 6 }}><select name="days" defaultValue={String(days)} className="inline-select">
              {[7, 30, 90, 365].map((d) => <option key={d} value={d}>Last {d} days</option>)}</select><button className="btn ghost xs">Go</button></form></div>
          <div className="pad lines">
            {byMethod.map((r) => <div key={r.m}><span>{r.m} <small className="mute">({r.count})</small></span><span>{tk(r.inn)}{r.out ? <small className="bad"> −{tk(r.out)}</small> : null}</span></div>)}
            {!byMethod.length && <div className="mute">No payments in this period.</div>}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}><span className="strong">Net cash in</span><span className="strong ok">{tk(cashIn - cashOut)}</span></div>
          </div>
        </section>
        <section className="card">
          <div className="card-head"><Icon n="clock" className="pri" /><h3>Latest payments</h3></div>
          <div className="pad pays">{latest.map((p) => { const o = orderMap[p.order_id]; return <div key={p.id}>
            <span className={`badge ${p.kind === 'refund' ? 'b-red' : p.kind === 'advance' ? 'b-blue' : 'b-green'}`}>{p.kind}</span>
            <span className="sp ell"><a className="pri strong" href={`/?o=${p.order_id}`}>{code(p.order_id)}</a> <span className="mute">{o?.customer} · {fmtDate(p.paid_on)} · {p.method || '—'}</span></span>
            <b className={`money ${p.kind === 'refund' ? 'bad' : ''}`}>{tk(p.amount)}</b></div>; })}</div>
        </section>
      </div>
    </div>
  </>);
}
