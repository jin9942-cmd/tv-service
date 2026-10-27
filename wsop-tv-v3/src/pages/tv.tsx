// v3 — NBA TV-style site: the channel is the product. Home leads with the live channel player and what's on now /
// up next, then today's schedule, the shows, the latest video and how to watch. Labels stay minimal.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { airing, channelById, channels, programAt, programsFor, reminderKey, type LinearChannel, type Program } from '../data/channels';
import { airingsOf, commentaryFor, showById, showOf, shows, type Show } from '../data/shows';
import { dayById, hands } from '../data/mock';
import { PLATFORMS } from '../data/platforms';
import { thumbFor } from '../lib/media';
import { HERO_IMAGES } from '../lib/brand';
import { money } from '../lib/format';
import { VENUE_TZ, dayKey, fmtDate, fmtTime, relative } from '../lib/time';
import { useApp, useTick } from '../state/app';
import { HandCard } from '../components/cards';
import { Button, Icon, Page, SectionHeader, cx } from '../components/ui';
import { ChannelGuide, ChannelNumber, ChannelPlayer, useProgramReminder } from '../features/channels/Channels';
import { Plans } from '../features/auth/Plans';
import { NotFound } from './NotFound';
import { ClassicsRow, ContinueRow, ForYouRow, ReplaysRow } from './ott';

const BREAK_TITLES = ['Coming Up', 'A continuación'];
const isBreak = (p: Program) => BREAK_TITLES.includes(p.title);
const showPoster = (s: Show) => thumbFor(`show:${s.id}`, s.art);

// ---- Home -------------------------------------------------------------------------------------------

export function TvHome() {
  const [params, setParams] = useSearchParams();
  const now = useTick(15_000);
  const ch = channelById(params.get('ch') ?? '') ?? channels[0];
  const p = programAt(ch.id, now);
  // The channel starts on a big poster; pressing it plays in place (switching channel keeps playing).
  const [started, setStarted] = useState(params.get('play') === '1');
  const setCh = (id: string) => setParams(started ? { ch: id, play: '1' } : { ch: id }, { replace: true });
  // Mini player: once playback has started, scrolling the player out of view docks it bottom-right and it keeps playing.
  const holder = useRef<HTMLDivElement>(null);
  const [offscreen, setOffscreen] = useState(false);
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    // Docked once less than ~30% of the player is left above the fold (checked on scroll and resize).
    const check = () => {
      const r = el.getBoundingClientRect();
      setOffscreen(r.top < 0 && r.bottom < r.height * 0.3);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => (window.removeEventListener('scroll', check), window.removeEventListener('resize', check));
  }, [p?.id, started]);
  const mini = started && offscreen;
  const backToPlayer = () => {
    const el = holder.current;
    if (!el) return;
    const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 120);
    window.scrollTo({ top, behavior: 'smooth' });
    // Some browsers ignore smooth scrolling (reduced motion, embedded views): fall back to a jump.
    window.setTimeout(() => Math.abs(window.scrollY - top) > 40 && window.scrollTo(0, top), 500);
    setOffscreen(false);
  };

  return (
    <>
      <section className="border-b border-line" aria-label="Watch WSOP TV">
        {p &&
          (started ? (
            <Page className="max-w-[96rem] py-5 sm:py-6">
              {/* The holder keeps the player's space while it's docked, so the page doesn't jump. */}
              <div ref={holder} className={cx(mini && 'aspect-video rounded-panel border border-dashed border-line')}>
                <div
                  className={cx(
                    mini && 'fixed right-3 bottom-20 z-[57] w-[min(15rem,calc(100vw-1.5rem))] overflow-hidden rounded-panel bg-black shadow-2xl ring-1 ring-line-strong sm:w-[24rem] md:right-5 md:bottom-5',
                  )}
                  role={mini ? 'region' : undefined}
                  aria-label={mini ? 'Mini player' : undefined}
                >
                  {mini && (
                    <div className="flex items-center gap-2 bg-surface px-3 py-1.5">
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                        {ch.name} · <span className="text-muted">{p.title}</span>
                      </span>
                      <button onClick={backToPlayer} aria-label="Back to the full player" title="Back to the full player" className="rounded-chip p-1.5 text-muted hover:text-text">
                        <Icon name="full" size={16} />
                      </button>
                      <button onClick={() => setStarted(false)} aria-label="Close mini player" title="Close" className="rounded-chip p-1.5 text-muted hover:text-text">
                        <Icon name="close" size={16} />
                      </button>
                    </div>
                  )}
                  <ChannelPlayer key={`${ch.id}:${p.id}`} ch={ch} p={p} onSwitch={setCh} mini={mini} />
                </div>
              </div>
              <OnNow ch={ch} p={p} now={now} />
            </Page>
          ) : (
            <HeroBillboard ch={ch} p={p} onPlay={() => setStarted(true)} />
          ))}
        {/* Channels sit under the hero (switching keeps whatever mode the hero is in). */}
        <Page className="max-w-[96rem] pt-4 pb-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="label text-text/80">Channels · 24/7</p>
            <Link to="/schedule" className="text-sm font-semibold text-muted hover:text-text">
              Full schedule →
            </Link>
          </div>
          <ChannelTabs active={ch.id} now={now} onSelect={setCh} />
        </Page>
      </section>

      {/* Home rows (max six; personal rows only appear when they have something). */}
      <Page className="space-y-12 py-10">
        <ContinueRow />
        <ClassicsRow />
        <ReplaysRow />
        <ForYouRow />
        <HowToWatchBand />
      </Page>
    </>
  );
}

/** What sets a channel apart at a glance (language, or free) — skipped when the name already says it. */
const channelTrait = (ch: LinearChannel) => (ch.free ? 'Free' : ch.lang === 'ES' ? null : 'English');

function ChannelTabs({ active, now, onSelect }: { active: string; now: number; onSelect: (id: string) => void }) {
  return (
    // Full-width grid (no sideways scroll), so programme titles have room.
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4" role="tablist" aria-label="Channels">
      {channels.map((ch) => {
        const p = programAt(ch.id, now);
        const on = ch.id === active;
        return (
          <button
            key={ch.id}
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(ch.id)}
            className={cx('flex min-w-0 items-center gap-3 rounded-card border px-3 py-2.5 text-left transition-colors duration-150', on ? 'border-gold bg-gold-dim' : 'border-line bg-surface hover:border-line-strong')}
          >
            <ChannelNumber ch={ch} className={on ? 'border-gold text-gold-strong' : undefined} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="truncate text-sm font-bold">{ch.name}</span>
                {channelTrait(ch) && <span className="shrink-0 text-[11px] text-subtle">{channelTrait(ch)}</span>}
              </span>
              <span className="block truncate text-xs text-muted" title={p?.title}>
                <span className="font-semibold text-text/70">Now</span> · {p?.title}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Home banner, wsop.com style: a still photo (no autoplay), with the title, a line of facts, a short synopsis and the
 * actions beside it. Two slides — what's on the channel now, and the archive. "Watch live" opens the full player.
 */
function HeroBillboard({ ch, p, onPlay }: { ch: LinearChannel; p: Program; onPlay: () => void }) {
  const { state } = useApp();
  const [slide, setSlide] = useState(0);
  const live = airing(p, state.streamMode).mode === 'onair';
  const ref = p.dayId ? dayById(p.dayId) : undefined;
  const show = showOf(p);
  const next = programsFor(ch.id).find((x) => x.start >= p.end && !isBreak(x));
  const title = ref ? ref.event.name.replace(' World Championship', '') : p.title;
  const facts = [
    ref?.day.label,
    ref && live && ref.day.label === 'Final Table' ? `${ref.event.remaining} players left` : null,
    ref ? ref.event.game : null,
    ch.name,
    `${fmtTime(p.start, state.tz)} – ${fmtTime(p.end, state.tz)}`,
  ].filter(Boolean) as string[];
  const synopsis = ref
    ? `${ref.event.entrants.toLocaleString('en-US')} entered. ${live && ref.day.label === 'Final Table' ? `${ref.event.remaining} remain, playing for ${money(ref.event.firstPrize)} and the bracelet.` : 'Every key hand of the day, from the feature table.'}`
    : show?.description ?? p.subtitle;
  const details = ref ? `/events/${ref.event.id}` : show ? `/shows/${show.id}` : '/schedule';
  const slides = [
    {
      img: HERO_IMAGES.table,
      pos: '30% 25%',
      kicker: live ? `Live now · ${ch.name}` : `On now · ${ch.name}`,
      title,
      facts,
      synopsis,
      note: next ? `Next ${fmtTime(next.start, state.tz)} · ${next.title}` : null,
      actions: (
        <>
          <Button variant="primary" size="lg" onClick={onPlay}>
            <Icon name="play" size={18} /> {live ? 'Watch live' : 'Watch now'}
          </Button>
          <Link to={details}>
            <Button variant="secondary" size="lg" tabIndex={-1}>
              Details
            </Button>
          </Link>
        </>
      ),
    },
    {
      img: HERO_IMAGES.portrait,
      pos: '50% 20%',
      kicker: 'WSOP Archive',
      title: 'Every final table, on demand',
      facts: ['Classics', 'Full broadcasts', 'Key hands'],
      synopsis: 'Past WSOP final tables and every broadcast day, in one place — pick up any event from Day 1 to the bracelet.',
      note: null,
      actions: (
        <>
          <Link to="/archive">
            <Button variant="primary" size="lg" tabIndex={-1}>
              Browse the archive
            </Button>
          </Link>
          <Link to="/highlights">
            <Button variant="secondary" size="lg" tabIndex={-1}>
              Highlights
            </Button>
          </Link>
        </>
      ),
    },
  ];
  const sl = slides[slide];
  return (
    <div className="relative overflow-hidden bg-black" aria-roledescription="carousel" aria-label="Featured">
      {/* Ambient fill: the same photo, blurred and dimmed, across the whole banner, so the photo never ends in a hard edge. */}
      <img key={'bg-' + sl.img} src={sl.img} alt="" aria-hidden className="absolute inset-0 hidden size-full scale-110 object-cover opacity-50 blur-3xl md:block" />
      <div className="absolute inset-0 hidden bg-black/50 md:block" aria-hidden />
      {/* Photo: on top on phones; on wider screens right of centre, feathered into the fill on every side. */}
      <div className="hero-photo relative aspect-[16/10] w-full md:absolute md:inset-y-0 md:right-[3%] md:aspect-auto md:w-[60%]">
        <img key={sl.img} src={sl.img} alt="" className="size-full object-cover" style={{ objectPosition: sl.pos }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent md:hidden" aria-hidden />
      </div>
      <Page className="relative flex max-w-[96rem] flex-col justify-center pt-2 pb-8 md:min-h-[min(34rem,46vw)] md:py-12">
        <div className="max-w-xl" aria-live="polite">
          <p className="label text-gold">{sl.kicker}</p>
          <h1 className="mt-2 text-[2.4rem] leading-[1.02] sm:text-[3.4rem]">{sl.title}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-text/85">
            {sl.facts.map((x, i) => (
              <span key={i} className="inline-flex items-center gap-2">
                {i > 0 && <span className="text-subtle">·</span>}
                {x}
              </span>
            ))}
          </p>
          <p className="mt-3 line-clamp-2 text-[15px] text-text/75">{sl.synopsis}</p>
          <div className="mt-6 flex flex-wrap gap-2">{sl.actions}</div>
          {sl.note && <p className="mt-4 truncate text-xs text-muted">{sl.note}</p>}
        </div>
        <div className="mt-8 flex items-center gap-3">
          <button onClick={() => setSlide((slide + slides.length - 1) % slides.length)} aria-label="Previous" className="rounded-full border border-line-strong p-1.5 text-muted hover:border-text hover:text-text">
            <Icon name="back" size={16} />
          </button>
          <div className="flex gap-1.5">
            {slides.map((x, i) => (
              <button key={i} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}: ${x.kicker}`} aria-current={i === slide} className={cx('h-1 rounded-full transition-all duration-200', i === slide ? 'w-8 bg-gold' : 'w-4 bg-line-strong hover:bg-muted')} />
            ))}
          </div>
          <button onClick={() => setSlide((slide + 1) % slides.length)} aria-label="Next" className="rounded-full border border-line-strong p-1.5 text-muted hover:border-text hover:text-text">
            <Icon name="chevron" size={16} />
          </button>
        </div>
      </Page>
    </div>
  );
}

function OnNow({ ch, p, now }: { ch: LinearChannel; p: Program; now: number }) {
  const { state } = useApp();
  const show = showOf(p);
  const next = programsFor(ch.id).find((x) => x.start >= p.end && !isBreak(x));
  return (
    <div className="mt-4">
      <p className="text-xs text-muted tnum">
        On now · {ch.name} · {fmtTime(p.start, state.tz)} – {fmtTime(p.end, state.tz)} · ends {relative(p.end, now)}
        {next && (
          <>
            {' '}
            · <span className="text-text/80">Next {fmtTime(next.start, state.tz)} {next.title}</span>
          </>
        )}
      </p>
      <h2 className="mt-1 text-2xl font-black tracking-tight">{p.title}</h2>
      <p className="mt-1 text-sm text-muted">{p.subtitle}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {show && (
          <Link to={`/shows/${show.id}`}>
            <Button size="sm" variant="secondary" tabIndex={-1}>
              About {show.title}
            </Button>
          </Link>
        )}
        {p.dayId && (
          <Link to={`/watch/${p.dayId}`}>
            <Button size="sm" variant="outline" tabIndex={-1}>
              <Icon name="layers" size={14} /> All tables & camera feeds
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function ShowCard({ s, now }: { s: Show; now: number }) {
  const { state } = useApp();
  const next = airingsOf(s).find((p) => p.end > now);
  const live = next && next.start <= now;
  return (
    <Link to={`/shows/${s.id}`} className="group block min-w-0">
      <div className="relative aspect-video overflow-hidden rounded-card border border-line transition-[border-color,transform] duration-200 group-hover:scale-[1.02] group-hover:border-line-strong">
        <img src={showPoster(s)} alt="" loading="lazy" className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" aria-hidden />
        <p className="absolute inset-x-3 bottom-2.5 text-lg leading-tight font-black tracking-tight">{s.title}</p>
      </div>
      <p className="mt-2 truncate text-sm text-muted">{s.tagline}</p>
      {next && (
        <p className="truncate text-xs text-subtle">
          {live ? `On now · ${channelById(next.channelId)?.name}` : `Next ${fmtDate(next.start, state.tz)} · ${fmtTime(next.start, state.tz)} · ${channelById(next.channelId)?.name}`}
        </p>
      )}
    </Link>
  );
}

function HowToWatchBand() {
  const tiles: [string, string, string][] = [
    ['WSOP+ Free', 'WSOP Classics and every studio and highlight show — free with a GGPass account.', 'star'],
    ['WSOP+ membership', 'Live final tables and full replays on every channel.', 'play'],
    ['On every screen', 'Web, iOS, Android, and TV apps for Apple TV, Android TV, Roku, Samsung and LG.', 'tv'],
  ];
  return (
    <section className="rounded-panel border border-line bg-surface p-6 sm:p-8" aria-label="How to watch">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label text-gold">Official WSOP video service</p>
          <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">Every WSOP event, in one place</h2>
        </div>
        <Link to="/how-to-watch" className="text-sm font-semibold text-gold hover:underline">
          Plans & devices →
        </Link>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {tiles.map(([t, d, icon]) => (
          <div key={t} className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line-strong text-gold">
              <Icon name={icon} size={18} />
            </span>
            <div>
              <p className="font-bold">{t}</p>
              <p className="mt-0.5 text-sm text-muted">{d}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- Schedule -----------------------------------------------------------------------------------------

export function TvSchedule() {
  const { state } = useApp();
  const nav = useNavigate();
  const now = useTick(30_000);
  const [chId, setChId] = useState(channels[0].id);
  const ch = channelById(chId)!;
  const days = [...new Set(programsFor(ch.id).map((p) => dayKey(p.start, state.tz)))].filter((k) => k >= dayKey(now, state.tz)).slice(0, 2);
  const [day, setDay] = useState(0);
  const list = programsFor(ch.id).filter((p) => dayKey(p.start, state.tz) === days[day] && p.end > now - 3 * 3_600_000 && !isBreak(p));
  return (
    <Page className="max-w-[96rem]">
      <h1 className="text-title font-black">Schedule</h1>
      <p className="mt-1 text-sm text-muted">All times in your time zone.</p>
      <div className="mt-5">
        <ChannelTabs active={ch.id} now={now} onSelect={(id) => (setChId(id), setDay(0))} />
      </div>
      <div className="mt-4 flex gap-2" role="tablist" aria-label="Day">
        {days.map((k, i) => (
          <button key={k} role="tab" aria-selected={day === i} onClick={() => setDay(i)} className={cx('h-9 rounded-full border px-4 text-sm font-semibold', day === i ? 'border-gold bg-gold-dim text-text' : 'border-line-strong text-muted hover:text-text')}>
            {i === 0 ? 'Today' : 'Tomorrow'}
          </button>
        ))}
      </div>
      <ol className="mt-4 divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
        {list.map((p) => (
          <ScheduleRow key={p.id} ch={ch} p={p} now={now} />
        ))}
      </ol>
      <ChannelGuide now={now} active={ch.id} onSelect={(id) => nav(`/?ch=${id}`)} />
    </Page>
  );
}

function ScheduleRow({ ch, p, now }: { ch: LinearChannel; p: Program; now: number }) {
  const { state } = useApp();
  const toggle = useProgramReminder();
  const show = showOf(p);
  const isNow = p.start <= now && now < p.end;
  const past = p.end <= now;
  const on = state.reminders.includes(reminderKey(p));
  return (
    <li className={cx('flex items-center gap-4 px-4 py-3', isNow && 'bg-gold-dim', past && 'opacity-55')}>
      <span className="w-20 shrink-0 text-sm font-bold tnum">{fmtTime(p.start, state.tz)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">
          {show ? (
            <Link to={`/shows/${show.id}`} className="hover:text-gold-strong">
              {p.title}
            </Link>
          ) : (
            p.title
          )}
        </span>
        <span className="block truncate text-xs text-muted">
          {isNow ? `On now · ends ${relative(p.end, now)}` : p.subtitle}
          {commentaryFor(p) && (
            <span className="block truncate text-subtle sm:inline">
              <span className="hidden sm:inline"> · </span>
              {commentaryFor(p)}
            </span>
          )}
        </span>
      </span>
      {isNow ? (
        <Link to={`/?ch=${ch.id}`}>
          <Button size="sm" variant="primary" tabIndex={-1}>
            <Icon name="play" size={14} /> Watch
          </Button>
        </Link>
      ) : (
        !past && (
          <button
            onClick={() => toggle(p, ch)}
            aria-pressed={on}
            aria-label={on ? `Reminder set for ${p.title}` : `Remind me about ${p.title}`}
            className={cx('inline-flex size-9 items-center justify-center rounded-chip border transition-colors duration-150', on ? 'border-gold bg-gold-dim text-gold-strong' : 'border-line-strong text-muted hover:text-text')}
          >
            <Icon name="bell" size={16} />
          </button>
        )
      )}
    </li>
  );
}

// ---- Shows -------------------------------------------------------------------------------------------

export function TvShows() {
  const now = useTick(60_000);
  return (
    <Page>
      <h1 className="text-title font-black">Shows</h1>
      <p className="mt-1 text-sm text-muted">Live final tables, the studio show and highlight shows across every WSOP TV channel.</p>
      <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {shows.map((s) => (
          <ShowCard key={s.id} s={s} now={now} />
        ))}
      </div>
    </Page>
  );
}

export function TvShowDetail() {
  const { showId = '' } = useParams();
  const { state } = useApp();
  const now = useTick(30_000);
  const toggle = useProgramReminder();
  const s = showById(showId);
  if (!s) return <NotFound />;
  const all = airingsOf(s).filter((p) => p.end > now);
  const current = all.find((p) => p.start <= now);
  const upcoming = all.filter((p) => p.start > now).slice(0, 8);
  const clips = s.kind === 'highlights' || s.kind === 'live' ? [...hands].sort((a, b) => b.pot - a.pot).slice(0, 3) : [];
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <img src={showPoster(s)} alt="" className="absolute inset-0 size-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/80 to-bg/20" aria-hidden />
        <Page className="relative py-14 sm:py-20">
          <Link to="/shows" className="text-sm font-semibold text-muted hover:text-text">
            ← Shows
          </Link>
          <h1 className="mt-3 text-[2.5rem] leading-[1.02] font-black tracking-tight sm:text-display">{s.title}</h1>
          <p className="mt-2 text-lg font-semibold text-text/85">{s.tagline}</p>
          <p className="mt-3 max-w-2xl text-sm text-muted">{s.description}</p>
          {current && (
            <Link to={`/?ch=${current.channelId}`} className="mt-6 inline-block">
              <Button variant="primary" size="lg" tabIndex={-1}>
                <Icon name="play" size={18} /> Watch now on {channelById(current.channelId)?.name}
              </Button>
            </Link>
          )}
        </Page>
      </section>
      <Page className="space-y-10 py-10">
        <section aria-label="Upcoming airings">
          <SectionHeader title="Upcoming" />
          {upcoming.length ? (
            <ol className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
              {upcoming.map((p) => {
                const ch = channelById(p.channelId)!;
                const on = state.reminders.includes(reminderKey(p));
                return (
                  <li key={p.id} className="flex items-center gap-4 px-4 py-3">
                    <span className="w-36 shrink-0 text-sm font-bold tnum">
                      {fmtDate(p.start, state.tz)}
                      <span className="block text-xs font-semibold text-muted">{fmtTime(p.start, state.tz)}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{p.title}</span>
                      <span className="block truncate text-xs text-muted">{ch.name}</span>
                    </span>
                    <Button size="sm" variant={on ? 'secondary' : 'outline'} aria-pressed={on} onClick={() => toggle(p, ch)}>
                      <Icon name="bell" size={14} /> {on ? 'Reminder set' : 'Remind me'}
                    </Button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm text-muted">No airings scheduled in the next day and a half.</p>
          )}
        </section>
        {clips.length > 0 && (
          <section aria-label="Clips">
            <SectionHeader title="Clips" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clips.map((h) => (
                <HandCard key={h.id} hand={h} />
              ))}
            </div>
          </section>
        )}
        <p className="text-xs text-subtle">Times in your time zone · venue time {fmtTime(now, VENUE_TZ)} in Las Vegas.</p>
      </Page>
    </>
  );
}

// ---- How to watch -----------------------------------------------------------------------------------

export function TvHowToWatch() {
  const groups: [string, string[]][] = [
    ['Web', ['Any modern browser']],
    ['Mobile & tablet', ['iPhone', 'iPad', 'Android phones', 'Android tablets'].filter(Boolean)],
    ['TV', (['appletv', 'androidtv', 'roku', 'samsung', 'lg'] as const).map((p) => PLATFORMS[p].label)],
  ];
  return (
    <>
      <Page className="pb-0">
        <h1 className="text-title font-black">How to watch</h1>
        <p className="mt-1 text-sm text-muted">Sign in once with GGPass and watch every channel on any screen.</p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {groups.map(([t, items]) => (
            <section key={t} className="rounded-panel border border-line bg-surface p-5" aria-label={t}>
              <p className="label text-gold">{t}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {items.map((x) => (
                  <li key={x} className="flex items-center gap-2">
                    <Icon name="check" size={14} className="text-gold" /> {x}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Page>
      <Plans />
    </>
  );
}
