import { events } from '../data/mock';
import { BroadcastCard, useDayStatus } from '../components/cards';
import { EmptyState, Page, SectionHeader, cx } from '../components/ui';
import type { Day, TourEvent } from '../data/types';
import { isOnAir, shortTableName, tableDelay, tableStatus } from '../lib/broadcast';

export function Live() {
  const all = events.flatMap((e) => e.days.map((d) => ({ e, d })));
  const upcoming = all.filter((x) => x.d.status === 'upcoming').sort((a, b) => a.d.start.localeCompare(b.d.start)).slice(0, 6);
  return (
    <Page className="space-y-10">
      <header>
        <p className="label text-gold">On air</p>
        <h1 className="mt-1 text-title font-black">Live</h1>
        <p className="mt-1 text-sm text-muted">Every table that's broadcasting right now. Delays are set per table — feature tables at final tables run 30 minutes behind, outer tables 15.</p>
      </header>
      <OnAir all={all} />
      <section>
        <SectionHeader title="Coming up" />
        <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map(({ e, d }) => (
            <BroadcastCard key={d.id} event={e} day={d} wide />
          ))}
        </div>
      </section>
    </Page>
  );
}

function OnAir({ all }: { all: { e: TourEvent; d: Day }[] }) {
  // Status can be overridden from Demo Controls, so filter inside a component that reads it.
  const live = all.filter((x) => x.d.status === 'live' || x.d.status === 'delayed');
  return (
    <section>
      <SectionHeader title="Now streaming" />
      {live.length ? (
        <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {live.map(({ e, d }) => (
            <LiveItem key={d.id} e={e} d={d} />
          ))}
        </div>
      ) : (
        <EmptyState title="Nothing is live right now" body="Check the schedule for the next broadcast." />
      )}
    </section>
  );
}

function LiveItem({ e, d }: { e: TourEvent; d: Day }) {
  const status = useDayStatus(d);
  return (
    <div className={status === 'vod' ? 'opacity-70' : ''}>
      <BroadcastCard event={e} day={d} wide />
      {/* per-table state: delay, late start, interrupted */}
      {isOnAir(status) && d.tables.length > 1 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Tables">
          {d.tables.map((t) => {
            const st = tableStatus(t, status);
            return (
              <li
                key={t.id}
                className={cx(
                  'rounded-[4px] border px-1.5 py-0.5 text-[11px] font-semibold tnum',
                  st === 'late' ? 'border-delayed/60 text-delayed' : st === 'interrupted' ? 'border-live/60 text-live' : 'border-line text-muted',
                )}
              >
                {shortTableName(t.name)} · {st === 'late' ? 'Late start' : st === 'interrupted' ? 'Interrupted' : st === 'delayed' ? `${tableDelay(t, status)}m delay` : 'Live'}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
