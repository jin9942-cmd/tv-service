import { Link, useSearchParams } from 'react-router-dom';
import { getArchive, getEvents, getSeasons, lookup } from '../data/api';
import { useAsync } from '../lib/useAsync';
import { AccessTag, EmptyState, Loading, Thumb } from '../components/ui';
import { ContinueWatching } from '../components/ContinueWatching';
import { useAuth } from '../state/gate';
import { progressStore, useStore } from '../state/stores';

export function Archive() {
  const [params, setParams] = useSearchParams();
  const { tier } = useAuth();
  const progress = useStore(progressStore);
  const seasonId = params.get('season') ?? '';
  const eventId = params.get('event') ?? '';
  const { data: seasons } = useAsync(getSeasons, []);
  const { data: events } = useAsync(() => getEvents({ seasonId: seasonId || undefined }), [seasonId]);
  const { data: videos, loading } = useAsync(() => getArchive({ seasonId: seasonId || undefined, eventId: eventId || undefined }), [seasonId, eventId]);

  const pastSeasons = (seasons ?? []).filter((s) => !s.isCurrent);
  const archivedEventIds = new Set((videos ?? []).map((v) => v.eventId));
  const eventOptions = (events ?? []).filter((e) => e.status === 'ended' && lookup.season(e.seasonId)?.isCurrent === false);

  const set = (k: 'season' | 'event', v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k === 'season') next.delete('event');
    setParams(next, { replace: true });
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>Archive</h1>
        <p className="muted">Past seasons’ final tables, feature days and highlights.</p>
      </header>

      <ContinueWatching />

      <div className="filters">
        <label className="field">
          <span>Season</span>
          <select value={seasonId} onChange={(e) => set('season', e.target.value)}>
            <option value="">All seasons</option>
            {pastSeasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Event</span>
          <select value={eventId} onChange={(e) => set('event', e.target.value)}>
            <option value="">All events</option>
            {eventOptions.map((e) => (
              <option key={e.id} value={e.id}>
                {lookup.season(e.seasonId)?.year} · {e.shortName}
              </option>
            ))}
          </select>
        </label>
        {(seasonId || eventId) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setParams({}, { replace: true })}>
            Clear filters
          </button>
        )}
      </div>

      {loading || !videos ? (
        <Loading />
      ) : videos.length === 0 ? (
        <EmptyState title="No videos match these filters" actions={<button className="btn btn-secondary" onClick={() => setParams({})}>Show all</button>} />
      ) : (
        <div className="grid">
          {videos.map((v) => {
            const ev = lookup.event(v.eventId);
            const season = lookup.season(v.seasonId);
            const p = progress[`bc:${v.broadcastId}`];
            return (
              <Link key={v.id} to={`/watch/${v.eventId}/${v.broadcastId}`} state={{ select: true }} className="card">
                <Thumb seed={v.id} sub={`${season?.year} · ${v.kind}`}>
                  <span className="thumb-duration">{v.durationLabel}</span>
                  {p && <span className="thumb-progress" style={{ width: `${(p.position / p.duration) * 100}%` }} />}
                </Thumb>
                <div className="card-body">
                  <div className="card-tags">
                    <span className="tag">Replay</span>
                    <AccessTag level={v.access} tier={tier} />
                  </div>
                  <p className="card-title">{v.title}</p>
                  <p className="card-meta">
                    {season?.name} · Event #{ev?.number}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {archivedEventIds.size > 0 && <p className="muted small">Running time shown is the sample film’s length.</p>}
    </div>
  );
}
