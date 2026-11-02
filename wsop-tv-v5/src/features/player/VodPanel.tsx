// Replay-only pieces. A replay is "pick what to watch", so the hand list leads; and because the result IS the
// content, hands stay neutral (players · pot, no type, no outcome) until they have been watched or revealed.
// Every block still leads somewhere: hand → player → follow, results → next broadcast day / live / schedule.
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Day, Hand, TourEvent } from '../../data/types';
import { playerById, seriesById } from '../../data/mock';
import { chips, duration, money } from '../../lib/format';
import { VENUE_TZ, fmtDate, fmtDateTime } from '../../lib/time';
import { isOnAir } from '../../lib/broadcast';
import { useApp } from '../../state/app';
import { Avatar, Button, CountryCode, Icon, StatusBadge, Tabs, cx } from '../../components/ui';
import type { SeatStack } from '../../state/stacks';
import { ChipCounts } from './SidePanel';
import { HAND_META, HandGlyph } from './markers';

const lastName = (id: string) => playerById(id).name.split(' ').slice(-1)[0];

/** Neutral title: who and how big, never what happened. */
export const neutralTitle = (h: Hand) => `${lastName(h.playerIds[0])} vs ${lastName(h.playerIds[1])} · ${chips(h.pot)} pot`;

/** Revealed on purpose. (The player adds hands that actually played through — skipping past one never opens it.) */
export function useRevealed() {
  const { state } = useApp();
  return (h: Hand) => state.revealed.includes(`hand-${h.id}`);
}

/** The marker as the timeline should show it: neutral until open. */
export const maskHand = (h: Hand): Hand => ({ ...h, title: neutralTitle(h), masked: true });

export function useFollow() {
  const { state, set, toast, signedIn, requireLogin } = useApp();
  return {
    isFollowing: (id: string) => !!state.followed[id],
    toggle: (id: string) => {
      const p = playerById(id);
      if (!signedIn) return requireLogin({ reason: `Sign in to follow ${p.name}.` });
      const on = !!state.followed[id];
      set((s) => {
        const next = { ...s.followed };
        if (next[id]) delete next[id];
        else next[id] = { notify: true };
        return { followed: next };
      });
      toast(on ? `Unfollowed ${p.name}` : `Following ${p.name} · alerts when they're on air`);
    },
  };
}

/** Hand list with chapter numbers; shared by the replay panel and the mobile list under the player. */
export function HandList({ markers, position, onSeek, isOpen: open }: { markers: Hand[]; position: number; onSeek: (t: number) => void; isOpen: (h: Hand) => boolean }) {
  const { set } = useApp();
  const current = markers.reduce((acc, m, i) => (m.t <= position + 1 ? i : acc), -1);
  return (
    <ol className="divide-y divide-line">
      {markers.map((h, i) => {
        const isOpen = open(h);
        const on = i === current && position < h.t + h.durationSec;
        return (
          <li key={h.id} className={cx('py-2.5', on && 'bg-gold-dim -mx-3 px-3')}>
            <button onClick={() => onSeek(h.t)} className="group flex w-full items-start gap-2.5 text-left">
              <span className="w-5 pt-0.5 text-right text-xs font-bold text-subtle tnum">{i + 1}</span>
              {isOpen ? <HandGlyph type={h.type} size={16} className="mt-0.5" /> : <span className="mt-1.5 size-2.5 shrink-0 rounded-full border border-line-strong" aria-hidden />}
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] leading-snug font-semibold group-hover:text-gold-strong">{isOpen ? h.title : neutralTitle(h)}</span>
                <span className="block text-[11px] text-muted tnum">
                  {duration(h.t)}
                  {isOpen ? ` · ${HAND_META[h.type].label}` : ''}
                  {on && <span className="ml-1.5 font-semibold text-gold">Playing</span>}
                </span>
              </span>
              {isOpen ? <Icon name="check" size={14} className="mt-0.5 text-ok" aria-label="Watched" /> : null}
            </button>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 pl-[3.25rem] text-[11px]">
              {h.playerIds.map((id) => (
                <Link key={id} to={`/players/${id}`} className="text-muted underline-offset-2 hover:text-text hover:underline">
                  {playerById(id).name}
                </Link>
              ))}
              {!isOpen && (
                <button onClick={() => set((s) => ({ revealed: [...s.revealed, `hand-${h.id}`] }))} className="inline-flex items-center gap-1 text-subtle hover:text-text">
                  <Icon name="eye" size={11} /> Reveal
                </button>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

type VodTab = 'hands' | 'chips' | 'players';

export function VodPanel({
  markers,
  position,
  onSeek,
  handsOnly,
  onHandsOnly,
  stacks,
  bb,
  spoilerKey,
  isOpen,
}: {
  isOpen: (h: Hand) => boolean;
  markers: Hand[];
  position: number;
  onSeek: (t: number) => void;
  handsOnly: boolean;
  onHandsOnly: (v: boolean) => void;
  stacks: SeatStack[];
  bb: number;
  spoilerKey: string;
}) {
  const [tab, setTab] = useState<VodTab>('hands');
  const follow = useFollow();
  return (
    <section aria-label="Replay panel" className="flex h-full flex-col rounded-panel border border-line bg-surface">
      <div className="px-3 pt-1">
        <Tabs<VodTab>
          label="Replay panel"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'hands', label: `Hands · ${markers.length}` },
            { value: 'chips', label: 'Chip Counts' },
            { value: 'players', label: 'Players' },
          ]}
        />
      </div>
      <div className="flex-1 overflow-y-auto p-3" role="tabpanel">
        {tab === 'hands' &&
          (markers.length ? (
            <>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-xs text-muted">Results stay hidden until you watch the hand.</p>
                <button
                  onClick={() => onHandsOnly(!handsOnly)}
                  aria-pressed={handsOnly}
                  className={cx('label shrink-0 rounded-[4px] border px-2 py-1 text-[10px]', handsOnly ? 'border-gold bg-gold text-ink' : 'border-line-strong text-text hover:border-gold')}
                >
                  {handsOnly ? 'Hands only · on' : 'Play hands only'}
                </button>
              </div>
              <HandList markers={markers} position={position} onSeek={onSeek} isOpen={isOpen} />
            </>
          ) : (
            <p className="py-6 text-center text-sm text-muted">No key hands marked for this broadcast yet.</p>
          ))}
        {tab === 'chips' && <ChipCounts stacks={stacks} spoilerKey={spoilerKey} bb={bb} live={false} />}
        {tab === 'players' && (
          <div>
            <p className="mb-2 text-xs text-muted">Follow a player to get their hands on Home and an alert when they’re on air.</p>
            <ul className="space-y-1.5">
              {stacks.map((s) => {
                const p = playerById(s.playerId);
                const on = follow.isFollowing(p.id);
                return (
                  <li key={p.id} className="flex items-center gap-2.5 rounded-chip bg-surface-2 px-2.5 py-2">
                    <Avatar name={p.name} hue={p.hue} size={26} />
                    <Link to={`/players/${p.id}`} className="min-w-0 flex-1 hover:text-gold-strong">
                      <span className="block truncate text-[13px] font-semibold">{p.name}</span>
                      <CountryCode cc={p.cc} />
                    </Link>
                    <button
                      onClick={() => follow.toggle(p.id)}
                      aria-pressed={on}
                      className={cx('label rounded-[4px] border px-2 py-1 text-[10px]', on ? 'border-gold text-gold-strong' : 'border-line-strong text-text hover:border-gold')}
                    >
                      {on ? 'Following' : 'Follow'}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/** Replays: the day's facts, the results behind a reveal, and where to go next. */
export function DayResults({
  event,
  day,
  stacks,
  watchedToEnd,
  nextDay,
}: {
  event: TourEvent;
  day: Day;
  stacks: SeatStack[];
  watchedToEnd: boolean;
  nextDay?: Day;
}) {
  const { state, set, toast, signedIn, requireLogin } = useApp();
  const se = seriesById(event.seriesId);
  const key = `results-${day.id}`;
  const shown = watchedToEnd || state.revealed.includes(key);
  const finalTable = day.label === 'Final Table';
  const standings = [...stacks].sort((a, b) => b.stack - a.stack);
  // Final table: finishing order (champion first) with sample payouts · other days: end-of-day chip leaders.
  const order = finalTable && event.winnerId ? [event.winnerId, ...standings.map((s) => s.playerId).filter((id) => id !== event.winnerId)] : standings.map((s) => s.playerId);
  const payout = (i: number) => Math.round((event.firstPrize * [1, 0.62, 0.45, 0.34, 0.26, 0.2, 0.16][i]) / 1000) * 1000;

  const nextStatus = nextDay ? (nextDay.id === 'lv-main-finaltable' ? state.streamMode : nextDay.status) : undefined;
  const reminded = nextDay ? state.reminders.includes(nextDay.id) : false;

  const facts: [string, ReactNode][] = [
    ['Game', event.game],
    ['Buy-in', event.buyIn ? money(event.buyIn) : 'Invitational'],
    ['Entries', event.entrants.toLocaleString('en-US')],
    ['Prize pool', money(event.prizePool)],
    ['Aired', `${fmtDateTime(day.start, VENUE_TZ)} PT`],
    ['Length', duration(day.durationMin * 60)],
    ['Venue', `${se.venue}, ${se.city}`],
    ['Field', `${stacks.length} players at the ${finalTable ? 'final table' : 'feature table'}`],
  ];

  return (
    <section className="mt-5 space-y-4" aria-label="Broadcast results">
      <div>
        <h2 className="mb-2 text-base font-bold">About this broadcast</h2>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {facts.map(([k, v]) => (
            <div key={k} className="rounded-card border border-line bg-surface px-3 py-2.5">
              <dt className="label text-[10px] text-subtle">{k}</dt>
              <dd className="mt-1 text-sm font-bold tnum">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-panel border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold">{finalTable ? 'Final standings' : 'End of day chip leaders'}</h2>
          {!shown && (
            <button onClick={() => set((s) => ({ revealed: [...s.revealed, key] }))} className="label inline-flex items-center gap-1.5 rounded-full border border-line-strong px-2.5 py-1 text-[10px] hover:border-gold">
              <Icon name="eye" size={12} /> Reveal results
            </button>
          )}
        </div>
        {shown ? (
          <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {order.slice(0, finalTable ? 6 : 4).map((id, i) => {
              const p = playerById(id);
              const s = stacks.find((x) => x.playerId === id);
              return (
                <li key={id} className="flex items-center gap-2.5 rounded-chip bg-surface-2 px-2.5 py-2">
                  <span className="w-4 text-xs font-bold text-subtle tnum">{i + 1}</span>
                  <Avatar name={p.name} hue={p.hue} size={24} />
                  <Link to={`/players/${id}`} className="min-w-0 flex-1 truncate text-[13px] font-semibold hover:text-gold-strong">
                    {p.name}
                  </Link>
                  <span className="text-xs font-bold tnum">{finalTable ? money(payout(i)) : chips(s?.stack ?? 0)}</span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-muted">Hidden so the replay isn’t spoiled. It opens when you reach the end, or reveal it now.</p>
        )}
        {shown && finalTable && <p className="mt-2 text-[11px] text-subtle">Payouts are sample figures.</p>}
      </div>

      {/* keep the loop going: next day of this event, then the rest of the event */}
      <div className="grid gap-2 sm:grid-cols-2">
        {nextDay && nextStatus ? (
          <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-3">
            <div className="min-w-0 flex-1">
              <p className="label text-[10px] text-subtle">Next in this event</p>
              <p className="mt-0.5 flex items-center gap-2 text-[15px] font-bold">
                {nextDay.label} {nextStatus !== 'vod' && <StatusBadge status={nextStatus} size="sm" />}
              </p>
              <p className="text-xs text-muted">{nextStatus === 'upcoming' ? `Starts ${fmtDateTime(nextDay.start, state.tz)}` : fmtDate(nextDay.start, VENUE_TZ)}</p>
            </div>
            {nextStatus === 'upcoming' ? (
              <Button
                size="sm"
                variant={reminded ? 'secondary' : 'primary'}
                onClick={() => {
                  if (!signedIn) return requireLogin({ reason: 'Sign in to get a reminder before the broadcast starts.' });
                  set((s) => ({ reminders: reminded ? s.reminders.filter((r) => r !== nextDay.id) : [...s.reminders, nextDay.id] }));
                  toast(reminded ? 'Reminder removed' : 'We’ll remind you 15 minutes before');
                }}
              >
                <Icon name="bell" size={14} /> {reminded ? 'Reminder set' : 'Remind me'}
              </Button>
            ) : (
              <Link to={`/watch/${nextDay.id}`}>
                <Button size="sm" variant="primary" tabIndex={-1}>
                  <Icon name="play" size={14} /> {isOnAir(nextStatus) ? 'Watch live' : 'Play'}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <Link to="/schedule" className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface p-3 hover:border-line-strong">
            <span>
              <span className="label block text-[10px] text-subtle">Event complete</span>
              <span className="block text-[15px] font-bold">See what’s on next</span>
            </span>
            <Icon name="next" size={16} className="text-muted" />
          </Link>
        )}
        <Link to={`/events/${event.id}`} className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface p-3 hover:border-line-strong">
          <span>
            <span className="label block text-[10px] text-subtle">Event #{event.number}</span>
            <span className="block text-[15px] font-bold">All days, hands & clips</span>
          </span>
          <Icon name="next" size={16} className="text-muted" />
        </Link>
      </div>
    </section>
  );
}
