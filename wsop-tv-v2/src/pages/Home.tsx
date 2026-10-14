import { Link } from 'react-router-dom';
import { HERO_DAY_ID, HERO_EXPECTED_START, archive, dayById, events, hands, playerById, players, series } from '../data/mock';
import { isBroadcasting } from '../lib/broadcast';
import { count, money } from '../lib/format';
import { countdown, dayKey, fmtDateTime, fmtTime } from '../lib/time';
import { useApp, useTick } from '../state/app';
import { ArchiveCard, Art, BroadcastCard, HandCard, useDayStatus } from '../components/cards';
import { Avatar, BraceletIcon, Button, CountryCode, EmptyState, Icon, Page, SectionHeader, Spoiler, StatusBadge } from '../components/ui';

export function Home() {
  const { state, signedIn } = useApp();
  const followed = Object.keys(state.followed);
  const followedHands = hands.filter((h) => h.playerIds.some((p) => followed.includes(p))).slice(0, 10);
  const trending = [...hands].sort((a, b) => b.views - a.views).slice(0, 10);
  const freeHands = [...hands].filter((h) => h.access === 'free').sort((a, b) => b.views - a.views);
  const continueItems = Object.entries(state.progress)
    .map(([id, sec]) => ({ ref: dayById(id)!, sec }))
    .filter((x) => x.ref);

  return (
    <>
      <Hero />
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

function Hero() {
  const { state } = useApp();
  const now = useTick(1000);
  const hero = dayById(HERO_DAY_ID)!;
  const status = useDayStatus(hero.day);
  // Hero stays on the featured broadcast while it's scheduled now — including a late start or an interruption.
  const live = isBroadcasting(status);
  const next = events.flatMap((e) => e.days.map((d) => ({ e, d }))).filter((x) => x.d.status === 'upcoming').sort((a, b) => a.d.start.localeCompare(b.d.start))[0];
  const ev = live ? hero.event : next.e;
  const day = live ? hero.day : next.d;

  return (
    <section className="relative overflow-hidden border-b border-line" aria-label="Featured">
      <div className="stage absolute inset-0 opacity-90" style={{ ['--stage-a' as string]: 'hsl(220 18% 14%)', ['--stage-b' as string]: 'hsl(220 22% 5%)' }} aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/85 to-transparent" aria-hidden />
      <div className="relative mx-auto grid max-w-content gap-8 px-gutter py-10 sm:px-6 md:py-14 lg:grid-cols-[1.25fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-2">
            {live ? <StatusBadge status={status} /> : <StatusBadge status="upcoming" />}
            <span className="label flex items-center gap-1.5 text-gold">
              <BraceletIcon size={14} /> Bracelet event #{ev.number}
            </span>
          </div>
          <h1 className="mt-4 text-[2.25rem] leading-[1.02] font-black tracking-[-0.02em] sm:text-display">
            {ev.name}
            <span className="block text-muted">{day.label}</span>
          </h1>
          {live ? (
            <dl className="mt-6 grid max-w-xl grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <Stat k="Players left" v={count(ev.remaining)} />
              <Stat k="Level" v={String(ev.level)} />
              <Stat k="First prize" v={money(ev.firstPrize)} />
              <div>
                <dt className="label text-subtle">Chip leader</dt>
                <dd className="mt-1 text-lg font-bold">
                  <Spoiler k={`leader-${ev.id}`} inline label="Chip leader hidden">
                    <span>{playerById(ev.leaderId!).name}</span>
                  </Spoiler>
                </dd>
              </div>
            </dl>
          ) : (
            <div className="mt-6">
              <p className="label text-subtle">Starts in</p>
              <p className="mt-1 text-5xl font-black tnum">{countdown(Date.parse(day.start) - now)}</p>
              <p className="mt-2 text-sm text-muted">
                {fmtDateTime(day.start, state.tz)} your time · {fmtTime(day.start, 'America/Los_Angeles')} Las Vegas (PT)
              </p>
            </div>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={`/watch/${day.id}`}>
              <Button variant="primary" size="lg" tabIndex={-1}>
                <Icon name="play" size={18} /> {status === 'late' || status === 'interrupted' ? 'Open broadcast' : live ? 'Watch now' : 'Preview & remind me'}
              </Button>
            </Link>
            <Link to={`/events/${ev.id}`}>
              <Button variant="outline" size="lg" tabIndex={-1}>
                Event details
              </Button>
            </Link>
          </div>
          {status === 'delayed' && <p className="mt-4 max-w-lg text-xs text-subtle">Final tables are broadcast on a 30-minute delay to protect competition integrity (outer tables 15 minutes).</p>}
          {status === 'late' && (
            <p className="mt-4 max-w-lg text-sm text-delayed">
              Coverage is starting late — now expected around {fmtTime(HERO_EXPECTED_START, state.tz)} your time.
            </p>
          )}
          {status === 'interrupted' && <p className="mt-4 max-w-lg text-sm text-live">The broadcast is temporarily off air. It resumes automatically — catch up on the key hands meanwhile.</p>}
        </div>
        <div className="hidden lg:block">
          <Art hue={220} label={`#${ev.number}`} className="shadow-2xl ring-1 ring-line">
            <span className="absolute top-3 left-3">{live ? <StatusBadge status={status} /> : <StatusBadge status="upcoming" />}</span>
          </Art>
        </div>
      </div>
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="label text-subtle">{k}</dt>
      <dd className="mt-1 text-lg font-bold tnum">{v}</dd>
    </div>
  );
}

function RankingWidget() {
  const top = [...players].sort((a, b) => b.poyPoints - a.poyPoints).slice(0, 5);
  return (
    <section className="rounded-panel border border-line bg-surface p-4">
      <SectionHeader kicker="2026 season" title="Player of the Year" action={<Link to="/rankings" className="text-xs font-semibold text-muted hover:text-text">Full →</Link>} />
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
