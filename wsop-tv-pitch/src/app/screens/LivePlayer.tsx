import type { ReactNode } from 'react';
import { toast, toggleAlarm, useStore } from '../../state/store';
import { MyListButton } from '../MyList';
import { eventLabel, seriesById, sourceOf, statusOf, useNow, viewersOf } from '../../state/selectors';
import { fmtCount, fmtDateTime } from '../../lib/time';
import { MockPlayer } from '../Player';
import { Icon, Note, TierBadge, useEnv } from '../ui';
import { ScheduleRow } from './Home';

export function LivePlayer({ scheduleId }: { scheduleId: string }) {
  const env = useEnv();
  const now = useNow(1000);
  const schedules = useStore((s) => s.schedules);
  const aiCommentary = useStore((s) => s.aiCommentary);
  const s = schedules.find((x) => x.id === scheduleId);
  if (!s) return <Missing />;
  const se = seriesById(s.seriesId);
  const status = statusOf(s, now);
  const source = sourceOf(s);
  const ai = source === 'exclusive' && aiCommentary;

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
          auto={source === 'exclusive'}
          ai={ai}
          key={ai ? 'ai' : 'no-ai'}
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
        {source === 'exclusive' && (
          <div className="excl-info">
            <b>Only on WSOP TV</b>
            <span>Every bracelet final table, produced automatically with AI cameras{ai ? ' and AI commentary' : ''}.</span>
            <Note side="inline">③ WSOP TV 전용: RFID 업체 연동으로 카드·칩 데이터를 EBS가 자동 수신 → AI 카메라·마이크가 화면·오디오 구성 → AI 해설 · 운영자 1명이 전체 파이널 테이블 관제</Note>
          </div>
        )}
        {source === 'youtube' && <p className="detail-meta muted">Also streaming on the WSOP YouTube channel</p>}
        {status === 'upcoming' && <UpcomingActions id={s.id} start={s.start} />}
        {status === 'ended' && <Note side="inline">LIVE-04 · VOD-02 Quick VOD: 라이브 종료 즉시 다시보기로 전환</Note>}
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

function UpcomingActions({ id, start }: { id: string; start: string }) {
  const env = useEnv();
  const on = useStore((x) => x.alarms.includes(id));
  return (
    <div className="detail-actions">
      <button
        className={`remind-btn ${on ? 'is-on' : ''}`}
        aria-pressed={on}
        onClick={() => {
          if (env.member === 'guest') return env.sheet({ kind: 'login', reason: 'Log in to get a reminder when this broadcast starts.' });
          toggleAlarm(id);
          toast(on ? 'Reminder removed' : `Reminder set · ${fmtDateTime(start, env.tz)}`);
        }}
      >
        <Icon name="bell" size={14} />
        {on ? 'Reminder set' : 'Remind me'}
      </button>
      <MyListButton kind="live" id={id} />
      <Note side="inline">SCHD-02 알림 신청 → 시작 시 푸시 · CW-03 예정 라이브 워치리스트 담기</Note>
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
