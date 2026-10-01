import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';

export function NotFound({ what = 'page' }: { what?: string }) {
  return (
    <div className="page page-narrow">
      <EmptyState
        title={`This ${what} doesn’t exist`}
        actions={
          <>
            <Link className="btn btn-primary" to="/watch">
              Watch live
            </Link>
            <Link className="btn btn-secondary" to="/schedule">
              Schedule
            </Link>
            <Link className="btn btn-secondary" to="/archive">
              Archive
            </Link>
          </>
        }
      >
        The link may be outdated or the content was removed from this demo dataset. Pick something else to watch.
      </EmptyState>
    </div>
  );
}
