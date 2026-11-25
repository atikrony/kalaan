'use client';
import { TRACK, trackIdx, fmtDate } from '@/lib/util';

const when = (s, k) => (s.track_at?.[k] ? fmtDate(s.track_at[k]) : null);

// Small read-only progress line for shipment cards
export function TrackMini({ ship }) {
  const i = trackIdx(ship), cur = TRACK[i];
  return (
    <div className="trk-mini">
      <div className="trk-dots">{TRACK.map((x, j) => <span key={x.k} className={j < i ? 'done' : j === i ? (j === TRACK.length - 1 ? 'done' : 'cur') : ''} />)}</div>
      <div className="trk-mini-label">
        {cur ? <><b>{cur.t}</b>{when(ship, cur.k) && <span className="mute"> · {when(ship, cur.k)}</span>}</> : <span className="mute">Not sent yet · still in Malaysia</span>}
      </div>
    </div>
  );
}
