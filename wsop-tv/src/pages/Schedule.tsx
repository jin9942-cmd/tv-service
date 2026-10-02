import { Link, useSearchParams } from 'react-router-dom';
import { getSchedule, getScheduleDates, lookup } from '../data/api';
import { useAsync } from '../lib/useAsync';
import { addDaysKey, formatEventTime, formatKeyLabel, formatLocalTime, localTimeZoneName, relativeFromNow, todayKey } from '../lib/time';
import { EmptyState, Loading, StatusBadge } from '../components/ui';
import { fmtUSD } from '../lib/format';

const DAYS_BEFORE = 1;
const DAYS_AFTER = 5;

export function Schedule() {
  const [params, setParams] = useSearchParams();
  const today = todayKey();
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') ?? '');
  const date = valid ? params.get('date')! : today;
  const days = Array.from({ length: DAYS_BEFORE + DAYS_AFTER + 1 }, (_, i) => addDaysKey(today, i - DAYS_BEFORE));
  const { data: events, loading } = useAsync(() => getSchedule(date), [date]);
  const { data: dates } = useAsync(getScheduleDates, []);
  const nextWithEvents = dates?.find((d) => d > date);

  const select = (d: string) => setParams(d === today ? {} : { date: d });

  return (
    <div className="page">
      <header className="page-head">
        <h1>Schedule</h1>
        <p className="muted">
          Times in <strong>Las Vegas (PT)</strong> with your local time ({localTimeZoneName()}). Dates follow the venue’s calendar. Times are stream start times; streams air on a broadcast delay, so they show play from a little earlier.
        </p>
      </header>

      <div className="date-strip" role="tablist" aria-label="Choose a date">
        {days.map((d) => {
          const l = formatKeyLabel(d);
          const has = dates?.includes(d);
          return (
            <button key={d} role="tab" aria-selected={d === date} className={`date-btn ${d === date ? 'is-on' : ''}`} onClick={() => select(d)}>
              <span className="date-wd">{d === today ? 'Today' : l.weekday}</span>
              <span className="date-day">{l.day}</span>
              <span className="date-mo">{l.month}</span>
              <span className={`date-dot ${has ? 'has' : ''}`} aria-label={has ? 'Has events' : 'No events'} />
            </button>
          );
        })}
      </div>

      {loading || !events ? (
        <Loading />
      ) : events.length === 0 ? (
        <EmptyState
          title="No events scheduled for this day"
          actions={
            <>
              {nextWithEvents && (
                <button className="btn btn-primary" onClick={() => select(nextWithEvents)}>
                  Next day with events
                </button>
              )}
              <Link className="btn btn-secondary" to="/archive">
                Watch replays
              </Link>
            </>
          }
        >
          Rest day at the venue. Catch up on past finals in the archive.
        </EmptyState>
      ) : (
        <ul className="sched-list">
          {events.map((e) => {
            const main = e.defaultBroadcastId ? lookup.broadcast(e.defaultBroadcastId) : null;
            const startIso = main?.startAt ?? e.startAt;
            const status = main?.status === 'late-start' ? 'late-start' : e.status;
            const delay = main?.delayMinutes;
            return (
              <li key={e.id} className={`sched-row is-${e.status}`}>
                <div className="sched-time">
                  <span className="sched-pt">{formatEventTime(startIso)}</span>
                  <span className="muted sched-local">{formatLocalTime(startIso)} your time</span>
                </div>
                <div className="sched-main">
                  <div className="sched-badges">
                    <StatusBadge status={status} small delay={e.status === 'live' ? delay : undefined} />
                    <span className="muted">
                      #{e.number} · {e.dayLabel} · {fmtUSD(e.buyIn)}
                    </span>
                  </div>
                  <p className="sched-name">{e.name}</p>
                  <p className="muted sched-note">
                    {!e.hasBroadcast
                      ? 'Not broadcast'
                      : e.status === 'live'
                        ? `On air · ${e.broadcastIds.length} stream${e.broadcastIds.length > 1 ? 's' : ''}${delay ? ` · ${delay}-min broadcast delay` : ''}`
                        : e.status === 'upcoming'
                          ? `Stream starts ${relativeFromNow(startIso)}${delay ? ` · airs on a ${delay}-min delay` : ''}`
                          : 'Coverage ended'}
                  </p>
                </div>
                <div className="sched-cta">
                  {!e.hasBroadcast ? (
                    <span className="tag">No broadcast</span>
                  ) : (
                    <Link className={`btn btn-sm ${e.status === 'live' ? 'btn-primary' : 'btn-secondary'}`} to={`/watch/${e.id}`} state={{ select: true }}>
                      {e.status === 'live' ? 'Watch' : e.status === 'upcoming' ? 'Details' : 'View'}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
