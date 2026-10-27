// v3 — the OTT basics, in a poker voice: Continue Watching, My List, a "for you" row built on players and events
// (not genres), and an event page that works like a series page (episodes = broadcast days). Kept calm: a row only
// appears when it has something, four cards per row, no status labels on artwork.
import { Link, useParams } from 'react-router-dom';
import { archive, dayById, eventById, events, hands, playerById, seriesById } from '../data/mock';
import { COMPLETE_THRESHOLD } from '../data/policy';
import { money } from '../lib/format';
import { thumbFor } from '../lib/media';
import { fmtDate } from '../lib/time';
import { isOnAir } from '../lib/broadcast';
import { useApp } from '../state/app';
import { ArchiveCard, BroadcastCard, HandCard, useDayStatus } from '../components/cards';
import { BraceletIcon, Button, Icon, LiveTag, Page, SectionHeader, Spoiler, cx } from '../components/ui';
import { ListItemCard, MyListButton } from '../features/library/MyList';
import type { Day, TourEvent } from '../data/types';
import { NotFound } from './NotFound';

// Three big cards per row; every card plays when pressed.
const grid = 'grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 [&>*]:w-auto! [&>*]:min-w-0';

/** Broadcast days the viewer has started and not finished, most watched first. */
function useInProgress() {
  const { state, signedIn } = useApp();
  if (!signedIn) return [];
  return Object.entries(state.progress)
    .map(([id, sec]) => ({ ref: dayById(id), sec }))
    .filter((x): x is { ref: NonNullable<ReturnType<typeof dayById>>; sec: number } => !!x.ref)
    .map((x) => ({ ...x, pct: x.sec / (x.ref.day.durationMin * 60) }))
    .filter((x) => x.pct < COMPLETE_THRESHOLD);
}

export function ContinueRow() {
  const { set, toast } = useApp();
  const items = useInProgress();
  if (!items.length) return null;
  const remove = (dayId: string, sec: number) => {
    set((s) => {
      const next = { ...s.progress };
      delete next[dayId];
      return { progress: next };
    });
    toast('Removed from Continue Watching', { label: 'Undo', onClick: () => set((s) => ({ progress: { ...s.progress, [dayId]: sec } })) });
  };
  return (
    <section aria-label="Continue watching">
      <SectionHeader title="Continue watching" />
      <div className={grid}>
        {items.slice(0, 3).map(({ ref, sec, pct }) => (
          <BroadcastCard key={ref.day.id} event={ref.event} day={ref.day} progress={pct} extraActions={[{ label: 'Remove from Continue Watching', icon: 'close', onSelect: () => remove(ref.day.id, sec) }]} />
        ))}
      </div>
    </section>
  );
}

export function MyListRow() {
  const { state, signedIn } = useApp();
  if (!signedIn || !state.myList.length) return null;
  return (
    <section aria-label="My List">
      <SectionHeader
        title="My List"
        action={
          <Link to="/my-list" className="text-sm font-semibold text-muted hover:text-text">
            See all →
          </Link>
        }
      />
      <div className={grid}>
        {[...state.myList]
          .sort((a, b) => b.addedAt - a.addedAt)
          .slice(0, 3)
          .map((x) => (
            <ListItemCard key={x.kind + x.id} item={x} />
          ))}
      </div>
    </section>
  );
}

/** Classics — legendary final tables, newest first; each plays when pressed. */
export function ClassicsRow() {
  const list = [...archive].sort((a, b) => b.year - a.year).slice(0, 3);
  return (
    <section aria-label="Classics">
      <SectionHeader
        title="Classics"
        action={
          <Link to="/archive" className="text-sm font-semibold text-muted hover:text-text">
            Archive →
          </Link>
        }
      />
      <div className={grid}>
        {list.map((a) => (
          <ArchiveCard key={a.id} item={a} />
        ))}
      </div>
    </section>
  );
}

/** Latest full replays — ready to play (replaces "coming up", which can't be played yet). */
export function ReplaysRow() {
  // Skip what's already in Continue Watching, so the same broadcast isn't shown twice.
  const started = new Set(useInProgress().map((x) => x.ref.day.id));
  const latest = events
    .flatMap((e) => e.days.filter((d) => d.status === 'vod' && !started.has(d.id)).map((d) => ({ e, d })))
    .sort((a, b) => b.d.start.localeCompare(a.d.start))
    .slice(0, 3);
  return (
    <section aria-label="Latest replays">
      <SectionHeader
        title="Latest replays"
        action={
          <Link to="/archive" className="text-sm font-semibold text-muted hover:text-text">
            Archive →
          </Link>
        }
      />
      <div className={grid}>
        {latest.map(({ e, d }) => (
          <BroadcastCard key={d.id} event={e} day={d} />
        ))}
      </div>
    </section>
  );
}

/** Recommendations the poker way: players you follow first, otherwise the most-watched hands. */
export function ForYouRow() {
  const { state, signedIn } = useApp();
  const followed = signedIn ? Object.keys(state.followed) : [];
  const fromFollowed = hands.filter((h) => h.playerIds.some((p) => followed.includes(p))).sort((a, b) => b.views - a.views);
  const personal = fromFollowed.length >= 2;
  const list = (personal ? fromFollowed : [...hands].sort((a, b) => b.views - a.views)).slice(0, 3);
  return (
    <section aria-label="Highlights">
      <SectionHeader
        title="Highlights"
        action={
          <Link to="/highlights" className="text-sm font-semibold text-muted hover:text-text">
            All highlights →
          </Link>
        }
      />
      <div className={grid}>
        {list.map((h) => (
          <HandCard key={h.id} hand={h} />
        ))}
      </div>
    </section>
  );
}

// ---- event page = series page --------------------------------------------------------------------

export function TvEventDetail() {
  const { eventId = '' } = useParams();
  const { state } = useApp();
  const e = eventById(eventId);
  const inProgress = useInProgress();
  if (!e) return <NotFound />;
  const se = seriesById(e.seriesId);
  const status = (d: Day) => (d.id === 'lv-main-finaltable' ? state.streamMode : d.status);
  const resume = inProgress.find((x) => x.ref.event.id === e.id);
  const live = e.days.find((d) => isOnAir(status(d)));
  const first = e.days.find((d) => status(d) === 'vod');
  const keyHands = hands.filter((h) => h.eventId === e.id).sort((a, b) => b.pot - a.pot).slice(0, 4);

  const cta = resume
    ? { to: `/watch/${resume.ref.day.id}`, label: `Continue ${resume.ref.day.label} · ${Math.round(resume.pct * 100)}%` }
    : live
      ? { to: `/watch/${live.id}`, label: `Watch ${live.label} live` }
      : first
        ? { to: `/watch/${first.id}`, label: `Watch from ${first.label}` }
        : null;

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <img src={thumbFor(`event:${e.id}`)} alt="" className="absolute inset-0 size-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/85 to-bg/15" aria-hidden />
        <Page className="relative py-12 sm:py-16">
          <p className="flex items-center gap-1.5 text-sm text-text/80">
            <BraceletIcon size={16} /> {se.name} · Event #{e.number}
          </p>
          <h1 className="mt-2 max-w-3xl text-[2.25rem] leading-[1.04] font-black tracking-tight sm:text-display">{e.name}</h1>
          <p className="mt-3 text-sm text-muted">
            {e.game} · Buy-in {e.buyIn ? money(e.buyIn) : 'Invitational'}
            {e.entrants > 0 && ` · ${e.entrants.toLocaleString('en-US')} entries · prize pool ${money(e.prizePool)}`}
          </p>
          {e.winnerId && (
            <p className="mt-1 text-sm text-muted">
              Champion{' '}
              <Spoiler k={`winner-${e.id}`} inline label="Champion hidden">
                <b className="text-text">{playerById(e.winnerId).name}</b>
              </Spoiler>
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            {cta && (
              <Link to={cta.to}>
                <Button variant="primary" size="lg" tabIndex={-1}>
                  <Icon name="play" size={18} /> {cta.label}
                </Button>
              </Link>
            )}
            <MyListButton kind="event" id={e.id} size="md" className="h-12" />
          </div>
        </Page>
      </section>

      <Page className="space-y-10 py-10">
        <section aria-label="Broadcast days">
          <SectionHeader title="Episodes" kicker={`${e.days.length} broadcast days`} />
          <ol className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
            {e.days.map((d) => (
              <Episode key={d.id} e={e} d={d} pct={inProgress.find((x) => x.ref.day.id === d.id)?.pct} />
            ))}
          </ol>
        </section>
        {keyHands.length > 0 && (
          <section aria-label="Key hands">
            <SectionHeader
              title="Key hands"
              action={
                <Link to="/highlights" className="text-sm font-semibold text-muted hover:text-text">
                  All highlights →
                </Link>
              }
            />
            <div className={grid}>
              {keyHands.map((h) => (
                <HandCard key={h.id} hand={h} />
              ))}
            </div>
          </section>
        )}
      </Page>
    </>
  );
}

function Episode({ e, d, pct }: { e: TourEvent; d: Day; pct?: number }) {
  const { state } = useApp();
  const st = useDayStatus(d);
  const playable = st === 'vod' || isOnAir(st);
  const body = (
    <>
      <span className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-[8px] bg-surface-3 sm:w-44">
        <img src={thumbFor(`day:${d.id}`)} alt="" loading="lazy" className={cx('size-full object-cover', !playable && 'opacity-50')} />
        {pct !== undefined && (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
            <i className="block h-full bg-gold" style={{ width: `${Math.round(pct * 100)}%` }} />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[15px] font-bold">
          {d.label} {isOnAir(st) && <LiveTag />}
        </span>
        <span className="block text-xs text-muted">
          {fmtDate(d.start, state.tz)} · {Math.round(d.durationMin / 60)}h · {d.tables.length} {d.label === 'Final Table' ? (d.tables.length > 1 ? 'camera feeds' : 'feed') : d.tables.length > 1 ? 'tables' : 'table'}
        </span>
        {pct !== undefined && <span className="block text-xs text-gold-strong">{Math.round(pct * 100)}% watched</span>}
        {!playable && <span className="block text-xs text-subtle">Airs {fmtDate(d.start, state.tz)}</span>}
      </span>
      {playable && <Icon name="play" size={18} className="shrink-0 text-muted" />}
    </>
  );
  return (
    <li>
      {playable ? (
        <Link to={`/watch/${d.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-surface-2" aria-label={`${e.name} ${d.label}`}>
          {body}
        </Link>
      ) : (
        <div className="flex items-center gap-4 px-4 py-3">{body}</div>
      )}
    </li>
  );
}
