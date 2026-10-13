// SCR-12 Notices: list by type with pinned first, detail with body · attachment · link.
import { useState } from 'react';
import type { NoticeType } from '../../data/types';
import { notices } from '../../data/mock';
import { toast } from '../../state/store';
import { fmtDate } from '../../lib/time';
import { Note, useEnv } from '../ui';
import { visibleNotices } from './Home';
import { Missing, SubHead } from './LivePlayer';

const TYPES: ('All' | NoticeType)[] = ['All', 'Service', 'Event', 'Maintenance'];

export function NoticeList() {
  const env = useEnv();
  const [type, setType] = useState<'All' | NoticeType>('All');
  const list = visibleNotices(env.member).filter((n) => type === 'All' || n.type === type);
  return (
    <div>
      <SubHead title="Notices" />
      <div className="seg seg-scroll">
        {TYPES.map((t) => (
          <button key={t} className={type === t ? 'is-on' : ''} onClick={() => setType(t)}>
            {t}
          </button>
        ))}
      </div>
      <Note>SCR-12 · 타입별 목록 · 상단 고정 우선 · 등급 공지는 해당 등급 회원에게만 (NTC-001~003)</Note>
      <ul className="list">
        {list.map((n) => (
          <li key={n.id}>
            <button className="notice-item" onClick={() => env.push({ name: 'notice', noticeId: n.id })}>
              <span className="notice-item-top">
                {n.pinned && <span className="pin">Pinned</span>}
                <span className={`ntype ntype-${n.type.toLowerCase()}`}>{n.type}</span>
                {n.audiences?.length ? <span className="ntype">Members</span> : null}
              </span>
              <span className="notice-item-title">{n.title}</span>
              <small className="muted">{fmtDate(n.date, env.tz)}</small>
            </button>
          </li>
        ))}
      </ul>
      {!list.length && <p className="empty-line">No notices.</p>}
    </div>
  );
}

export function NoticeDetail({ noticeId }: { noticeId: string }) {
  const env = useEnv();
  const n = notices.find((x) => x.id === noticeId);
  if (!n) return <Missing />;
  return (
    <div>
      <SubHead title="Notice" />
      <article className="screen-pad notice-detail">
        <span className="notice-item-top">
          {n.pinned && <span className="pin">Pinned</span>}
          <span className={`ntype ntype-${n.type.toLowerCase()}`}>{n.type}</span>
        </span>
        <h2>{n.title}</h2>
        <p className="muted">{fmtDate(n.date, env.tz)}</p>
        <p className="notice-body">{n.body}</p>
        {n.attachment && (
          <button className="row-btn" onClick={() => toast(`${n.attachment} (demo)`)}>
            <span>Attachment · {n.attachment}</span>
          </button>
        )}
        {n.link && (
          <button className="btn btn-outline btn-block" onClick={() => env.push(n.link!.route)}>
            {n.link.label}
          </button>
        )}
      </article>
    </div>
  );
}
