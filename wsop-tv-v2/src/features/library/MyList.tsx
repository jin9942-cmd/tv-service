// My List: saving events, broadcast days, classics and hands. Separate from reminders (Remind me) on purpose.
// Guests are sent through the normal GGPASS sign-in; the save completes when they come back (see AppProvider).
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { archive, dayById, eventById, hands } from '../../data/mock';
import { frameFrom } from '../../lib/media';
import { useApp, type ListItem, type ListKind } from '../../state/app';
import { ArchiveCard, Art, BroadcastCard, HandCard } from '../../components/cards';
import { BraceletIcon, Button, FilterChip, Page } from '../../components/ui';
import { CardMenu, useListAction, useLongPress } from './listActions';
export { MyListButton, useMyList } from './listActions';

/** A saved event (events have no single card elsewhere). */
export function EventCard({ eventId }: { eventId: string }) {
  const e = eventById(eventId)!;
  const lp = useLongPress();
  const action = useListAction('event', e.id);
  return (
    <div className="group relative w-64 sm:w-72" {...lp.bind}>
      <Link to={`/events/${e.id}`} className="block">
        <Art hue={200 + e.number * 3} image={frameFrom(e.number)}>
          <span className="label absolute top-2 left-2 flex items-center gap-1 rounded-[3px] bg-black/70 px-1.5 py-0.5 text-[10px]">
            <BraceletIcon size={12} /> Event #{e.number}
          </span>
        </Art>
        <p className="mt-2 truncate text-[15px] font-semibold group-hover:text-gold-strong">{e.name}</p>
        <p className="truncate text-xs text-muted">
          {e.days.length} broadcast days · {e.game}
        </p>
      </Link>
      <CardMenu actions={[action]} openSignal={lp.signal} className="top-2 right-2" />
    </div>
  );
}

/** Renders a saved item with the card it uses everywhere else. */
export function ListItemCard({ item }: { item: ListItem }) {
  if (item.kind === 'event') return eventById(item.id) ? <EventCard eventId={item.id} /> : null;
  if (item.kind === 'day') {
    const ref = dayById(item.id);
    return ref ? <BroadcastCard event={ref.event} day={ref.day} /> : null;
  }
  if (item.kind === 'archive') {
    const a = archive.find((x) => x.id === item.id);
    return a ? <ArchiveCard item={a} /> : null;
  }
  const h = hands.find((x) => x.id === item.id);
  return h ? <HandCard hand={h} /> : null;
}

const KIND_FILTERS: { v: ListKind | 'all'; label: string }[] = [
  { v: 'all', label: 'All' },
  { v: 'event', label: 'Events' },
  { v: 'day', label: 'Broadcasts' },
  { v: 'archive', label: 'Classics' },
  { v: 'hand', label: 'Hands & Clips' },
];

export function MyListPage() {
  const { state, signedIn, requireLogin } = useApp();
  const [kind, setKind] = useState<ListKind | 'all'>('all');
  if (!signedIn)
    return (
      <Page className="max-w-xl py-20 text-center">
        <p className="label text-gold">My List</p>
        <h1 className="mt-2 text-title font-black">Sign in to see your list</h1>
        <p className="mt-2 text-muted">Save events, broadcasts, classics and hands to watch later.</p>
        <Button variant="primary" size="lg" className="mt-6" onClick={() => requireLogin({ reason: 'Sign in to see My List.', returnTo: '/my-list' })}>
          Continue with GGPASS
        </Button>
      </Page>
    );
  const items = [...state.myList].sort((a, b) => b.addedAt - a.addedAt).filter((x) => kind === 'all' || x.kind === kind);
  return (
    <Page>
      <header>
        <p className="label text-gold">Saved</p>
        <h1 className="mt-1 text-title font-black">My List</h1>
        <p className="mt-1 text-sm text-muted">Most recently added first. Saving an upcoming broadcast doesn’t set a reminder — use Remind me for that.</p>
      </header>
      {state.myList.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by type">
          {KIND_FILTERS.map((f) => (
            <FilterChip key={f.v} on={kind === f.v} onClick={() => setKind(f.v)}>
              {f.label} <span className="ml-1 text-subtle tnum">{f.v === 'all' ? state.myList.length : state.myList.filter((x) => x.kind === f.v).length}</span>
            </FilterChip>
          ))}
        </div>
      )}
      {state.myList.length === 0 ? (
        <EmptyList />
      ) : items.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Nothing of this type in your list yet.</p>
      ) : (
        <div className="mt-6 grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&>*]:w-auto!">
          {items.map((x) => (
            <ListItemCard key={x.kind + x.id} item={x} />
          ))}
        </div>
      )}
    </Page>
  );
}

function EmptyList() {
  const steps: [string, ReactNode][] = [
    ['On a card', <>Hover (or long-press on touch) and open <b className="text-text">⋯</b> → Add to My List</>],
    ['While watching', <>Use the <b className="text-text">+ My List</b> button under the player</>],
    ['On an event page', <>Use <b className="text-text">+ My List</b> next to the event name</>],
  ];
  return (
    <div className="mt-8 rounded-panel border border-dashed border-line-strong p-6 sm:p-8">
      <p className="text-lg font-bold">Your list is empty</p>
      <p className="mt-1 text-sm text-muted">Save events, broadcasts, classics and hands to come back to them later.</p>
      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        {steps.map(([k, v], i) => (
          <li key={k} className="rounded-card bg-surface p-4">
            <p className="label text-[10px] text-gold">
              {i + 1} · {k}
            </p>
            <p className="mt-1 text-sm text-muted">{v}</p>
          </li>
        ))}
      </ol>
      <Link to="/" className="mt-5 inline-block text-sm font-semibold text-gold hover:underline">
        Browse Home →
      </Link>
    </div>
  );
}
