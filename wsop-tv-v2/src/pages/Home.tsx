import { Link } from 'react-router-dom';
import { archive, dayById, events, hands, players, series } from '../data/mock';
import { count } from '../lib/format';
import { dayKey, fmtTime } from '../lib/time';
import { useApp } from '../state/app';
import { ArchiveCard, Art, BroadcastCard, HandCard, useDayStatus } from '../components/cards';
import { Billboard, UpcomingCard } from '../components/Billboard';
import { Avatar, BraceletIcon, CountryCode, EmptyState, Page, SectionHeader, StatusBadge } from '../components/ui';

export function Home() {
  const { state, signedIn } = useApp();
  const followed = Object.keys(state.followed);
  const followedHands = hands.filter((h) => h.playerIds.some((p) => followed.includes(p))).slice(0, 10);
  const trending = [...hands].sort((a, b) => b.views - a.views).slice(0, 10);
  const freeHands = [...hands].filter((h) => h.access === 'free').sort((a, b) => b.views - a.views);
  const upcoming = events
    .flatMap((e) => e.days.map((d) => ({ e, d })))
    .filter((x) => x.d.status === 'upcoming')
    .sort((a, b) => a.d.start.localeCompare(b.d.start))
    // one card per event: its next broadcast day
    .filter((x, i, arr) => arr.findIndex((y) => y.e.id === x.e.id) === i)
    .slice(0, 8);
  const continueItems = Object.entries(state.progress)
    .map(([id, sec]) => ({ ref: dayById(id)!, sec }))
    .filter((x) => x.ref);

  return (
    <>
      <Billboard />
      <Page className="space-y-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-10">
            {signedIn && continueItems.length > 0 && (
              <Row title="Continue Watching">
                {continueItems.map(({ ref, sec }) => (
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
              {upcoming.map(({ e, d }) => (
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
              {freeHands.map((h) => (
                <HandCard key={h.id} hand={h} className="w-72" />
              ))}
            </Row>
            <section>
              <SectionHeader title="Followed Players' Latest Hands" action={<Link to="/players" className="text-sm font-semibold text-muted hover:text-text">Follow players →</Link>} />
              {followedHands.length ? (
                <div className="hscroll">
                  {followedHands.map((h) => (
                    <HandCard key={h.id} hand={h} className="w-72" />
                  ))}
                </div>
              ) : (
                <EmptyState title="You're not following anyone yet" body="Follow players to see their latest hands here." action={<Link to="/players" className="font-semibold text-gold">Browse players</Link>} />
              )}
            </section>
            <Row title="Featured Series" action={<Link to="/series" className="text-sm font-semibold text-muted hover:text-text">All series →</Link>}>
              {series.map((s) => {
                const evs = events.filter((e) => e.seriesId === s.id);
                return (
                  <Link key={s.id} to="/series" className="group block w-80">
                    <Art hue={s.id === 'lv26' ? 215 : 250} label={s.id === 'lv26' ? 'LV' : 'EU'}>
                      <span className="absolute top-2 left-2 flex items-center gap-1 rounded-[4px] bg-black/70 px-1.5 py-1">
                        <BraceletIcon size={13} /> <span className="label text-[10px]">{evs.length} bracelet events</span>
                      </span>
                    </Art>
                    <p className="mt-2 text-[15px] font-semibold group-hover:text-gold-strong">{s.name}</p>
                    <p className="text-xs text-muted">
                      {s.city} · {s.venue}
                    </p>
                  </Link>
                );
              })}
            </Row>
            <Row title="Trending Hands" action={<Link to="/hands" className="text-sm font-semibold text-muted hover:text-text">All hands →</Link>}>
              {trending.map((h) => (
                <HandCard key={h.id} hand={h} className="w-72" />
              ))}
            </Row>
            <Row title="Archive Classics" action={<Link to="/archive" className="text-sm font-semibold text-muted hover:text-text">Archive →</Link>}>
              {archive.map((a) => (
                <ArchiveCard key={a.id} item={a} />
              ))}
            </Row>
          </div>

          <aside className="space-y-6">
            <RankingWidget />
            <TodayWidget />
          </aside>
        </div>
      </Page>
    </>
  );
}

function Row({ title, kicker, action, children }: { title: string; kicker?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <SectionHeader title={title} kicker={kicker} action={action} />
      <div className="hscroll">{children}</div>
    </section>
  );
}

function RankingWidget() {
  const top = [...players].sort((a, b) => b.poyPoints - a.poyPoints).slice(0, 5);
  return (
    <section className="rounded-panel border border-line bg-surface p-4">
      <SectionHeader kicker="2026 season" title="Player of the Year" />
      <ol className="space-y-2">
        {top.map((p, i) => (
          <li key={p.id}>
            <Link to={`/players/${p.id}`} className="flex items-center gap-3 rounded-chip p-1.5 hover:bg-surface-2">
              <span className="w-5 text-center text-sm font-black text-subtle tnum">{i + 1}</span>
              <Avatar name={p.name} hue={p.hue} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{p.name}</span>
                <CountryCode cc={p.cc} />
              </span>
              <span className="text-sm font-bold tnum">{count(p.poyPoints)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function TodayWidget() {
  const { state } = useApp();
  const today = dayKey(Date.now(), state.tz);
  const list = events
    .flatMap((e) => e.days.map((d) => ({ e, d })))
    .filter((x) => dayKey(x.d.start, state.tz) === today || x.d.status === 'live' || x.d.status === 'delayed')
    .sort((a, b) => a.d.start.localeCompare(b.d.start));
  return (
    <section className="rounded-panel border border-line bg-surface p-4">
      <SectionHeader kicker="Today" title="Schedule" action={<Link to="/schedule" className="text-xs font-semibold text-muted hover:text-text">Full →</Link>} />
      {list.length ? (
        <ul className="space-y-1">
          {list.map(({ e, d }) => (
            <li key={d.id}>
              <Link to={`/watch/${d.id}`} className="flex items-start gap-3 rounded-chip p-2 hover:bg-surface-2">
                <span className="w-16 pt-0.5 text-xs font-semibold text-muted tnum">{fmtTime(d.start, state.tz)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{e.name}</span>
                  <span className="text-xs text-muted">{d.label}</span>
                </span>
                <TodayBadge dayId={d.id} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No broadcasts today.</p>
      )}
    </section>
  );
}

function TodayBadge({ dayId }: { dayId: string }) {
  const ref = dayById(dayId)!;
  const status = useDayStatus(ref.day);
  return <StatusBadge status={status} size="sm" />;
}
