import { useEffect, useState, type ReactNode } from 'react';
import type { HomeSectionId, Schedule, Tier, Vod } from '../../data/types';
import { PLANS, PLAN_ORDER } from '../../data/plans';
import { banners, continueWatching, curations, notices, players, series, stripBanners } from '../../data/mock';
import { toggleAlarm, toast, useStore } from '../../state/store';
import { accessFor, eventLabel, liveNow, nextUpcoming, phaseOf, schedulesOnDay, seriesById, statusOf, useNow, viewersOf, vodById } from '../../state/selectors';
import { addDays, dateKey, fmtCount, fmtCountdown, fmtDate, fmtDuration, fmtTime } from '../../lib/time';
import { Art, Icon, LiveBadge, LockIcon, Note, SectionHead, TierBadge, useEnv } from '../ui';

export function Home() {
  const env = useEnv();
  const now = useNow(1000);
  const schedules = useStore((s) => s.schedules);

  // Every section returns null when it has nothing to show → the section disappears.
  const sections: Record<HomeSectionId, () => ReactNode> = {
    banner: () => <BannerCarousel />,
    liveNow: () => <LiveNowSection now={now} schedules={schedules} />,
    todaySchedule: () => <TodaySchedule now={now} schedules={schedules} />,
    tournaments: () => <TournamentsRow now={now} />,
    strip: () => <Strip />,
    curation: () => <Curations />,
    plans: () => <PlansSection />,
    continue: () => <ContinueRow />,
    players: () => <PlayersRow />,
    notice: () => <NoticeRow />,
  };

  const visible = env.layout.filter((s) => s.visible && s.audiences.includes(env.member));

  return (
    <div className={`home ${env.notes ? 'notes-on' : ''}`}>
      <AppHeader />
      {env.notes && (
        <div className="note-banner">
          <Note side="inline">
            {env.mode === 'season' ? '시즌 구성: LIVE를 가장 먼저 노출' : '비시즌 구성: VOD 섹션을 배너 바로 아래로'} · 섹션 순서/노출은 CMS에서 변경 · 헤더: 비로그인은 Log in, 스크롤 시 축소 고정
          </Note>
        </div>
      )}
      {visible.map((s) => (
        <SectionSlot key={s.id}>{sections[s.id]()}</SectionSlot>
      ))}
      <p className="home-end">WSOP TV · Demo build</p>
    </div>
  );
}

function SectionSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// ---- header ------------------------------------------------------------------

export function AppHeader({ title }: { title?: string }) {
  const env = useEnv();
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const root = env.scrollRoot();
    if (!root) return;
    const on = () => setCompact(root.scrollTop > 24);
    root.addEventListener('scroll', on, { passive: true });
    return () => root.removeEventListener('scroll', on);
  }, [env]);

  return (
    <header className={`app-header ${compact ? 'is-compact' : ''}`}>
      {title ? <h1 className="app-title">{title}</h1> : <Wordmark />}
      <div className="app-header-actions">
        <button className="icon-btn" aria-label="Search" onClick={() => env.push({ name: 'search' })}>
          <Icon name="search" />
        </button>
        {env.member === 'guest' ? (
          <button className="btn btn-gold btn-xs" onClick={() => env.sheet({ kind: 'login', reason: 'Log in to get alerts, continue watching and more.' })}>
            Log in
          </button>
        ) : (
          <>
            <button className="icon-btn" aria-label="Notifications" onClick={() => env.push({ name: 'inbox' })}>
              <Icon name="bell" />
              <span className="dot" />
            </button>
            <button className="avatar-btn" aria-label="My" onClick={() => env.goTab('my')}>
              DV
            </button>
          </>
        )}
      </div>
    </header>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark" aria-label="WSOP TV">
      WSOP<em>TV</em>
    </span>
  );
}

// ---- banner ---------------------------------------------------------------------

function BannerCarousel() {
  const env = useEnv();
  const list = banners.filter((b) => b.audiences.includes(env.member)).slice(0, 8);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (list.length < 2) return;
    const id = window.setInterval(() => setI((x) => (x + 1) % list.length), 5000);
    return () => window.clearInterval(id);
  }, [list.length]);
  if (!list.length) return null;
  const idx = i % list.length;

  return (
    <section className="banner" aria-roledescription="carousel" aria-label="Featured">
      <div className="banner-track" style={{ transform: `translateX(-${idx * 100}%)` }}>
        {list.map((b, n) => (
          <button key={b.id} className="banner-slide" onClick={() => env.push(b.link)} aria-hidden={n !== idx} tabIndex={n === idx ? 0 : -1}>
            <Art hue={b.hue} ratio="4/3" className="banner-art">
              <span className="banner-text">
                <small>{b.subtitle}</small>
                <b>{b.title}</b>
                <span className="banner-cta">{b.cta}</span>
              </span>
              {b.audiences.length === 1 && <span className="banner-target">Free members only</span>}
            </Art>
          </button>
        ))}
      </div>
      <div className="dots">
        {list.map((b, n) => (
          <button key={b.id} className={n === idx ? 'is-on' : ''} aria-label={`Banner ${n + 1}`} onClick={() => setI(n)} />
        ))}
      </div>
      <Note>최대 8개 · 5초 자동 롤링 · 등급별 타기팅 (구독 유도 배너는 무료 회원만)</Note>
    </section>
  );
}

// ---- LIVE NOW --------------------------------------------------------------------------

function LiveNowSection({ now, schedules }: { now: number; schedules: Schedule[] }) {
  const env = useEnv();
  const live = liveNow(schedules, now);
  const next = nextUpcoming(schedules, now);
  if (!live.length && !next) return null;

  return (
    <section className="sec">
      <SectionHead title={<>LIVE NOW {live.length > 0 && <span className="count">{live.length}</span>}</>} note="시즌 중 LIVE 최우선 노출 · 0건이면 다음 라이브 카운트다운" />
      {live.length ? (
        <div className="hscroll">
          {live.map((s) => (
            <LiveCard key={s.id} s={s} now={now} />
          ))}
        </div>
      ) : (
        next && (
          <button className="countdown" onClick={() => env.goTab('schedule')}>
            <span className="countdown-label">Next live in</span>
            <span className="countdown-time">{fmtCountdown(Date.parse(next.start) - now)}</span>
            <span className="countdown-title">{next.title}</span>
            <span className="countdown-meta">
              {fmtTime(next.start, env.tz)} · {next.lang} · <TierBadge tier={next.tier} />
            </span>
          </button>
        )
      )}
    </section>
  );
}

export function LiveCard({ s, now, wide }: { s: Schedule; now: number; wide?: boolean }) {
  const env = useEnv();
  const se = seriesById(s.seriesId);
  const locked = accessFor(env.member, s.tier) !== 'ok';
  return (
    <button className={`card live-card ${wide ? 'is-wide' : ''}`} onClick={() => env.push({ name: 'live', scheduleId: s.id })}>
      <Art hue={se.hue + (s.lang === 'ES' ? 30 : 0)} title={s.type} sub={`${se.name.replace('2026 WSOP ', '')} · ${s.lang}`}>
        <span className="art-tl">
          <LiveBadge small />
        </span>
        <span className="art-tr">
          <TierBadge tier={s.tier} />
        </span>
        <span className="art-bl viewers">
          <Icon name="eye" size={12} /> {fmtCount(viewersOf(s, now))}
        </span>
        {locked && (
          <span className="art-br lock">
            <LockIcon />
          </span>
        )}
      </Art>
      <span className="card-title">{s.title}</span>
      <span className="card-meta">
        {eventLabel(s)} · {s.lang}
      </span>
    </button>
  );
}

// ---- today's schedule -------------------------------------------------------------------

function TodaySchedule({ now, schedules }: { now: number; schedules: Schedule[] }) {
  const env = useEnv();
  const today = dateKey(now, env.tz);
  const keys = [today, addDays(today, 1), addDays(today, 2)];
  const [tab, setTab] = useState(0);
  const all = schedulesOnDay(schedules, keys[tab], env.tz);
  // Today starts just before “now” so live and upcoming broadcasts are visible first.
  const firstOpen = all.findIndex((s) => statusOf(s, now) !== 'ended');
  const from = tab === 0 && firstOpen > 0 ? firstOpen - 1 : 0;
  const list = all.slice(from);
  const anyDay = keys.some((k) => schedulesOnDay(schedules, k, env.tz).length);
  if (!anyDay) return null;
  const label = (n: number) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : fmtDate(`${keys[n]}T12:00:00Z`, 'UTC'));

  return (
    <section className="sec">
      <SectionHead title="Today’s Schedule" action="Full schedule" onAction={() => env.goTab('schedule')} note="편성 = 시간 슬롯 × 송출 채널 · 알림 신청 · 시간 변경 시 Changed" />
      <div className="seg">
        {keys.map((k, n) => (
          <button key={k} className={n === tab ? 'is-on' : ''} onClick={() => setTab(n)}>
            {label(n)}
          </button>
        ))}
      </div>
      {list.length ? (
        <ul className="sched-list">
          {from > 0 && (
            <li className="earlier">
              <button onClick={() => env.goTab('schedule')}>{from} earlier today</button>
            </li>
          )}
          {list.slice(0, 6).map((s) => (
            <ScheduleRow key={s.id} s={s} now={now} />
          ))}
        </ul>
      ) : (
        <p className="empty-line">No broadcasts on this day.</p>
      )}
      {list.length > 6 && (
        <button className="btn btn-ghost btn-block btn-sm" onClick={() => env.goTab('schedule')}>
          +{list.length - 6} more in Schedule
        </button>
      )}
    </section>
  );
}

export function ScheduleRow({ s, now }: { s: Schedule; now: number }) {
  const env = useEnv();
  const status = statusOf(s, now);
  const alarms = useStore((x) => x.alarms);
  const on = alarms.includes(s.id);
  const open = () => {
    if (status === 'live') env.push({ name: 'live', scheduleId: s.id });
    else if (status === 'ended' && s.vodId) env.push({ name: 'vod', vodId: s.vodId });
  };
  const bell = () => {
    if (env.member === 'guest') return env.sheet({ kind: 'login', reason: 'Log in to get a reminder when this broadcast starts.' });
    toggleAlarm(s.id);
    toast(on ? 'Reminder removed' : `Reminder set · ${fmtTime(s.start, env.tz)}`);
  };
  return (
    <li className={`sched-row is-${status}`}>
      <button className="sched-main" onClick={open} disabled={status === 'upcoming'}>
        <span className="sched-time">
          {fmtTime(s.start, env.tz)}
          {s.originalStart && status === 'upcoming' && <span className="changed">Changed</span>}
        </span>
        <span className="sched-body">
          <span className="sched-title">
            {s.id.startsWith('sc-n') && <span className="new-tag">New</span>}
            {s.title}
          </span>
          <span className="sched-meta">
            {eventLabel(s)} · {s.channelId} · {s.lang}
          </span>
        </span>
        <span className={`st st-${status}`}>{status === 'live' ? 'LIVE' : status === 'upcoming' ? 'Upcoming' : s.vodId ? 'Replay' : 'Ended'}</span>
      </button>
      {status === 'upcoming' && (
        <button className={`bell ${on ? 'is-on' : ''}`} aria-pressed={on} aria-label={on ? 'Remove reminder' : 'Set reminder'} onClick={bell}>
          <Icon name={on ? 'bell' : 'bellOn'} size={18} />
        </button>
      )}
    </li>
  );
}

// ---- tournaments ------------------------------------------------------------------------

function TournamentsRow({ now }: { now: number }) {
  const env = useEnv();
  const order = { ongoing: 0, upcoming: 1, ended: 2 } as const;
  const list = series.filter((x) => phaseOf(x, now) !== 'ended').sort((a, b) => order[phaseOf(a, now)] - order[phaseOf(b, now)]);
  if (!list.length) return null;
  return (
    <section className="sec">
      <SectionHead title="Tournaments" action="All" onAction={() => env.goTab('tournaments')} note="진행 중 → 예정 순" />
      <div className="hscroll">
        {list.map((x) => (
          <SeriesCard key={x.id} id={x.id} now={now} />
        ))}
      </div>
    </section>
  );
}

export function SeriesCard({ id, now }: { id: string; now: number }) {
  const env = useEnv();
  const x = seriesById(id);
  const phase = phaseOf(x, now);
  return (
    <button className="card series-card" onClick={() => env.push({ name: 'series', seriesId: x.id })}>
      <Art hue={x.hue} title={x.name.replace('2026 ', '')} sub={x.city} ratio="16/10">
        <span className="art-tl tour">{x.tour}</span>
        {phase === 'ongoing' && <span className="art-tr phase">ON NOW</span>}
      </Art>
      <span className="card-title">{x.name}</span>
      <span className="card-meta">
        {fmtSeriesDates(x.start, x.end)} · {x.venue}
      </span>
    </button>
  );
}

export const fmtSeriesDates = (a: string, b: string) => {
  const f = (d: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`));
  return `${f(a)} – ${f(b)}`;
};

// ---- strip banner ---------------------------------------------------------------------

function Strip() {
  const env = useEnv();
  const b = stripBanners.find((x) => x.audience === env.member);
  if (!b) return null;
  return (
    <section className="sec sec-tight">
      <button className={`strip strip-${env.member}`} onClick={() => (env.member === 'guest' ? env.sheet({ kind: 'login', reason: 'Free account: alerts and continue watching.' }) : env.push(b.link))}>
        <span>{b.title}</span>
        <b>{b.cta}</b>
      </button>
      <Note>등급별로 다른 띠배너</Note>
    </section>
  );
}

// ---- VOD rows ------------------------------------------------------------------------

export function VodCard({ v, width = 'md' }: { v: Vod; width?: 'md' | 'lg' }) {
  const env = useEnv();
  const se = seriesById(v.seriesId);
  const locked = accessFor(env.member, v.tier) !== 'ok';
  return (
    <button className={`card vod-card w-${width}`} onClick={() => env.push({ name: 'vod', vodId: v.id })}>
      <Art hue={se.hue + 20} title={v.type} sub={se.name.replace('2026 WSOP ', '')}>
        <span className="art-tr">
          <TierBadge tier={v.tier} />
        </span>
        <span className="art-br dur">{fmtDuration(v.durationSec)}</span>
        {locked && (
          <span className="art-tl lock">
            <LockIcon />
          </span>
        )}
      </Art>
      <span className="card-title">{v.title}</span>
    </button>
  );
}

function Curations() {
  const list = curations.map((c) => ({ ...c, vods: c.vodIds.map((id) => vodById(id)).filter((v): v is Vod => !!v) })).filter((c) => c.vods.length);
  if (!list.length) return null;
  return (
    <>
      {list.map((c, n) => (
        <section className="sec" key={c.id}>
          <SectionHead title={c.title} note={n === 0 ? '운영자 큐레이션 묶음 (CMS에서 편집)' : undefined} />
          <div className="hscroll">
            {c.vods.map((v) => (
              <VodCard key={v.id} v={v} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

/** Plans: example policy shown on home so viewers see what each plan unlocks. */
function PlansSection() {
  const env = useEnv();
  const current = env.member === 'guest' ? null : env.member;
  const open = (t: Tier) => {
    if (env.member === 'guest' && t === 'free') return env.sheet({ kind: 'login', reason: 'Create a free account to start watching.' });
    env.push({ name: 'paywall' });
  };
  return (
    <section className="sec">
      <SectionHead title="Plans" action="Compare" onAction={() => env.push({ name: 'paywall' })} note="요금제 노출 (예시 정책) · 노출 대상 등급은 CMS에서 설정" />
      <p className="plans-policy">Example policy · not final</p>
      <div className="hscroll">
        {PLAN_ORDER.map((t) => (
          <button key={t} className={`plan-card plan-${t} ${current === t ? 'is-current' : ''}`} onClick={() => open(t)}>
            <span className="plan-card-top">
              <TierBadge tier={t} />
              {current === t && <span className="plan-yours">Your plan</span>}
            </span>
            <b className="plan-card-name">{PLANS[t].name}</b>
            <span className="plan-card-tag">{PLANS[t].tagline}</span>
            <ul>
              {PLANS[t].highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
            <span className="plan-card-price">{PLANS[t].price}</span>
            <span className="plan-card-cta">{current === t ? 'Current plan' : env.member === 'guest' && t === 'free' ? 'Start free' : 'View plan'}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ContinueRow() {
  const env = useEnv();
  if (env.member === 'guest') return null;
  const items = continueWatching.map((c) => ({ ...c, v: vodById(c.vodId)! })).filter((c) => c.v);
  if (!items.length) return null;
  return (
    <section className="sec">
      <SectionHead title="Continue Watching" note="로그인 회원만 노출 · 진행률 표시" />
      <div className="hscroll">
        {items.map(({ v, progress }) => (
          <button key={v.id} className="card vod-card w-md" onClick={() => env.push({ name: 'vod', vodId: v.id })}>
            <Art hue={seriesById(v.seriesId).hue + 20} title={v.type}>
              <span className="progress">
                <i style={{ width: `${progress * 100}%` }} />
              </span>
              <span className="art-tr">
                <TierBadge tier={v.tier} />
              </span>
            </Art>
            <span className="card-title">{v.title}</span>
            <span className="card-meta">{fmtDuration(Math.round(v.durationSec * (1 - progress)))} left</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PlayersRow() {
  const env = useEnv();
  return (
    <section className="sec">
      <SectionHead title="Players" note="선수 ↔ VOD N:M 매핑" />
      <div className="hscroll">
        {players.map((p) => (
          <button key={p.id} className="player-chip" onClick={() => env.push({ name: 'player', playerId: p.id })}>
            <PlayerAvatar name={p.name} hue={p.hue} />
            <span className="player-name">{p.name}</span>
            <span className="card-meta">
              {p.flag} {p.country}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function PlayerAvatar({ name, hue, size = 64 }: { name: string; hue: number; size?: number }) {
  const ini = name
    .split(/[\s-]+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join('');
  return (
    <span className="p-avatar" style={{ width: size, height: size, fontSize: size * 0.34, background: `linear-gradient(135deg, hsl(${hue} 45% 40%), hsl(${hue} 50% 18%))` }}>
      {ini}
    </span>
  );
}

function NoticeRow() {
  const env = useEnv();
  const n = notices[0];
  if (!n) return null;
  return (
    <section className="sec sec-tight">
      <button className="notice" onClick={() => env.goTab('my')}>
        <span className="notice-tag">Notice</span>
        <span className="notice-title">{n.title}</span>
        <span className="card-meta">{fmtDate(n.date, env.tz)}</span>
      </button>
    </section>
  );
}
