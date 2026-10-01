import { useSearchParams } from 'react-router-dom';
import { getHands, lookup } from '../data/api';
import { useAsync } from '../lib/useAsync';
import { HandCard } from '../components/HandCard';
import { EmptyState, Loading } from '../components/ui';

export function HandsList() {
  const [params, setParams] = useSearchParams();
  const eventId = params.get('event') ?? '';
  const { data: all, loading } = useAsync(() => getHands({ clipsOnly: true }), []);

  if (loading || !all) return <Loading />;
  const eventIds = [...new Set(all.map((h) => h.eventId))];
  const list = eventId ? all.filter((h) => h.eventId === eventId) : all;

  return (
    <div className="page">
      <header className="page-head">
        <h1>Hand replays</h1>
        <p className="muted">Key hands cut from tournament coverage. Free highlights play without an account.</p>
      </header>
      <div className="chips" role="group" aria-label="Filter by event">
        <button className={`chip ${!eventId ? 'is-on' : ''}`} aria-pressed={!eventId} onClick={() => setParams({}, { replace: true })}>
          All
        </button>
        {eventIds.map((id) => {
          const ev = lookup.event(id);
          const season = ev && lookup.season(ev.seasonId);
          return (
            <button key={id} className={`chip ${eventId === id ? 'is-on' : ''}`} aria-pressed={eventId === id} onClick={() => setParams({ event: id }, { replace: true })}>
              {season?.year} {ev?.shortName}
            </button>
          );
        })}
      </div>
      {list.length ? (
        <div className="grid">
          {list.map((h) => (
            <HandCard key={h.id} hand={h} />
          ))}
        </div>
      ) : (
        <EmptyState title="No hand replays for this event">Try another event.</EmptyState>
      )}
    </div>
  );
}
