import { all, orderView, byIdDesc } from '@/lib/store';
import { shipStats } from '@/lib/calc';
import { ORDER_STATUS, label, tk, rm, pct, due, code, fmtDate, live } from '@/lib/util';
import Icon from '@/components/Icon';
import OrderPanel from '@/components/OrderPanel';
import { OpenModal, RowLink, BulkStatus, DelBtn } from '@/components/Live';
import { addPurchase } from '@/app/actions';
import BatchStrip, { BatchCard } from '@/components/BatchStrip';
export const dynamic = 'force-dynamic';

const PAGE = 150;
const modeIcon = (m) => (/sea/i.test(m || '') ? 'archive' : /courier/i.test(m || '') ? 'truck' : 'plane');

export default async function Orders({ searchParams }) {
  const sp = await searchParams;
  const [orders, ships, pays, buys] = await Promise.all([orderView(), all('shipments'), all('payments'), all('purchases')]);
  ships.sort(byIdDesc);

  const qs = (patch) => {
    const p = { s: sp.s, q: sp.q, st: sp.st, due: sp.due, closed: sp.closed, n: sp.n, ...patch };
    const u = new URLSearchParams(Object.entries(p).filter(([, v]) => v != null && v !== ''));
    return '/?' + u.toString();
  };

  /* ---------- KPIs over open (not closed) shipments ---------- */
  const openShips = ships.filter((s) => s.status !== 'closed');
  const stats = Object.fromEntries(ships.map((s) => [s.id, shipStats(s, orders, buys, pays)]));
  const unassigned = shipStats(null, orders, buys, pays);
  const sumOpen = (k) => openShips.reduce((a, s) => a + (stats[s.id][k] || 0), 0);
  const openOrders = sumOpen('count'), volume = sumOpen('bills');
  const liveAll = orders.filter(live);
  const receivable = liveAll.reduce((a, o) => a + Math.max(0, due(o)), 0);
  const billedAll = liveAll.reduce((a, o) => a + (+o.bill || 0) + (+o.delivery_charge || 0), 0);
  const priced = openShips.filter((s) => stats[s.id].profit != null);
  const earned = priced.reduce((a, s) => a + stats[s.id].profit, 0);
  const earnedBase = priced.reduce((a, s) => a + stats[s.id].bills, 0);
  const inTransit = ships.filter((s) => s.status === 'in_transit').length;

  /* ---------- selection ---------- */
  const q = (sp.q || '').trim().toLowerCase();
  const selOrder = sp.o ? orders.find((o) => o.id === +sp.o) : null;
  let sel = null, mode = 'ship';
  if (sp.s === 'none') mode = 'none';
  else if (sp.s) sel = ships.find((s) => s.id === +sp.s) || null;
  else if (q) mode = 'search';
  else if (selOrder) { sel = ships.find((s) => s.id === selOrder.shipment_id) || null; if (!sel) mode = 'none'; }
  else sel = openShips[0] || ships[0] || null;
  if (mode === 'ship' && !sel) mode = ships.length ? 'none' : 'empty';

  const showClosed = sp.closed === '1';
  const cards = [...(showClosed ? ships : openShips)];
  if (sel && !cards.includes(sel)) cards.unshift(sel);

  /* ---------- ledger rows ---------- */
  let rows = mode === 'search' ? orders : mode === 'none' ? orders.filter((o) => !o.shipment_id) : sel ? orders.filter((o) => o.shipment_id === sel.id) : [];
  if (q) {
    const idm = q.match(/^kl-?0*(\d+)$/);
    rows = idm ? rows.filter((o) => o.id === +idm[1]) : rows.filter((o) => [o.customer, o.phone, o.product, o.address, o.note].join(' ').toLowerCase().includes(q));
  }
  if (sp.st) rows = rows.filter((o) => o.status === sp.st);
  if (sp.due === '1') rows = rows.filter((o) => live(o) && due(o) > 0);
  rows = [...rows].sort((a, b) => (b.order_date || '').localeCompare(a.order_date || '') || b.id - a.id);
  const limit = +sp.n || PAGE, shown = rows.slice(0, limit);
  const st = mode === 'none' ? unassigned : sel ? stats[sel.id] : null;
  const ledgerShip = selOrder ? ships.find((s) => s.id === selOrder.shipment_id) : null;
  const closeHref = qs({ o: undefined });

  return (<>
    {/* KPI tiles */}
    <section className="kpis">
      <div className="card kpi">
        <div className="head"><span className="eyebrow">Active shipments</span><Icon n="plane" /></div>
        <div className="val"><span className="big">{openShips.length} Shipment{openShips.length === 1 ? '' : 's'}</span><span className="tag blue">{openOrders} orders</span></div>
      </div>
      <div className="card kpi">
        <div className="head"><span className="eyebrow">Consolidated batch volume</span><Icon n="archive" /></div>
        <div className="val"><span className="big">{tk(volume)}</span><span className="mute">{inTransit} in transit</span></div>
      </div>
      <div className="card kpi">
        <div className="head" style={{ color: 'var(--warn)' }}><span className="eyebrow">Outstanding receivables</span><Icon n="wallet" /></div>
        <div className="val"><span className="big warn">{tk(receivable)}</span><span className="tag amber">{pct(billedAll ? receivable / billedAll : 0)} pending</span></div>
      </div>
      <div className="card kpi">
        <div className="head" style={{ color: 'var(--ok)' }}><span className="eyebrow">Batch net earned</span><Icon n="trend" /></div>
        <div className="val">{priced.length
          ? <><span className={`big ${earned < 0 ? 'bad' : 'ok'}`}>{tk(earned)}</span><span className={`tag ${earned < 0 ? 'red' : 'green'}`}>{pct(earnedBase ? earned / earnedBase : null)} margin</span></>
          : <><span className="big mute">—</span><span className="mute">Set a ৳/RM rate on a shipment</span></>}</div>
      </div>
    </section>

    {/* Shipment batches */}
    <div className="sec-head">
      <Icon n="layers" /><h2>Shipment batches</h2><OpenModal kind="shipment" className="btn ghost sm" title="New shipment batch"><Icon n="plus" size="sm" />New batch</OpenModal><span className="sp" />
      <a className="mute" href={qs({ closed: showClosed ? undefined : '1', o: undefined })}>{showClosed ? 'Hide closed' : `Show closed (${ships.length - openShips.length})`}</a>
    </div>
    <BatchStrip>
      {cards.map((s) => {
        const x = stats[s.id];
        return <BatchCard key={s.id} ship={s} href={qs({ s: s.id, o: undefined, q: undefined, n: undefined })} className={`card batch ${mode === 'ship' && sel?.id === s.id ? 'on' : ''}`}>
          <div className="t"><h3>{s.name}</h3><span className={`badge b-${s.status}`}>{label(s.status)}</span><span className="sp" />
            {s.mode && <span className="badge outline">{s.mode}</span>}</div>
          <div className="route ell">{s.route || <span className="mute">Malaysia → Bangladesh</span>}</div>
          <div className="kv"><div><small>Carrier / AWB</small><b>{[s.carrier, s.tracking && '#' + s.tracking].filter(Boolean).join(' • ') || '—'}</b></div>
            <div><small>ETA</small><b className="pri">{s.eta ? fmtDate(s.eta) : '—'}</b></div></div>
          <div className="kv"><div><small className="eyebrow">Orders & volume</small><b>{x.count} Orders • {tk(x.bills)}</b></div>
            <div><small className="eyebrow">Projected earned</small><b className={x.profit == null ? 'mute' : x.profit < 0 ? 'bad' : 'ok'}>{x.profit == null ? 'Set rate' : tk(x.profit)}</b></div></div>
        </BatchCard>;
      })}
      {unassigned.orders.length > 0 && <a href={qs({ s: 'none', o: undefined, q: undefined })} className={`card batch ${mode === 'none' ? 'on' : ''}`}>
        <div className="t"><h3>Unassigned orders</h3><span className="badge b-amber">No batch</span></div>
        <div className="route mute">Orders not yet placed in a shipment</div>
        <div className="kv"><div><small className="eyebrow">Orders & volume</small><b>{unassigned.count} Orders • {tk(unassigned.bills)}</b></div>
          <div><small className="eyebrow">Due</small><b className="warn">{tk(unassigned.due)}</b></div></div>
      </a>}
    </BatchStrip>

    {/* Ledger + panel */}
    <div className={`work ${selOrder ? 'has-panel' : ''}`}>
      <section className="card ledger">
        <div className="ledger-head">
          <div className="title">
            {mode === 'search' ? <><Icon n="search" /><h3>Search results for “{sp.q}”</h3><a className="btn ghost xs" href="/">Clear</a></>
              : mode === 'none' ? <><Icon n="box" /><h3>Unassigned orders</h3></>
              : mode === 'empty' ? <h3>No shipments yet</h3>
              : <><Icon n={modeIcon(sel.mode)} /><h3>{sel.name}{sel.mode ? ` • ${sel.mode}` : ''}</h3>
                <span className={`badge b-${sel.status}`}>{label(sel.status)}{sel.eta ? ` • ETA ${fmtDate(sel.eta)}` : ''}</span></>}
          </div>
          <div className="row" style={{ gap: 8 }}>
            {mode !== 'search' && mode !== 'empty' && <OpenModal kind="order" data={{ shipment_id: sel?.id }} className="btn sm"><Icon n="plus" size="sm" />Add order{sel ? ' to shipment' : ''}</OpenModal>}
            {mode === 'empty' && <OpenModal kind="shipment" className="btn sm"><Icon n="truck" size="sm" />Create first shipment</OpenModal>}
            {sel && mode === 'ship' && <OpenModal kind="shipment" data={sel} className="btn ghost sm"><Icon n="edit" size="sm" />Shipment settings</OpenModal>}
            {mode !== 'empty' && <a className="btn ghost sm" href={`/api/manifest?${new URLSearchParams({ s: mode === 'ship' ? sel.id : mode === 'none' ? 'none' : '', q: sp.q || '', st: sp.st || '', due: sp.due || '' })}`}><Icon n="download" size="sm" />Manifest CSV</a>}
          </div>
        </div>

        {st && <div className="summary">
          <span>Orders: <b>{st.count}</b></span>
          <span>Total pre-order: <b>{tk(st.bills)}</b></span>
          <span>Collected: <b className="ok">{tk(st.collected)}</b></span>
          <span>Due: <b className="warn">{tk(st.due)}</b></span>
          {sel && mode === 'ship' && <>
            <span>Spent: <b>{rm(st.spentRm)}</b></span>
            <span>Rate: <b>{st.rate ? `৳${st.rate}/RM` : '—'}</b></span>
            <span>Freight cost: <b className="pri">{tk(st.cargo)}</b></span>
            <span>Total earned: <b className={st.profit == null ? 'mute' : st.profit < 0 ? 'bad' : 'ok'}>{st.profit == null ? 'set rate' : `${tk(st.profit)} (${pct(st.margin)})`}</b></span>
          </>}
        </div>}

        {mode !== 'empty' && <form className="filters" action="/">
          {sp.s && <input type="hidden" name="s" value={sp.s} />}
          {sp.closed && <input type="hidden" name="closed" value={sp.closed} />}
          <Icon n="filter" size="sm" />
          <input name="q" defaultValue={sp.q} placeholder="Filter this list…" style={{ flex: '1 1 180px' }} />
          <select name="st" defaultValue={sp.st || ''}><option value="">All statuses</option>{ORDER_STATUS.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
          <label className="row" style={{ gap: 6 }}><input type="checkbox" name="due" value="1" defaultChecked={sp.due === '1'} />Has due</label>
          <button className="btn ghost sm">Apply</button>
          {(sp.st || sp.due || (sp.q && mode !== 'search')) && <a className="btn ghost sm" href={qs({ st: undefined, due: undefined, q: undefined, o: undefined })}>Reset</a>}
        </form>}

        {mode !== 'empty' && <div className="tbl-wrap">
          <table className="lt">
            <thead><tr><th className="hp">No</th><th>Date</th><th>Order ID</th><th className="hide-sm hp">Order from</th><th>Product</th><th>Customer</th>
              {mode === 'search' && <th>Shipment</th>}<th className="r">Total bill</th><th className="r">Remaining</th><th>Status</th></tr></thead>
            <tbody>
              {shown.map((o, i) => {
                const d = due(o);
                return <RowLink key={o.id} href={qs({ o: o.id, ...(mode === 'ship' ? { s: sel.id } : {}) })} on={selOrder?.id === o.id}>
                  <td className="no hp">{String(i + 1).padStart(2, '0')}</td>
                  <td className="nowrap c-date">{fmtDate(o.order_date || o.created_at)}</td>
                  <td className="id c-id">{code(o.id)}</td>
                  <td className="hide-sm hp">{o.source || '—'}</td>
                  <td className="c-prod"><div className="prod"><span className="thumb" style={o.images?.[0] ? { backgroundImage: `url(${o.images[0]})` } : undefined}>{!o.images?.[0] && <Icon n="image" size="sm" />}</span>
                    <span title={o.product}>{o.product}{o.qty > 1 ? ` ×${o.qty}` : ''}</span></div></td>
                  <td className="nowrap c-cust">{o.customer}</td>
                  {mode === 'search' && <td className="nowrap mute c-ship">{o.shipment_name || 'Unassigned'}</td>}
                  <td className="r strong money nowrap c-bill">{tk(+o.bill + +(o.delivery_charge || 0))}</td>
                  <td className={`r strong money nowrap c-due ${!live(o) ? 'mute' : d > 0 ? 'warn' : 'ok'}`}>{tk(d)}</td>
                  <td className="c-st"><span className={`badge b-${o.status || 'pending'}`}>{label(o.status || 'pending')}</span></td>
                </RowLink>;
              })}
            </tbody>
          </table>
          {!rows.length && <div className="empty">No orders here yet{sel ? ' — use “Add order to shipment”.' : '.'}</div>}
          {rows.length > shown.length && <div className="more"><a className="btn ghost sm" href={qs({ n: limit + PAGE })}>Show more ({rows.length - shown.length} left)</a></div>}
        </div>}

        {sel && mode === 'ship' && <details style={{ borderTop: '1px solid var(--line)' }}>
          <summary style={{ padding: '14px 22px', cursor: 'pointer' }} className="row"><Icon n="receipt" size="sm" /><b>Malaysia purchases & batch tools</b>
            <span className="mute">{rm(st.purchasedRm)} recorded{!st.purchasedRm && st.orderRm ? ` · using order buying prices (${rm(st.orderRm)})` : ''}</span></summary>
          <div style={{ padding: '0 22px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <BulkStatus sid={sel.id} />
            <table><tbody>
              {buys.filter((b) => b.shipment_id === sel.id).sort((a, b) => (a.bought_on > b.bought_on ? 1 : -1)).map((b) =>
                <tr key={b.id}><td className="nowrap mute">{fmtDate(b.bought_on)}</td><td>{b.item}</td><td className="r money strong">{rm(b.amount_rm)}</td><td className="r"><DelBtn kind="purchase" id={b.id} /></td></tr>)}
            </tbody></table>
            <form action={addPurchase} className="row" style={{ gap: 8 }}>
              <input type="hidden" name="shipment_id" value={sel.id} />
              <input name="item" placeholder="e.g. Vincci — 4 watches" required style={{ flex: '1 1 200px' }} />
              <input name="amount_rm" type="number" step="0.01" placeholder="RM" required style={{ width: 110 }} />
              <input name="bought_on" type="date" />
              <button className="btn sm"><Icon n="plus" size="sm" />Add purchase</button>
            </form>
          </div>
        </details>}
      </section>

      {selOrder && <OrderPanel o={selOrder} ship={ledgerShip} st={ledgerShip ? stats[ledgerShip.id] : null} pays={pays.filter((p) => p.order_id === selOrder.id)} closeHref={closeHref} ships={ships} />}
    </div>
  </>);
}
