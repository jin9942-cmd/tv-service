// v3 — the poker side of the NBA TV-style site: Highlights (key hands) and Archive (Classics).
// Highlights are organised the way poker fans talk about hands (type, pot, players, event); Archive groups classic final
// tables by year and full broadcasts by event, day by day.
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { HandType } from '../data/types';
import { archive, eventById, events, hands, playerById, seriesById } from '../data/mock';
import { chips, duration, money } from '../lib/format';
import { FOOTAGE, thumbFor } from '../lib/media';
import { VENUE_TZ, fmtDate } from '../lib/time';
import { useApp } from '../state/app';
import { ArchiveCard, HandCard, useDayStatus } from '../components/cards';
import { BraceletIcon, Button, FilterChip, Icon, Page, SectionHeader, Spoiler, cx } from '../components/ui';
import { HAND_META, HandGlyph } from '../features/player/markers';
import { NotFound } from './NotFound';

const TYPES: HandType[] = ['allin', 'bigpot', 'bluff', 'badbeat', 'herofold'];

// ---- Highlights -----------------------------------------------------------------------------------

export function TvHighlights() {
  const [type, setType] = useState<HandType | 'all'>('all');
  const top = [...hands].sort((a, b) => b.pot - a.pot)[0];
  // The featured hand sits above, so it isn't repeated in the rows.
  const list = hands.filter((h) => h.id !== top.id && (type === 'all' || h.type === type));
  // One row per event, biggest pots first.
  const byEvent = events
    .map((e) => ({ e, list: list.filter((h) => h.eventId === e.id).sort((a, b) => b.pot - a.pot) }))
    .filter((x) => x.list.length);

  return (
    <>
      <HandOfTheDay id={top.id} />
      <Page className="space-y-10 py-8">
        <div>
          <h1 className="text-title font-black">Highlights</h1>
          <p className="mt-1 text-sm text-muted">Every key hand from the series — all-ins, monster pots, bluffs, bad beats and hero folds.</p>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Hand type">
            <FilterChip on={type === 'all'} onClick={() => setType('all')}>
              All hands
            </FilterChip>
            {TYPES.map((t) => (
              <FilterChip key={t} on={type === t} onClick={() => setType(t)}>
                <span className="inline-flex items-center gap-1.5">
                  <HandGlyph type={t} size={14} /> {HAND_META[t].label}
                </span>
              </FilterChip>
            ))}
          </div>
        </div>
        {byEvent.map(({ e, list: l }) => (
          <section key={e.id} aria-label={e.name}>
            <SectionHeader
              title={e.name}
              kicker={`Event #${e.number} · ${l.length} hand${l.length === 1 ? '' : 's'}`}
              action={
                <Link to={`/events/${e.id}`} className="text-sm font-semibold text-muted hover:text-text">
                  Event →
                </Link>
              }
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 [&>*]:w-auto!">
              {l.slice(0, 4).map((h) => (
                <HandCard key={h.id} hand={h} />
              ))}
            </div>
          </section>
        ))}
        {!byEvent.length && <p className="text-sm text-muted">No hands of this type yet.</p>}
      </Page>
    </>
  );
}

/** The featured hand: biggest pot of the series, told like a broadcast segment. */
function HandOfTheDay({ id }: { id: string }) {
  const h = hands.find((x) => x.id === id)!;
  const ev = eventById(h.eventId)!;
  const [a, b] = h.playerIds.map(playerById);
  return (
    <section className="relative overflow-hidden border-b border-line" aria-label="Hand of the Day">
      <img src={thumbFor(`hand:${h.id}`)} alt="" className="absolute inset-0 size-full object-cover opacity-55" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/85 to-bg/10" aria-hidden />
      <Page className="relative py-12 sm:py-16">
        <p className="label text-gold">Hand of the Day</p>
        <h2 className="mt-2 max-w-2xl text-[2rem] leading-[1.08] font-black tracking-tight sm:text-[2.75rem]">{h.title}</h2>
        <p className="mt-3 text-sm font-semibold text-text/85">
          {a.name} vs {b.name} · Pot {chips(h.pot)} · {ev.name}
        </p>
        <div className="mt-3 max-w-xl text-sm text-muted">
          <Spoiler k={`hand-${h.id}`} inline label="Hand result hidden">
            <span>{h.result}</span>
          </Spoiler>
        </div>
        <Link to={`/watch/${h.dayId}?t=${h.t}&clip=${h.id}`} className="mt-6 inline-block">
          <Button variant="primary" size="lg" tabIndex={-1}>
            <Icon name="play" size={18} /> Watch the hand · {duration(h.durationSec)}
          </Button>
        </Link>
      </Page>
    </section>
  );
}

// ---- Archive (Classics) -------------------------------------------------------------------------------

export function TvArchive() {
  const classics = [...archive].sort((a, b) => b.year - a.year);
  const replayEvents = events.filter((e) => e.days.some((d) => d.status === 'vod'));
  return (
    <Page className="space-y-12">
      <header>
        <h1 className="text-title font-black">Archive</h1>
        <p className="mt-1 text-sm text-muted">Classic final tables from past championships, and every broadcast day of this series in full.</p>
      </header>

      <section aria-label="Classics">
        <SectionHeader title="Classics" kicker="Legendary final tables" />
        <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 [&>*]:w-auto!">
          {classics.map((c) => (
            <ArchiveCard key={c.id} item={c} />
          ))}
        </div>
      </section>

      <section aria-label="Full broadcasts by event">
        <SectionHeader title="Full broadcasts" kicker={`${seriesById(replayEvents[0]?.seriesId ?? 'lv26').name} · by event`} />
        <div className="space-y-3">
          {replayEvents.map((e) => (
            <EventCollection key={e.id} eventId={e.id} />
          ))}
        </div>
      </section>
    </Page>
  );
}

/** An event as a collection: poster, facts, and each broadcast day (like seasons → episodes). */
function EventCollection({ eventId }: { eventId: string }) {
  const e = eventById(eventId)!;
  const { state } = useApp();
  return (
    <article className="grid gap-4 rounded-panel border border-line bg-surface p-4 sm:grid-cols-[14rem_minmax(0,1fr)] sm:p-5">
      <Link to={`/events/${e.id}`} className="group block">
        <div className="relative aspect-video overflow-hidden rounded-card border border-line">
          <img src={thumbFor(`event:${e.id}`)} alt="" loading="lazy" className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
        </div>
      </Link>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <BraceletIcon size={14} /> Event #{e.number} · {e.game} · Buy-in {e.buyIn ? money(e.buyIn) : 'Invitational'}
        </p>
        <h3 className="mt-1 text-lg font-bold">
          <Link to={`/events/${e.id}`} className="hover:text-gold-strong">
            {e.name}
          </Link>
        </h3>
        <p className="text-xs text-muted">
          {e.entrants ? `${e.entrants.toLocaleString('en-US')} entries · prize pool ${money(e.prizePool)}` : 'Coming soon'}
          {e.days[0] && ` · from ${fmtDate(e.days[0].start, state.tz)}`}
        </p>
        <ol className="mt-3 flex flex-wrap gap-2">
          {e.days.map((d) => (
            <DayChip key={d.id} dayId={d.id} label={d.label} />
          ))}
        </ol>
      </div>
    </article>
  );
}

function DayChip({ dayId, label }: { dayId: string; label: string }) {
  const e = events.find((x) => x.days.some((d) => d.id === dayId))!;
  const d = e.days.find((x) => x.id === dayId)!;
  const st = useDayStatus(d);
  const ready = st === 'vod';
  return (
    <li>
      {ready ? (
        <Link to={`/watch/${dayId}`} className="inline-flex h-9 items-center gap-2 rounded-chip border border-line-strong px-3 text-sm font-semibold hover:border-gold hover:text-gold-strong">
          <Icon name="play" size={13} /> {label}
          <span className="text-xs font-normal text-muted tnum">{Math.round(d.durationMin / 60)}h</span>
        </Link>
      ) : (
        <span className={cx('inline-flex h-9 items-center rounded-chip border border-line px-3 text-sm text-subtle')} title={st === 'upcoming' ? `Airs ${fmtDate(d.start, VENUE_TZ)}` : 'On air now — replay after the broadcast'}>
          {label}
        </span>
      )}
    </li>
  );
}

// ---- Classic player ------------------------------------------------------------------------------------

/** A classic final table, edited for TV: plays straight away (demo footage), with the story and the champion behind a reveal. */
export function TvClassic() {
  const { classicId = '' } = useParams();
  const c = archive.find((x) => x.id === classicId);
  if (!c) return <NotFound />;
  const more = [...archive].filter((x) => x.id !== c.id).sort((a, b) => b.year - a.year).slice(0, 3);
  return (
    <Page className="max-w-[96rem] space-y-8">
      <div className="overflow-hidden rounded-panel border border-line bg-black">
        <video className="aspect-video w-full" src={`${FOOTAGE.ft.url}#t=40`} poster={thumbFor(`archive:${c.id}`)} controls autoPlay playsInline />
      </div>
      <div>
        <p className="text-sm text-muted">
          Classic · {c.year} · {duration(c.durationSec)}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-[28px]">
          {c.year} {c.title}
        </h1>
        <p className="mt-1 text-sm text-muted">{c.subtitle}</p>
        <p className="mt-2 text-sm">
          <span className="text-subtle">Champion </span>
          <Spoiler k={`archive-${c.id}`} inline label="Champion hidden">
            <b>{playerById(c.winnerId).name}</b>
          </Spoiler>
        </p>
      </div>
      <section aria-label="More classics">
        <SectionHeader title="More classics" />
        <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 [&>*]:w-auto!">
          {more.map((x) => (
            <ArchiveCard key={x.id} item={x} />
          ))}
        </div>
      </section>
    </Page>
  );
}
