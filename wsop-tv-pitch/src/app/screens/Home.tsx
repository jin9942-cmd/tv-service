import { useEffect, useState, type ReactNode } from 'react';
import type { HomeSectionId, Member, Schedule, Tier, Vod } from '../../data/types';
import { PLANS, PLAN_ORDER } from '../../data/plans';
import { banners, curations, notices, players, series, stripBanners, vods } from '../../data/mock';
import { removeContinue, toggleAlarm, toast, useStore } from '../../state/store';
import { accessFor, eventLabel, liveNow, sourceOf, nextUpcoming, phaseOf, schedulesOnDay, seriesById, statusOf, useNow, viewersOf, vodById } from '../../state/selectors';
import { addDays, dateKey, fmtCount, fmtCountdown, fmtDate, fmtDuration, fmtTime } from '../../lib/time';
import { Art, Icon, LiveBadge, LockIcon, Note, ProfileAvatar, SectionHead, TierBadge, useEnv } from '../ui';

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
    exclusive: () => <ExclusiveSection now={now} schedules={schedules} />,
    popular: () => <PopularVod />,
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
            SCR-02 홈 · {env.mode === 'season' ? '시즌 구성: LIVE 최우선' : 'HOME-R6 비시즌 구성: LIVE NOW 숨김, 큐레이션·인기 VOD 상단'} · HOME-R1 섹션 순서/노출은 CMS 메인 화면 관리에서 변경(앱 배포 없음) · HOME-R4 모든 시각 단말 시간대
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
      <Note>HOME-02 메인 배너 · 최대 8개 · 5초 자동 롤링 · 노출 대상 등급 (구독 유도 배너는 무료 회원만)</Note>
    </section>
  );
}

// ---- LIVE NOW --------------------------------------------------------------------------

function LiveNowSection({ now, schedules }: { now: number; schedules: Schedule[] }) {
  const env = useEnv();
  const cfg = env.layout.find((x) => x.id === 'liveNow');
  const live = liveNow(schedules, now);
  const next = cfg?.emptyMode === 'hide' ? undefined : nextUpcoming(schedules, now);
  if (!live.length && !next) return null;

  return (
    <section className="sec">
      <SectionHead title={<>LIVE NOW {live.length > 0 && <span className="count">{live.length}</span>}</>} note={`HOME-03 · 정렬: CMS 우선순위 > 시작 시각 · 0건: ${cfg?.emptyMode === 'hide' ? '섹션 숨김' : '다음 라이브 카운트다운'} · 시청자 수 ${cfg?.showViewers === false ? '숨김' : '노출'} (CMS 설정) · 권한 없는 등급은 잠금`} />
      {live.length ? (
        <div className="hscroll">
          {live.map((s) => (
            <LiveCard key={s.id} s={s} now={now} viewers={cfg?.showViewers !== false} />
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

export function LiveCard({ s, now, wide, viewers = true }: { s: Schedule; now: number; wide?: boolean; viewers?: boolean }) {
  const env = useEnv();
  const se = seriesById(s.seriesId);
  const locked = env.member !== 'guest' && accessFor(env.member, s.tier) !== 'ok';
  return (
    <button className={`card live-card ${wide ? 'is-wide' : ''}`} onClick={() => env.push({ name: 'live', scheduleId: s.id })}>
      <Art hue={se.hue + (s.lang === 'ES' ? 30 : 0)}>
        <span className="art-tl">
          <LiveBadge small />
          {sourceOf(s) === 'exclusive' && <span className="excl-tag">Only on WSOP TV</span>}
        </span>
        <span className="art-tr">
          <TierBadge tier={s.tier} />
        </span>
        {viewers && (
          <span className="art-bl viewers">
            <Icon name="eye" size={12} /> {fmtCount(viewersOf(s, now))}
          </span>
        )}
        {locked && (
          <span className="art-br lock" aria-label="Upgrade required">
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
      <SectionHead title="Schedule" action="Full schedule" onAction={() => env.goTab('schedule')} note="HOME-04 오늘의 편성 · 오늘/내일/모레 · 시간순 · 상태(예정/LIVE/종료) · 채널·언어 · 시간 변경 시 Changed · 비로그인 알림 신청 시 로그인 유도" />
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
    else if (status === 'upcoming') env.push({ name: 'live', scheduleId: s.id });
  };
  const bell = () => {
    if (env.member === 'guest') return env.sheet({ kind: 'login', reason: 'Log in to get a reminder when this broadcast starts.' });
    toggleAlarm(s.id);
    toast(on ? 'Reminder removed' : `Reminder set · ${fmtTime(s.start, env.tz)}`);
  };
  return (
    <li className={`sched-row is-${status}`}>
      <button className="sched-main" onClick={open}>
        <span className="sched-time">
          {fmtTime(s.start, env.tz)}
          {s.originalStart && status === 'upcoming' && <span className="changed">Changed</span>}
        </span>
        <span className="sched-body">
          <span className="sched-title">
            {s.id.startsWith('sc-n') && <span className="new-tag">New</span>}
            {sourceOf(s) === 'exclusive' && <span className="excl-dot" title="Only on WSOP TV" aria-label="Only on WSOP TV" />}
            {s.title}
          </span>
          <span className="sched-meta">
            {eventLabel(s)} · {s.channelId} · {s.lang}
          </span>
        </span>
        {status === 'live' && <span className="st st-live">LIVE</span>}
        {status === 'ended' && <span className="st-replay">{s.vodId ? 'Replay' : 'Ended'}</span>}
      </button>
      {status === 'upcoming' && (
        <button className={`remind-btn ${on ? 'is-on' : ''}`} aria-pressed={on} aria-label={on ? 'Remove reminder' : 'Set reminder'} onClick={bell}>
          <Icon name="bell" size={14} />
          {on ? 'Set' : 'Remind'}
        </button>
      )}
    </li>
  );
}

// ---- only on WSOP TV: every bracelet final table -------------------------------------------

/** Content group (3): bracelet final tables streamed only on WSOP TV, auto-produced with AI. Live → upcoming → replays. */
function ExclusiveSection({ now, schedules }: { now: number; schedules: Schedule[] }) {
  const env = useEnv();
  const covered = useStore((s) => s.autoCovered);
  const ai = useStore((s) => s.aiCommentary);
  const fts = schedules.filter((s) => s.visible && sourceOf(s) === 'exclusive' && s.lang === 'EN');
  const live = fts.filter((s) => statusOf(s, now) === 'live');
  const upcoming = fts.filter((s) => statusOf(s, now) === 'upcoming').sort((a, b) => a.start.localeCompare(b.start)).slice(0, 3);
  const replays = fts
    .filter((s) => statusOf(s, now) === 'ended' && s.vodId)
    .sort((a, b) => b.start.localeCompare(a.start))
    .slice(0, 3);
  if (!live.length && !upcoming.length && !replays.length) return null;
  return (
    <section className="sec excl-sec">
      <SectionHead title="Only on WSOP TV" note="콘텐츠 3분류 중 ③ WSOP TV 전용 · 모든 Bracelet 파이널 테이블 (연 ~250개) · RFID→EBS · AI 카메라·마이크 · AI 해설로 자동 제작" />
      <p className="excl-lead">
        Every bracelet final table, live and on demand.{' '}
        <span className="muted">
          Final table {covered} of ~250 this year{ai ? ' · AI commentary' : ''}
        </span>
      </p>
      <div className="hscroll">
        {live.map((s) => (
          <LiveCard key={s.id} s={s} now={now} />
        ))}
        {upcoming.map((s) => (
          <button key={s.id} className="card excl-card" onClick={() => env.push({ name: 'live', scheduleId: s.id })}>
            <Art hue={seriesById(s.seriesId).hue}>
              <span className="art-tl excl-time">{fmtTime(s.start, env.tz)}</span>
              <span className="art-tr">
                <TierBadge tier={s.tier} />
              </span>
            </Art>
            <span className="card-title">{s.title}</span>
            <span className="card-meta">{fmtDate(s.start, env.tz)} · Upcoming</span>
          </button>
        ))}
        {replays.map((s) => (
          <button key={s.id} className="card excl-card" onClick={() => env.push({ name: 'vod', vodId: s.vodId! })}>
            <Art hue={seriesById(s.seriesId).hue + 20}>
              <span className="art-tl excl-time">Replay</span>
              <span className="art-tr">
                <TierBadge tier={s.tier} />
              </span>
            </Art>
            <span className="card-title">{s.title}</span>
            <span className="card-meta">{eventLabel(s)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ---- tournaments ------------------------------------------------------------------------

function TournamentsRow({ now }: { now: number }) {
  const env = useEnv();
  const order = { ongoing: 0, upcoming: 1, ended: 2 } as const;
  const list = series.filter((x) => phaseOf(x, now) !== 'ended').sort((a, b) => order[phaseOf(a, now)] - order[phaseOf(b, now)] || a.start.localeCompare(b.start))
    .slice(0, 10);
  if (!list.length) return null;
  return (
    <section className="sec">
      <SectionHead title="Tournaments" action="All" onAction={() => env.goTab('tournaments')} note="HOME-05 · 진행 중 > 예정(시작일 빠른 순) · 최대 10개" />
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
      <Art hue={x.hue} ratio="16/10">
        <span className="art-tl tour">{x.tour}</span>
        {phase === 'ongoing' && <span className="art-tr phase">● On now</span>}
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
      <Note>HOME-06 띠배너 · 노출 기간 내 1개 · 등급별로 다른 배너</Note>
    </section>
  );
}

// ---- VOD rows ------------------------------------------------------------------------

export function VodCard({ v, width = 'md' }: { v: Vod; width?: 'md' | 'lg' }) {
  const env = useEnv();
  const se = seriesById(v.seriesId);
  const locked = env.member !== 'guest' && accessFor(env.member, v.tier) !== 'ok';
  return (
    <button className={`card vod-card w-${width}`} onClick={() => env.push({ name: 'vod', vodId: v.id })}>
      <Art hue={se.hue + 20}>
        {locked && (
          <span className="art-tl lock" aria-label="Upgrade required">
            <LockIcon />
          </span>
        )}
        <span className="art-tr">
          <TierBadge tier={v.tier} />
        </span>
        <span className="art-br dur">{fmtDuration(v.durationSec)}</span>
      </Art>
      <span className="card-title">{v.title}</span>
      <span className="card-meta">{v.type}</span>
    </button>
  );
}

function Curations() {
  const list = curations.map((c) => ({ ...c, vods: c.vodIds.map((id) => vodById(id)).filter((v): v is Vod => !!v) })).filter((c) => c.vods.length)
    .slice(0, 2);
  if (!list.length) return null;
  return (
    <>
      {list.map((c, n) => (
        <section className="sec" key={c.id}>
          <SectionHead title={c.title} note={n === 0 ? 'HOME-07 큐레이션 VOD (복수 섹션) · 섹션별 개수·정렬은 CMS 설정 · 권한 없는 등급은 잠금 + 미리보기' : undefined} />
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

/** HOME-08 Popular VOD: top 10 by views, rank numbers emphasised. Shorts and hidden VOD excluded. */
function PopularVod() {
  const env = useEnv();
  const top = [...vods].filter((v) => v.type !== 'Shorts').sort((a, b) => b.views - a.views).slice(0, 10);
  if (!top.length) return null;
  return (
    <section className="sec">
      <SectionHead title="Top 10 This Week" note="HOME-08 인기 VOD · 조회수 TOP 10 · 집계 기간(24시간/7일)·대상 타입은 CMS 설정" />
      <div className="hscroll">
        {top.map((v, i) => (
          <button key={v.id} className="card rank-card" onClick={() => env.push({ name: 'vod', vodId: v.id })}>
            <span className="rank-n" aria-label={`Rank ${i + 1}`}>
              {i + 1}
            </span>
            <span className="rank-body">
              <Art hue={seriesById(v.seriesId).hue + 20}>
                <span className="art-tr">
                  <TierBadge tier={v.tier} />
                </span>
                <span className="art-br dur">{fmtDuration(v.durationSec)}</span>
              </Art>
              <span className="card-title">{v.title}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
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
      <SectionHead title="Plans" action="Compare" onAction={() => env.push({ name: 'paywall' })} note="(선택 섹션) 기획안 홈 구성에는 없음 · 기본 숨김 · 요금제 비교는 SCR-10 페이월" />
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
  const continueList = useStore((s) => s.continueList);
  const [editing, setEditing] = useState(false);
  if (env.member === 'guest') return null;
  // HOME-09: recent first, max 10, 90%+ watched counts as finished.
  const items = continueList
    .filter((c) => c.progress < 0.9)
    .slice(0, 10)
    .map((c) => ({ ...c, v: vodById(c.vodId)! }))
    .filter((c) => c.v);
  if (!items.length) return null;
  return (
    <section className="sec">
      <SectionHead
        title="Continue Watching"
        action={env.preview ? undefined : editing ? 'Done' : 'Edit'}
        onAction={() => setEditing((e) => !e)}
        note="HOME-09 · CW-01·02 · 로그인 회원만 · 최근 시청 순 최대 10개 · 90% 이상 시청 완료 제외 · 기기 간 동기화 · Edit로 수동 삭제"
      />
      <div className="hscroll">
        {items.map(({ v, progress }) => (
          <div key={v.id} className={`cw-item ${editing ? 'is-editing' : ''}`}>
            <button className="card vod-card w-md" onClick={() => (editing ? undefined : env.push({ name: 'vod', vodId: v.id }))}>
              <Art hue={seriesById(v.seriesId).hue + 20}>
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
            {editing && (
              <button
                className="cw-remove"
                aria-label={`Remove ${v.title} from Continue Watching`}
                onClick={() => {
                  removeContinue(v.id);
                  toast('Removed from Continue Watching');
                }}
              >
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function PlayersRow() {
  const env = useEnv();
  return (
    <section className="sec">
      <SectionHead title="Players" note="HOME-10 추천 선수 · CMS 수동 지정 순서" />
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
  return <ProfileAvatar name={name} hue={hue} size={size} />;
}

/** Notices this member can see: tier notices only for that tier, pinned first, then newest (HOME-11, SCR-12). */
export function visibleNotices(member: Member) {
  return notices
    .filter((n) => !n.audiences?.length || n.audiences.includes(member))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.date.localeCompare(a.date));
}

function NoticeRow() {
  const env = useEnv();
  const n = visibleNotices(env.member)[0];
  if (!n) return null;
  return (
    <section className="sec sec-tight">
      <Note>HOME-11 공지 · 회원 등급에 맞는 공지 중 최신 1건 · 상단 고정 우선</Note>
      <button className="notice" onClick={() => env.push({ name: 'notice', noticeId: n.id })}>
        <span className="notice-tag">Notice</span>
        <span className="notice-title">{n.title}</span>
        <span className="card-meta">{fmtDate(n.date, env.tz)}</span>
      </button>
    </section>
  );
}
