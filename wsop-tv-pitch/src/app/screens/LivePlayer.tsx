import type { ReactNode } from 'react';
import { useStore } from '../../state/store';
import { eventLabel, seriesById, statusOf, useNow, viewersOf } from '../../state/selectors';
import { fmtCount, fmtDateTime } from '../../lib/time';
import { MockPlayer } from '../Player';
import { Icon, Note, TierBadge, useEnv } from '../ui';
import { ScheduleRow } from './Home';

export function LivePlayer({ scheduleId }: { scheduleId: string }) {
  const env = useEnv();
  const now = useNow(1000);
  const schedules = useStore((s) => s.schedules);
  const s = schedules.find((x) => x.id === scheduleId);
  if (!s) return <Missing />;
  const se = seriesById(s.seriesId);
  const status = statusOf(s, now);

  // Same event, other channels / languages on air at the same time.
  const siblings = schedules
    .filter((x) => x.visible && x.eventId === s.eventId && (statusOf(x, now) === 'live' || x.id === s.id))
    .sort((a, b) => a.channelId.localeCompare(b.channelId));
  const next = schedules
    .filter((x) => x.visible && x.seriesId === s.seriesId && statusOf(x, now) === 'upcoming')
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 5);

  return (
    <div className="live-screen">
      <SubHead title={s.title} />
      {status === 'live' ? (
        <MockPlayer
          hue={se.hue + (s.lang === 'ES' ? 30 : 0)}
          title={s.type}
          sub={`${se.name} · ${s.lang}`}
          live
          tier={s.tier}
          contentTitle={s.title}
          viewers={`${fmtCount(viewersOf(s, now))} watching`}
        />
      ) : (
        <div className="player">
          <div className="player-off">
            <p>{status === 'upcoming' ? 'Starts' : 'Broadcast ended'}</p>
            <b>{status === 'upcoming' ? fmtDateTime(s.start, env.tz) : s.vodId ? 'Replay available' : '—'}</b>
            {status === 'ended' && s.vodId && (
              <button className="btn btn-gold btn-sm" onClick={() => env.replace({ name: 'vod', vodId: s.vodId! })}>
                Watch replay
              </button>
            )}
          </div>
        </div>
      )}

      <div className="detail">
        <div className="detail-badges">
          {status === 'live' && <span className="live live-sm"><i /> LIVE</span>}
          <TierBadge tier={s.tier} />
          <span className="tag">{s.lang}</span>
          <span className="tag">{s.channelId}</span>
        </div>
        <h2 className="detail-title">{s.title}</h2>
        <p className="detail-meta">
          {se.name} · {eventLabel(s)}
        </p>
        {status === 'live' && (
          <p className="detail-meta">
            <Icon name="eye" size={13} /> {fmtCount(viewersOf(s, now))} watching now
          </p>
        )}
      </div>

      {siblings.length > 1 && (
        <section className="sec">
          <div className="sec-head">
            <h2>Switch broadcast</h2>
            <Note>같은 이벤트의 다른 테이블/언어 방송으로 전환</Note>
          </div>
          <div className="chip-row">
            {siblings.map((x) => (
              <button
                key={x.id}
                className={`chip ${x.id === s.id ? 'is-on' : ''}`}
                aria-pressed={x.id === s.id}
                onClick={() => x.id !== s.id && env.replace({ name: 'live', scheduleId: x.id })}
              >
                {x.type} {x.lang}
              </button>
            ))}
          </div>
        </section>
      )}

      {next.length > 0 && (
        <section className="sec">
          <div className="sec-head">
            <h2>Up next</h2>
            <Note>다음 편성 · 알림 신청</Note>
          </div>
          <ul className="sched-list">
            {next.map((x) => (
              <ScheduleRow key={x.id} s={x} now={now} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function SubHead({ title, right }: { title: string; right?: ReactNode }) {
  const env = useEnv();
  return (
    <header className="subhead">
      <button className="icon-btn" aria-label="Back" onClick={env.back}>
        <Icon name="back" />
      </button>
      <h1>{title}</h1>
      {right}
    </header>
  );
}

export function Missing() {
  const env = useEnv();
  return (
    <div>
      <SubHead title="" />
      <p className="empty-line">This content isn’t available.</p>
      <button className="btn btn-outline btn-block" onClick={() => env.goTab('home')}>
        Go home
      </button>
    </div>
  );
}
