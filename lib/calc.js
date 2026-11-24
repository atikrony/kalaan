// Business maths shared by pages. Bills are in BDT (৳); buying prices in RM.
// Shipment profit = bills − (RM spent × rate) − cargo cost − COD charges.
import { n, due, live } from './util';

const sum = (arr, fn) => arr.reduce((a, x) => a + n(fn(x)), 0);

export function shipStats(s, orders, buys = [], pays = []) {
  const os = orders.filter((o) => (s ? o.shipment_id === s.id : !o.shipment_id));
  const act = os.filter(live);
  const ids = new Set(os.map((o) => o.id));
  const bills = sum(act, (o) => o.bill);
  const delivery = sum(act, (o) => o.delivery_charge);
  const purchasedRm = s ? sum(buys.filter((b) => b.shipment_id === s.id), (b) => b.amount_rm) : 0;
  const orderRm = sum(act, (o) => o.buy_rm);
  const spentRm = purchasedRm || orderRm;
  const rate = n(s?.rate), cargo = n(s?.cargo_cost), cod = sum(act, (o) => o.cod_charge);
  const cost = spentRm * rate + cargo + cod;
  const profit = rate ? bills - cost : null;
  return {
    orders: os, count: act.length, bills, delivery,
    collected: sum(os, (o) => o.paid),
    advance: sum(pays.filter((p) => ids.has(p.order_id) && p.kind === 'advance'), (p) => p.amount),
    due: sum(act, (o) => Math.max(0, due(o))),
    purchasedRm, orderRm, spentRm, rate, cargo, cod, cost, profit,
    margin: profit != null && bills ? profit / bills : null,
    freightShare: act.length ? cargo / act.length : 0,
  };
}

export function orderProfit(o, s, share) {
  if (!live(o) || !n(s?.rate)) return null;
  return n(o.bill) - n(o.buy_rm) * n(s.rate) - n(share) - n(o.cod_charge);
}
