import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getTickerEvents, lookup } from '../data/api';
import { useAsync } from '../lib/useAsync';
import { formatEventDate, formatEventTime } from '../lib/time';
import type { TournamentEvent } from '../data/types';
import { StatusBadge } from './ui';

const delayOf = (e: TournamentEvent) => (e.defaultBroadcastId ? lookup.broadcast(e.defaultBroadcastId)?.delayMinutes : undefined);

/** Tournament Ticker: the "remote control" for choosing an event. */
export function Ticker({ currentEventId }: { currentEventId?: string }) {
  const { data: events } = useAsync(getTickerEvents, []);
  const listRef = useRef<HTMLDivElement>(null);

  const current = currentEventId ? lookup.event(currentEventId) : null;
  const isPast = current && !events?.some((e) => e.id === current.id);
  const items: TournamentEvent[] = [...(isPast && current ? [current] : []), ...(events ?? [])];

  useEffect(() => {
    // Scroll only the ticker row horizontally (never the page).
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>('[aria-current="true"]');
    if (list && !el) list.scrollLeft = 0;
    if (list && el) {
      const left = el.offsetLeft; // .ticker-list is position:relative
      if (left < list.scrollLeft || left + el.offsetWidth > list.scrollLeft + list.clientWidth) {
        list.scrollTo({ left: left < 48 ? 0 : left - 16, behavior: 'smooth' });
      }
    }
  }, [currentEventId, events]);

  return (
    <nav className="ticker" aria-label="Tournament ticker">
      <div className="ticker-label">
        <span>Tournaments</span>
        <Link to="/schedule" className="ticker-schedule">
          Schedule →
        </Link>
      </div>
      <div className="ticker-list" ref={listRef}>
        {!events && <div className="ticker-card is-skeleton" aria-hidden="true" />}
        {items.map((e) => {
          const season = lookup.season(e.seasonId);
          const replay = isPast && e.id === current?.id;
          const selected = e.id === currentEventId;
          return (
            <Link
              key={e.id}
              to={`/watch/${e.id}`}
              state={{ select: true }}
              className={`ticker-card ${selected ? 'is-selected' : ''} is-${replay ? 'replay' : e.status}`}
              aria-current={selected ? 'true' : undefined}
            >
              <span className="ticker-top">
                <StatusBadge status={replay ? 'replay' : e.status} small />
                <span className="ticker-num">
                  {replay ? season?.year : `#${e.number}`} · {e.dayLabel}
                </span>
              </span>
              <span className="ticker-name">{e.shortName}</span>
              <span className="ticker-meta">
                {e.status === 'upcoming'
                  ? `${formatEventDate(e.startAt)} · ${formatEventTime(e.startAt)}`
                  : e.status === 'live'
                    ? `${e.broadcastIds.length} stream${e.broadcastIds.length > 1 ? 's' : ''}${delayOf(e) ? ` · ${delayOf(e)}m delay` : ''}`
                    : replay
                      ? 'Viewing replay'
                      : 'Coverage ended'}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
