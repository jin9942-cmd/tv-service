import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { eventById, hands, players } from '../data/mock';
import { count, money, ordinal } from '../lib/format';
import { useApp } from '../state/app';
import { HandCard, PlayerTile } from '../components/cards';
import { Avatar, BraceletCount, Button, CountryCode, EmptyState, Icon, Page, SectionHeader, Switch } from '../components/ui';
import { NotFound } from './NotFound';
import { JourneyChip } from '../v4/screens';
import { STATUS_LABEL, followAlert, journeyOf } from '../v4/journey';
import { fmtDate, fmtTime } from '../lib/time';
import { chips } from '../lib/format';

export function Players() {
  const [q, setQ] = useState('');
  const [cc, setCc] = useState('');
  const countries = useMemo(() => [...new Set(players.map((p) => p.country))].sort(), []);
  const list = players.filter((p) => (!cc || p.country === cc) && (!q || p.name.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.earnings - a.earnings);

  return (
    <Page>
      <header>
        <p className="label text-gold">Competitors</p>
        <h1 className="mt-1 text-title font-black">Players</h1>
      </header>
      <div className="mt-5 flex flex-wrap gap-3">
        <label className="relative min-w-60 flex-1 sm:flex-none">
          <span className="sr-only">Search players</span>
          <Icon name="search" size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players" className="h-10 w-full rounded-chip border border-line-strong bg-surface pr-3 pl-9 text-sm placeholder:text-subtle sm:w-72" />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="sr-only">Nationality</span>
          <select value={cc} onChange={(e) => setCc(e.target.value)} className="h-10 rounded-chip border border-line-strong bg-surface px-3 text-sm text-text">
            <option value="">All nationalities</option>
            {countries.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <span className="self-center text-sm text-muted tnum">{list.length} players</span>
      </div>
      <div className="mt-6">
        {list.length ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 [&>a]:w-auto">
            {list.map((p) => (
              <PlayerTile key={p.id} player={p} />
            ))}
          </div>
        ) : (
          <EmptyState title={`No players match “${q}”`} body="Try a different name or clear the nationality filter." action={<Button size="sm" variant="outline" onClick={() => (setQ(''), setCc(''))}>Clear filters</Button>} />
        )}
      </div>
    </Page>
  );
}

export function PlayerProfile() {
  const { playerId = '' } = useParams();
  const { state, set, toast, signedIn, requireLogin } = useApp();
  const p = players.find((x) => x.id === playerId);
  if (!p) return <NotFound />;
  const follow = state.followed[p.id];
  const highlights = hands.filter((h) => h.playerIds.includes(p.id)).slice(0, 6);
  const rank = [...players].sort((a, b) => b.poyPoints - a.poyPoints).findIndex((x) => x.id === p.id) + 1;

  const toggleFollow = () => {
    if (!signedIn) return requireLogin({ reason: `Sign in to follow ${p.name}.` });
    set((s) => {
      const next = { ...s.followed };
      if (next[p.id]) delete next[p.id];
      else next[p.id] = { notify: true };
      return { followed: next };
    });
    toast(follow ? `Unfollowed ${p.name}` : `Following ${p.name} · alerts on`);
  };

  return (
    <Page className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link to="/players" className="hover:text-text">
          Players
        </Link>{' '}
        / <span className="text-text">{p.name}</span>
      </nav>
      <section className="flex flex-col gap-6 rounded-panel border border-line bg-surface p-6 md:flex-row md:items-center">
        <Avatar name={p.name} hue={p.hue} photo={p.photo} size={112} ring={p.bracelets > 0} />
        <div className="flex-1">
          <p className="flex items-center gap-2 text-sm text-muted">
            <CountryCode cc={p.cc} /> {p.country}
          </p>
          <h1 className="mt-1 text-title font-black tracking-tight">{p.name}</h1>
          <dl className="mt-4 grid grid-cols-3 gap-4 sm:max-w-lg">
            <div>
              <dt className="label text-subtle">Total earnings</dt>
              <dd className="mt-1 text-lg font-black tnum">{money(p.earnings)}</dd>
            </div>
            <div>
              <dt className="label text-subtle">Bracelets</dt>
              <dd className="mt-1 text-lg">
                <BraceletCount n={p.bracelets} size={20} />
              </dd>
            </div>
            <div>
              <dt className="label text-subtle">POY rank</dt>
              <dd className="mt-1 text-lg font-black tnum">#{rank}</dd>
            </div>
          </dl>
        </div>
        <div className="w-full space-y-1 md:w-64">
          <Button variant={follow ? 'secondary' : 'primary'} className="w-full" onClick={toggleFollow} aria-pressed={!!follow}>
            {follow ? (
              <>
                <Icon name="check" size={16} /> Following
              </>
            ) : (
              'Follow'
            )}
          </Button>
          {follow && (
            <Switch
              label="Alerts"
              description="When they play on a broadcast table"
              on={follow.notify}
              onChange={(v) => set((s) => ({ followed: { ...s.followed, [p.id]: { notify: v } } }))}
            />
          )}
        </div>
      </section>

      <Journey playerId={p.id} />

      <section>
        <SectionHeader title="Recent results" />
        {p.recent.length ? (
          <ul className="divide-y divide-line rounded-panel border border-line bg-surface">
            {p.recent.map((r) => {
              const e = eventById(r.eventId)!;
              return (
                <li key={r.eventId} className="flex items-center gap-4 px-4 py-3">
                  <span className="w-12 text-lg font-black tnum">{ordinal(r.place)}</span>
                  <Link to={`/events/${e.id}`} className="min-w-0 flex-1 truncate font-semibold hover:text-gold-strong">
                    #{e.number} {e.name}
                  </Link>
                  <span className="text-sm tnum">{money(r.prize)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">No cashes recorded in the current series.</p>
        )}
      </section>

      <section>
        <SectionHeader title="Highlight hands" />
        {highlights.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((h) => (
              <HandCard key={h.id} hand={h} />
            ))}
          </div>
        ) : (
          <EmptyState title="No highlight hands yet" />
        )}
      </section>
      <p className="text-xs text-subtle">Player of the Year points: {count(p.poyPoints)} · Fictional player for demo purposes.</p>
    </Page>
  );
}

/**
 * v5: the player's run through this series — still in or on the broadcast table right now, the next broadcast to catch,
 * and the alert a follower gets.
 */
function Journey({ playerId }: { playerId: string }) {
  const { state } = useApp();
  const stops = journeyOf(playerId, state.streamMode);
  const alert = followAlert(playerId, state.streamMode);
  if (!stops.length) return null;
  return (
    <section>
      <SectionHeader title="This series" kicker="Their tournament, as it happens" />
      {alert && (
        <p className="mb-3 flex items-start gap-2 rounded-card border border-gold/40 bg-gold-dim px-4 py-3 text-sm">
          <Icon name="bell" size={16} className="mt-0.5 shrink-0 text-gold" />
          <span>
            <b>What followers get:</b> “{alert}”
          </span>
        </p>
      )}
      <ul className="divide-y divide-line rounded-panel border border-line bg-surface">
        {stops.map((j) => (
          <li key={j.event.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <span className="min-w-0 flex-1">
              <Link to={`/events/${j.event.id}`} className="block truncate font-semibold hover:text-gold-strong">
                {j.event.name.replace(' World Championship', '')}
              </Link>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <JourneyChip status={j.status} />
                {j.status !== 'finished' && j.stack > 0 && <span className="tnum">{chips(j.stack)} in chips · {j.day.label}</span>}
                {j.next && (
                  <span>
                    Next on camera: {j.next.label}, {fmtDate(j.next.start, state.tz)} {fmtTime(j.next.start, state.tz)}
                  </span>
                )}
              </span>
            </span>
            <Link to={`/watch/${j.day.id}`}>
              <Button size="sm" variant={j.status === 'onTable' ? 'primary' : 'secondary'} tabIndex={-1} aria-label={`${STATUS_LABEL[j.status]} — watch ${j.day.label}`}>
                <Icon name="play" size={14} /> {j.status === 'onTable' ? 'Watch their table' : `Watch ${j.day.label}`}
              </Button>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
