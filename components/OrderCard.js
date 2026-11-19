import { code, due, tk } from '@/lib/util';
export default function OrderCard({ o }) {
  const d = due(o);
  return (
    <a className="oc" href={`/orders/${o.id}`}>
      <div className="img" style={o.images?.[0] ? { backgroundImage: `url(${o.images[0]})` } : {}}>
        <span className="code">{code(o.id)}</span>{!o.images?.[0] && 'No image'}
      </div>
      <div className="body">
        <div><b>{o.customer}</b></div>
        <div className="mute">{o.product}</div>
        <div className="row"><span className={`badge b-${o.status}`}>{o.status}</span><span className="sp" />
          <span className={d > 0 ? 'due' : 'paid'}>{d > 0 ? 'Due ' + tk(d) : 'Paid'}</span></div>
      </div>
    </a>
  );
}
