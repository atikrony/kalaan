export const ORDER_STATUS = ['pending', 'confirmed', 'purchased', 'shipped', 'arrived', 'delivered', 'cancelled', 'refunded'];
export const SHIP_STATUS = ['collecting', 'purchasing', 'in_transit', 'arrived', 'closed'];
export const PAY_KINDS = ['advance', 'payment', 'refund'];
export const METHODS = ['bKash', 'Nagad', 'Bank', 'Cash', 'COD'];
export const SOURCES = ['Page', 'WhatsApp', 'Personal ID', 'Instagram', 'TikTok', 'Website', 'Other'];
export const MODES = ['Air freight', 'Sea cargo', 'Express air', 'Courier'];

export const label = (s) => String(s || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
export const n = (v) => Number(v) || 0;
export const tk = (v) => (n(v) < 0 ? '−৳' : '৳') + Math.abs(Math.round(n(v))).toLocaleString('en-IN');
export const rm = (v) => 'RM ' + n(v).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const pct = (v) => (v == null || !isFinite(v) ? '—' : (v * 100).toFixed(1) + '%');
export const due = (o) => n(o.bill) + n(o.delivery_charge) - n(o.paid);
export const code = (id) => 'KL-' + String(id).padStart(4, '0');
export const closed = (s) => ['delivered', 'cancelled', 'refunded'].includes(s);
export const live = (o) => o.status !== 'cancelled' && o.status !== 'refunded';
export const today = () => new Date().toISOString().slice(0, 10);

export function fmtDate(d) {
  if (!d) return '—';
  const x = new Date(String(d).length === 10 ? d + 'T00:00:00' : d);
  return isNaN(x) ? String(d) : x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
// Bangladesh numbers: 017xxxxxxxx -> 88017xxxxxxxx
export function waNumber(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('0')) d = '88' + d;
  return d;
}
