'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { setTrack } from '@/app/actions';
import { TRACK, trackIdx, fmtDate } from '@/lib/util';

const ICONS = ['box', 'truck', 'archive', 'user'];
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

// Full stepper with one-click "next step" for the selected shipment
export function TrackSteps({ ship }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const i = trackIdx(ship), next = TRACK[i + 1];
  const go = (stage, msg) => {
    if (msg && !confirm(msg)) return;
    start(async () => { setErr(''); try { await setTrack(ship.id, stage); router.refresh(); } catch (e) { setErr(e.message || 'Failed'); } });
  };
  const pick = (j) => {
    if (j === i) return;
    if (j < i) go(TRACK[j].k, `Move tracking back to "${TRACK[j].t}"? Dates of later steps will be cleared.`);
    else go(TRACK[j].k, j > i + 1 ? `Mark "${TRACK[j].t}"? Skipped steps will be dated today.` : null);
  };

  return (
    <div className={`trk ${pending ? 'busy' : ''}`}>
      <div className="trk-top">
        <span className="eyebrow">Parcel tracking</span>
        <span className="mute trk-route">Malaysia <Icon n="arrow" size="sm" /> Bangladesh</span>
        <span className="sp" />
        {err && <span className="err">{err}</span>}
        {next ? <button type="button" className="btn sm" disabled={pending} onClick={() => go(next.k)}><Icon n="arrow" size="sm" />{pending ? 'Saving…' : `Mark: ${next.t}`}</button>
          : <span className="badge b-green">Journey complete</span>}
      </div>
      <ol className="trk-steps">
        {TRACK.map((x, j) => {
          const state = j < i || (j === i && j === TRACK.length - 1) ? 'done' : j === i ? 'cur' : 'todo';
          return (
            <li key={x.k} className={state}>
              <button type="button" disabled={pending} onClick={() => pick(j)} title={j === i ? x.d : `Set to: ${x.t}`}>
                <span className="trk-ico">{state === 'done' ? <Icon n="check" size="sm" /> : <Icon n={ICONS[j]} size="sm" />}</span>
                <span className="trk-txt">
                  <b>{x.t}</b>
                  <small>{when(ship, x.k) || (state === 'todo' ? x.where : '—')}</small>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
