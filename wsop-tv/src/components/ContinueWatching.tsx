import { Link } from 'react-router-dom';
import { progressStore, useStore, clearProgress } from '../state/stores';
import { formatClock } from '../lib/time';
import { Thumb } from './ui';

/** "Continue watching" row, read from localStorage. */
export function ContinueWatching() {
  const progress = useStore(progressStore);
  const items = Object.values(progress)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 6);
  if (!items.length) return null;
  return (
    <section className="block">
      <h2 className="section-title">Continue watching</h2>
      <div className="row-scroll">
        {items.map((p) => (
          <div key={p.key} className="card cw-card">
            <Link to={p.url} className="cw-link">
              <Thumb seed={p.key} sub={p.subtitle}>
                <span className="thumb-duration">
                  {formatClock(p.position)} / {formatClock(p.duration)}
                </span>
                <span className="thumb-progress" style={{ width: `${(p.position / p.duration) * 100}%` }} />
              </Thumb>
              <div className="card-body">
                <p className="card-title">{p.title}</p>
              </div>
            </Link>
            <button className="cw-remove" onClick={() => clearProgress(p.key)} aria-label={`Remove ${p.title} from continue watching`}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
