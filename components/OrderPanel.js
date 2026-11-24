import Icon from './Icon';
import { OpenModal, ClosePanel, PanelBackdrop, StatusSelect, FieldSelect, NoteBox, ImageTools, DeleteOrder, DelBtn } from './Live';
import { addPayment } from '@/app/actions';
import { orderProfit } from '@/lib/calc';
import { PAY_KINDS, METHODS, label, tk, rm, n, due, code, fmtDate, waNumber, live, today } from '@/lib/util';

const PURCHASED = ['purchased', 'shipped', 'arrived', 'delivered'];
const DELIVERY = { pending: 'Awaiting advance', confirmed: 'Not purchased', purchased: 'Waiting to ship', shipped: 'In transit', arrived: 'Arrived in BD', delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded' };

export default function OrderPanel({ o, ship, st, pays, closeHref, ships }) {
  const d = due(o);
  const sumKind = (k) => pays.filter((p) => p.kind === k).reduce((a, p) => a + n(p.amount), 0);
  const adv = sumKind('advance'), paid = sumKind('payment'), refund = sumKind('refund');
  const share = st?.freightShare || 0;
  const profit = orderProfit(o, ship, share);
  const wa = waNumber(o.phone);
  const created = o.created_at ? new Date(o.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' }) : null;
  const sorted = [...pays].sort((a, b) => String(a.paid_on || '').localeCompare(String(b.paid_on || '')) || a.id - b.id);

  return (<>
    <PanelBackdrop href={closeHref} />
    <aside className="card panel">
      <div className="panel-head">
        <div className="sp">
          <div className="row" style={{ gap: 10 }}><h2>{code(o.id)}</h2>{o.source && <span className="badge b-src">{o.source}</span>}</div>
          <div className="mute" style={{ marginTop: 4 }}>{fmtDate(o.order_date || o.created_at)}{created ? ` • ${created} BST` : ''}</div>
        </div>
        <OpenModal kind="order" data={o} className="btn ghost icon" title="Edit order"><Icon n="edit" size="sm" /></OpenModal>
        <ClosePanel href={closeHref} />
      </div>

      <div className="panel-body">
        <div className="box blue">
          <div className="row" style={{ marginBottom: 12 }}><Icon n="truck" size="sm" className="pri" /><span className="eyebrow">Shipment batch assignment</span><span className="sp" />
            {ship && <span className="badge" style={{ background: 'var(--primary)', color: '#fff' }}>#{ship.id}</span>}</div>
          <div className="grid2">
            <div><small>Batch</small>
              <FieldSelect id={o.id} field="shipment_id" value={o.shipment_id ?? ''} options={[['', '— Unassigned —'], ...ships.map((s) => [s.id, s.name])]} /></div>
            <div className="right"><small>Allocated freight share</small><b className="pri">{ship ? tk(share) : '—'}</b></div>
            {ship && <div><small>AWB / tracking</small><b>{ship.tracking || '—'}</b></div>}
            {ship && <div className="right"><small>Rate</small><b>{ship.rate ? `৳${ship.rate} / RM` : 'Not set'}</b></div>}
          </div>
        </div>

        <div className="box">
          <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
            {o.images?.[0] ? <a href={o.images[0]} target="_blank" className="pimg" style={{ backgroundImage: `url(${o.images[0]})` }} /> : <div className="pimg"><Icon n="image" size="lg" /></div>}
            <div className="sp" style={{ minWidth: 0 }}>
              <div className="eyebrow pri" style={{ color: 'var(--primary)' }}>Pre-order • Import{o.qty > 1 ? ` • Qty ${o.qty}` : ''}</div>
              <h3 style={{ marginTop: 4, wordBreak: 'break-word' }}>{o.product}</h3>
            </div>
          </div>
          <ImageTools id={o.id} images={o.images?.slice(1) || []} />
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Customer details</div>
          <div className="box">
            <div className="row" style={{ gap: 8 }}><b style={{ fontSize: 15 }}>{o.customer}</b><span className="sp" />
              {wa && <a className="btn okb xs" href={`https://wa.me/${wa}`} target="_blank"><Icon n="chat" size="sm" />WhatsApp</a>}
              {o.phone && <a className="btn ghost xs" href={`tel:${o.phone}`}><Icon n="phone" size="sm" />Call</a>}</div>
            {o.phone && <a href={`/customers?q=${encodeURIComponent(o.phone)}`} className="pri strong" style={{ display: 'block', marginTop: 8 }}>{o.phone}</a>}
            <div className="mute" style={{ marginTop: 6 }}>{o.address || 'No delivery address'}</div>
          </div>
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Procurement & unit logistics</div>
          <div className="box">
            <div className="grid2">
              <div><small>Buying price</small><b>{rm(o.buy_rm)}</b>{ship?.rate && n(o.buy_rm) ? <div className="mute" style={{ fontSize: 12 }}>≈ {tk(n(o.buy_rm) * n(ship.rate))}</div> : null}</div>
              <div><small>Buying update</small><b className={PURCHASED.includes(o.status) ? 'ok' : 'warn'}>{PURCHASED.includes(o.status) ? `Purchased${ship ? ' • #' + ship.id : ''}` : 'Not purchased'}</b></div>
              <div><small>Order status</small><StatusSelect id={o.id} value={o.status || 'pending'} /></div>
              <div><small>Delivery update</small><b className="pri">{DELIVERY[o.status || 'pending']}</b></div>
              <div><small>Return status</small><b className={live(o) ? '' : 'bad'}>{o.status === 'refunded' ? 'Refunded' : o.status === 'cancelled' ? 'Cancelled' : 'None'}</b></div>
            </div>
            <div style={{ marginTop: 14 }}><small className="mute" style={{ display: 'block', marginBottom: 6 }}>Internal note</small><NoteBox id={o.id} value={o.note} /></div>
          </div>
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Financial & accounting</div>
          <div className="box">
            <div className="lines">
              <div><span>Total bill</span><span className="strong">{tk(o.bill)}</span></div>
              <div><span>Delivery charge</span><span>{tk(o.delivery_charge)}</span></div>
              <div><span>Advance</span><span className="ok">{tk(adv)}{adv ? ' (Paid)' : ''}</span></div>
              {paid > 0 && <div><span>Other payments</span><span className="ok">{tk(paid)}</span></div>}
              {refund > 0 && <div><span>Refunded</span><span className="bad">−{tk(refund)}</span></div>}
              <div><span>Remaining bill</span><span className={`strong ${d > 0 && live(o) ? 'warn' : 'ok'}`}>{tk(d)}</span></div>
              <div><span>COD charge <small className="mute">(our cost)</small></span><span>{tk(o.cod_charge)}</span></div>
              {ship && <div><span>Freight share</span><span>{tk(share)}</span></div>}
            </div>
            <div className={`profit ${profit == null ? 'na' : profit < 0 ? 'neg' : ''}`}>
              <div><div className="eyebrow">Net earned profit</div><div style={{ fontSize: 13 }}>{profit == null ? (live(o) ? 'Set the shipment ৳/RM rate' : 'Order closed') : 'After COGS, freight & COD'}</div></div>
              <b>{profit == null ? '—' : tk(profit)}</b>
            </div>
          </div>
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Payments ledger</div>
          <div className="box">
            <div className="pays">
              {sorted.length ? sorted.map((p) => <div key={p.id}>
                <span className={`badge ${p.kind === 'refund' ? 'b-red' : p.kind === 'advance' ? 'b-blue' : 'b-green'}`}>{p.kind}</span>
                <span className="sp ell"><span className="mute">{fmtDate(p.paid_on)} · {p.method || '—'}</span>{p.note ? <span className="mute"> · {p.note}</span> : ''}</span>
                <b className={`money ${p.kind === 'refund' ? 'bad' : ''}`}>{p.kind === 'refund' ? '−' : ''}{tk(p.amount)}</b>
                <DelBtn kind="payment" id={p.id} /></div>) : <div className="mute">No payments recorded yet.</div>}
            </div>
            <form action={addPayment} className="payform">
              <input type="hidden" name="order_id" value={o.id} />
              <input name="amount" type="number" placeholder="Amount ৳" defaultValue={d > 0 && live(o) ? d : ''} required key={'a' + d} />
              <select name="kind" defaultValue={pays.length ? 'payment' : 'advance'}>{PAY_KINDS.map((k) => <option key={k} value={k}>{label(k)}</option>)}</select>
              <select name="method">{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
              <input name="paid_on" type="date" defaultValue={today()} />
              <input name="note" placeholder="Note / TrxID" style={{ gridColumn: '1/-1' }} />
              <button className="btn sm" style={{ gridColumn: '1/-1' }}><Icon n="plus" size="sm" />Record payment</button>
            </form>
          </div>
        </div>

        <div className="row">
          <a className="btn ghost sm" href={`/logs?entity=order&id=${o.id}`}><Icon n="clock" size="sm" />History</a>
          <span className="sp" /><DeleteOrder id={o.id} back={closeHref} />
        </div>
      </div>
    </aside>
  </>);
}
