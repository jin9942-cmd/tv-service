import { Link } from 'react-router-dom';
import { archive, dayById, events, hands, players } from '../data/mock';
import { useApp } from '../state/app';
import { ArchiveCard, BroadcastCard, HandCard, PlayerTile } from '../components/cards';
import { Billboard, UpcomingCard } from '../components/Billboard';
import { Page, SectionHeader, cx } from '../components/ui';

export function Home() {
  const { state, signedIn } = useApp();
  const followed = Object.keys(state.followed);
  const followedHands = hands.filter((h) => h.playerIds.some((p) => followed.includes(p))).slice(0, 10);
  const freeHands = [...hands].filter((h) => h.access === 'free').sort((a, b) => b.views - a.views);
  const upcoming = events
    .flatMap((e) => e.days.map((d) => ({ e, d })))
    .filter((x) => x.d.status === 'upcoming')
    .sort((a, b) => a.d.start.localeCompare(b.d.start))
    // one card per event: its next broadcast day
    .filter((x, i, arr) => arr.findIndex((y) => y.e.id === x.e.id) === i)
    .slice(0, 8);
  const featuredPlayers = [...players].sort((a, b) => b.poyPoints - a.poyPoints).slice(0, 10);
  const continueItems = Object.entries(state.progress)
    .map(([id, sec]) => ({ ref: dayById(id)!, sec }))
    .filter((x) => x.ref);

  return (
    <>
      <Billboard />
      <Page className="space-y-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10">
          <div className="min-w-0 space-y-10">
            {signedIn && continueItems.length > 0 && (
              <Row title="Continue Watching">
                {continueItems.slice(0, 4).map(({ ref, sec }) => (
                  <BroadcastCard key={ref.day.id} event={ref.event} day={ref.day} progress={sec / (ref.day.durationMin * 60)} />
                ))}
              </Row>
            )}
            <Row
              title="Coming up"
              action={
                <Link to="/schedule" className="text-sm font-semibold text-muted hover:text-text">
                  Full schedule →
                </Link>
              }
            >
              {upcoming.slice(0, 4).map(({ e, d }) => (
                <UpcomingCard key={d.id} e={e} d={d} />
              ))}
            </Row>
            <Row
              title="Free highlights"
              kicker="No account needed"
              action={
                <Link to="/hands" className="text-sm font-semibold text-muted hover:text-text">
                  All hands →
                </Link>
              }
            >
              {freeHands.slice(0, 4).map((h) => (
                <HandCard key={h.id} hand={h} />
              ))}
            </Row>
            {signedIn && followedHands.length > 0 && (
              <Row title="From players you follow" action={<Link to="/players" className="text-sm font-semibold text-muted hover:text-text">Players →</Link>}>
                {followedHands.slice(0, 4).map((h) => (
                  <HandCard key={h.id} hand={h} />
                ))}
              </Row>
            )}
            <Row cols={5} title="Featured players" action={<Link to="/players" className="text-sm font-semibold text-muted hover:text-text">All players →</Link>}>
              {featuredPlayers.map((p) => (
                <PlayerTile key={p.id} player={p} />
              ))}
            </Row>
            <Row cols={3} title="Relive the finals" action={<Link to="/archive" className="text-sm font-semibold text-muted hover:text-text">Archive →</Link>}>
              {archive.map((a) => (
                <ArchiveCard key={a.id} item={a} />
              ))}
            </Row>
          </div>

        </div>
      </Page>
    </>
  );
}

/**
 * A home section as a grid that always shows whole cards (no half-cut thumbnail at the edge).
 * `cols` = how many cards per row on large screens; fewer on smaller screens.
 */
function Row({ title, kicker, action, children, cols = 4 }: { title: string; kicker?: string; action?: React.ReactNode; children: React.ReactNode; cols?: 3 | 4 | 5 }) {
  return (
    <section>
      <SectionHeader title={title} kicker={kicker} action={action} />
      <div
        className={cx(
          'grid gap-x-4 gap-y-6 [&>*]:w-auto! [&>*]:min-w-0',
          cols === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
          cols === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
          cols === 5 && 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5',
        )}
      >
        {children}
      </div>
    </section>
  );
}
