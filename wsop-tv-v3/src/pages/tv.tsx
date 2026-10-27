// v3 — NBA TV-style site: the channel is the product. Home leads with the live channel player and what's on now /
// up next, then today's schedule, the shows, the latest video and how to watch. Labels stay minimal.
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { channelById, channels, programAt, programsFor, reminderKey, type LinearChannel, type Program } from '../data/channels';
import { airingsOf, commentaryFor, showById, showOf, shows, type Show } from '../data/shows';
import { hands } from '../data/mock';
import { PLATFORMS } from '../data/platforms';
import { thumbFor } from '../lib/media';
import { VENUE_TZ, dayKey, fmtDate, fmtTime, relative } from '../lib/time';
import { useApp, useTick } from '../state/app';
import { HandCard } from '../components/cards';
import { Button, Icon, Page, SectionHeader, cx } from '../components/ui';
import { ChannelGuide, ChannelNumber, ChannelPlayer, UpNextList, mediaFor, useProgramReminder } from '../features/channels/Channels';
import { Plans } from '../features/auth/Plans';
import { NotFound } from './NotFound';

const BREAK_TITLES = ['Coming Up', 'A continuación'];
const isBreak = (p: Program) => BREAK_TITLES.includes(p.title);
const showPoster = (s: Show) => thumbFor(`show:${s.id}`, s.art);

// ---- Home -------------------------------------------------------------------------------------------

export function TvHome() {
  const [params, setParams] = useSearchParams();
  const now = useTick(15_000);
  const ch = channelById(params.get('ch') ?? '') ?? channels[0];
  const p = programAt(ch.id, now);
  const setCh = (id: string) => setParams({ ch: id }, { replace: true });

  return (
    <>
      <section className="border-b border-line bg-surface/40" aria-label="Watch WSOP TV">
        <Page className="max-w-[96rem] py-5 sm:py-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Watch WSOP TV</h1>
            <Link to="/schedule" className="text-sm font-semibold text-muted hover:text-text">
              Full schedule →
            </Link>
          </div>
          <ChannelTabs active={ch.id} now={now} onSelect={setCh} />
          {p && (
            <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="min-w-0">
                <ChannelPlayer key={`${ch.id}:${p.id}`} ch={ch} p={p} onSwitch={setCh} />
                <OnNow ch={ch} p={p} now={now} />
              </div>
              <aside>
                <UpNextList ch={ch} now={now} />
              </aside>
            </div>
          )}
        </Page>
      </section>

      <Page className="space-y-12 py-10">
        <TodayRail now={now} />
        <section aria-label="Shows">
          <SectionHeader
            title="Shows"
            action={
              <Link to="/shows" className="text-sm font-semibold text-muted hover:text-text">
                All shows →
              </Link>
            }
          />
          <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {shows.slice(0, 8).map((s) => (
              <ShowCard key={s.id} s={s} now={now} />
            ))}
          </div>
        </section>
        <section aria-label="Latest video">
          <SectionHeader
            title="Latest video"
            action={
              <Link to="/video" className="text-sm font-semibold text-muted hover:text-text">
                All video →
              </Link>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 [&>*]:w-auto!">
            {[...hands]
              .sort((a, b) => b.views - a.views)
              .slice(0, 4)
              .map((h) => (
                <HandCard key={h.id} hand={h} />
              ))}
          </div>
        </section>
        <HowToWatchBand />
      </Page>
    </>
  );
}

function ChannelTabs({ active, now, onSelect }: { active: string; now: number; onSelect: (id: string) => void }) {
  return (
    <div className="hscroll" role="tablist" aria-label="Channels">
      {channels.map((ch) => {
        const p = programAt(ch.id, now);
        const on = ch.id === active;
        return (
          <button
            key={ch.id}
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(ch.id)}
            className={cx('flex w-60 items-center gap-3 rounded-card border px-3 py-2.5 text-left transition-colors duration-150', on ? 'border-gold bg-gold-dim' : 'border-line bg-surface hover:border-line-strong')}
          >
            <ChannelNumber ch={ch} className={on ? 'border-gold text-gold-strong' : undefined} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{ch.name}</span>
              <span className="block truncate text-xs text-muted">{p?.title}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function OnNow({ ch, p, now }: { ch: LinearChannel; p: Program; now: number }) {
  const { state } = useApp();
  const show = showOf(p);
  return (
    <div className="mt-4">
      <p className="text-xs text-muted tnum">
        On now · {ch.name} · {fmtTime(p.start, state.tz)} – {fmtTime(p.end, state.tz)} · ends {relative(p.end, now)}
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

/** Today on WSOP TV: what's coming up next across all channels. */
function TodayRail({ now }: { now: number }) {
  const { state } = useApp();
  const nav = useNavigate();
  const list = channels
    .flatMap((ch) => programsFor(ch.id).map((p) => ({ ch, p })))
    .filter(({ p }) => p.start > now && !isBreak(p))
    .sort((a, b) => a.p.start - b.p.start)
    .slice(0, 4);
  return (
    <section aria-label="Coming up on WSOP TV">
      <SectionHeader
        title="Coming up on WSOP TV"
        action={
          <Link to="/schedule" className="text-sm font-semibold text-muted hover:text-text">
            Schedule →
          </Link>
        }
      />
      <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {list.map(({ ch, p }) => {
          const show = showOf(p);
          return (
            <button key={p.id} onClick={() => nav(show ? `/shows/${show.id}` : '/schedule')} className="group min-w-0 text-left">
              <div className="relative aspect-video overflow-hidden rounded-card border border-line transition-[border-color,transform] duration-200 group-hover:scale-[1.02] group-hover:border-line-strong">
                <img src={mediaFor(p).poster} alt="" loading="lazy" className="size-full object-cover" />
              </div>
              <p className="mt-2 text-sm font-bold tnum">
                {fmtTime(p.start, state.tz)} <span className="font-semibold text-muted">· {ch.name}</span>
              </p>
              <p className="truncate text-[15px] font-semibold group-hover:text-gold-strong">{p.title}</p>
            </button>
          );
        })}
      </div>
    </section>
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
        <h2 className="text-xl font-black tracking-tight sm:text-2xl">How to watch WSOP TV</h2>
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
