import { useEffect, useState } from 'react';
import type { HandType } from '../data/types';
import { hands } from '../data/mock';
import { HandCard } from '../components/cards';
import { EmptyState, FilterChip, Page, Segmented, Skeleton } from '../components/ui';
import { HAND_META, HandGlyph } from '../features/player/markers';

const FILTERS: HandType[] = ['allin', 'bigpot', 'bluff', 'badbeat', 'herofold'];

export function Hands() {
  const [types, setTypes] = useState<HandType[]>([]);
  const [sort, setSort] = useState<'trending' | 'pot'>('trending');
  const [loading, setLoading] = useState(true);
  // Simulated fetch → skeleton loader state.
  useEffect(() => {
    setLoading(true);
    const t = window.setTimeout(() => setLoading(false), 500);
    return () => window.clearTimeout(t);
  }, [types, sort]);

  const list = hands.filter((h) => !types.length || types.includes(h.type)).sort((a, b) => (sort === 'pot' ? b.pot - a.pot : b.views - a.views));
  const toggle = (t: HandType) => setTypes((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]));

  return (
    <Page>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label text-gold">Every key moment</p>
          <h1 className="mt-1 text-title font-black">Hands &amp; Clips</h1>
        </div>
        <Segmented
          label="Sort"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'trending', label: 'Trending' },
            { value: 'pot', label: 'Biggest pot' },
          ]}
        />
      </header>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by hand type">
        <FilterChip on={!types.length} onClick={() => setTypes([])}>
          All
        </FilterChip>
        {FILTERS.map((t) => (
          <FilterChip key={t} on={types.includes(t)} onClick={() => toggle(t)}>
            <span className="inline-flex items-center gap-1.5">
              <HandGlyph type={t} size={14} /> {HAND_META[t].label}
            </span>
          </FilterChip>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted tnum" aria-live="polite">
        {loading ? 'Loading…' : `${list.length} hands`}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="space-y-2 rounded-card border border-line p-3">
                <Skeleton className="aspect-video" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))
          : list.map((h) => <HandCard key={h.id} hand={h} />)}
      </div>
      {!loading && !list.length && <EmptyState title="No hands match these filters" />}
    </Page>
  );
}
