import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { TIER_BADGE, requiredTier, type Tier } from '../data/policy';
import { isOnAir } from '../lib/broadcast';
import { archive, events, hands, players, series } from '../data/mock';
import { buildIndex, search, suggest, KIND_LABEL, type SearchItem, type SearchKind, type SearchStatus } from '../lib/search';
import { canWatch, useApp } from '../state/app';
import { HandCard } from '../components/cards';
import { AccessBadge, Avatar, EmptyState, FilterChip, Icon, Page, Spoiler, StatusBadge, Tabs, cx } from '../components/ui';

type Tab = 'all' | 'events' | 'hands' | 'players' | 'archive';
const TAB_KINDS: Record<Tab, SearchKind[]> = { all: ['event', 'day', 'hand', 'player', 'archive'], events: ['event', 'day'], hands: ['hand'], players: ['player'], archive: ['archive'] };
const TAB_LABEL: Record<Tab, string> = { all: 'All', events: 'Events', hands: 'Hands & Clips', players: 'Players', archive: 'Archive' };
const STATUS_LABEL: Record<SearchStatus, string> = { live: 'Live', upcoming: 'Upcoming', vod: 'VOD' };
const TIERS: Tier[] = ['free', 'wsopFree', 'basic', 'premium'];
const liveOf = (it: SearchItem) => !!it.badge && isOnAir(it.badge);

export function Search() {
  const { state, set } = useApp();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [draft, setDraft] = useState(q);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [tab, setTab] = useState<Tab>('all');
  const [statuses, setStatuses] = useState<SearchStatus[]>([]);
  const [seriesId, setSeriesId] = useState('');
  const [access, setAccess] = useState<Tier[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => setDraft(q), [q]);
  useEffect(() => input.current?.focus(), []);

  const index = useMemo(() => buildIndex(state.streamMode, state.spoilerFree), [state.streamMode, state.spoilerFree]);
  const suggestions = useMemo(() => suggest(index, draft), [index, draft]);
  const results = useMemo(() => (q ? search(index, q) : []), [index, q]);
  const filtered = results.filter(
    (r) =>
      (!statuses.length || (r.status && statuses.includes(r.status))) &&
      (!seriesId || r.seriesId === seriesId) &&
      // Access filter = the WSOP+ tier the item needs under the current "included from" setting.
      (!access.length || (r.access && access.includes(requiredTier(r.access, state.includedFrom, liveOf(r))))),
  );
  const ofTab = (t: Tab) => filtered.filter((r) => TAB_KINDS[t].includes(r.kind));
  const filtersOn = statuses.length + access.length + (seriesId ? 1 : 0);

  const commit = (text: string) => {
    const v = text.trim();
    setOpen(false);
    setActive(-1);
    if (!v) return setParams({}, { replace: true });
    setParams({ q: v }, { replace: true });
    set((s) => ({ recentSearches: [v, ...s.recentSearches.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 8) }));
  };
  const removeRecent = (v: string) => set((s) => ({ recentSearches: s.recentSearches.filter((x) => x !== v) }));

  // Dropdown: suggestions while typing, recent searches while empty.
  const showRecent = open && !draft.trim() && state.recentSearches.length > 0;
  const showSuggest = open && !!draft.trim() && draft.trim() !== q && suggestions.length > 0;
  const options: string[] = showSuggest ? suggestions.map((s) => s.title) : showRecent ? state.recentSearches : [];

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && options.length) (e.preventDefault(), setOpen(true), setActive((a) => (a + 1) % options.length));
    else if (e.key === 'ArrowUp' && options.length) (e.preventDefault(), setActive((a) => (a <= 0 ? options.length - 1 : a - 1)));
    else if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (showSuggest && active >= 0) return openItem(suggestions[active]);
      commit(active >= 0 && options[active] ? options[active] : draft);
    }
  };
  const openItem = (it: SearchItem) => {
    commit(draft || it.title);
    nav(it.url);
  };

  return (
    <Page className="max-w-5xl">
      <h1 className="sr-only">Search</h1>
      <form
        role="search"
        onSubmit={(e) => (e.preventDefault(), commit(draft))}
        className="relative"
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}
      >
        <label htmlFor="search-input" className="sr-only">
          Search events, broadcasts, hands, players and the archive
        </label>
        <Icon name="search" size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-subtle" />
        <input
          id="search-input"
          ref={input}
          value={draft}
          onChange={(e) => (setDraft(e.target.value), setOpen(true), setActive(-1))}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          role="combobox"
          aria-expanded={showRecent || showSuggest}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          placeholder="Search events, broadcasts, hands, players…"
          className="h-14 w-full rounded-panel border border-line-strong bg-surface pr-12 pl-12 text-base placeholder:text-subtle focus:border-gold focus:outline-none"
        />
        {draft && (
          <button type="button" onClick={() => (setDraft(''), commit(''), input.current?.focus())} aria-label="Clear search" className="absolute top-1/2 right-3 -translate-y-1/2 rounded-chip p-2 text-muted hover:text-text">
            <Icon name="close" size={18} />
          </button>
        )}

        {(showRecent || showSuggest) && (
          <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-panel border border-line-strong bg-surface shadow-2xl">
            <p className="label px-4 pt-3 pb-1 text-[10px] text-subtle">{showSuggest ? 'Suggestions' : 'Recent searches'}</p>
            <ul id={listId} role="listbox" aria-label={showSuggest ? 'Suggestions' : 'Recent searches'} className="pb-2">
              {showSuggest
                ? suggestions.map((s, i) => (
                    <li key={s.kind + s.id} id={`${listId}-${i}`} role="option" aria-selected={active === i}>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => openItem(s)} className={cx('flex w-full items-center gap-3 px-4 py-2 text-left text-sm', active === i ? 'bg-surface-2' : 'hover:bg-surface-2')}>
                        <Icon name="search" size={15} className="text-subtle" />
                        <span className="min-w-0 flex-1 truncate">{s.title}</span>
                        <span className="label text-[10px] text-subtle">{KIND_LABEL[s.kind]}</span>
                      </button>
                    </li>
                  ))
                : state.recentSearches.map((r, i) => (
                    <li key={r} id={`${listId}-${i}`} role="option" aria-selected={active === i} className={cx('flex items-center', active === i && 'bg-surface-2')}>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => (setDraft(r), commit(r))} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2 text-left text-sm hover:bg-surface-2">
                        <Icon name="back10" size={15} className="text-subtle" />
                        <span className="truncate">{r}</span>
                      </button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => removeRecent(r)} aria-label={`Remove “${r}” from recent searches`} className="mr-2 rounded-chip p-1.5 text-subtle hover:text-text">
                        <Icon name="close" size={14} />
                      </button>
                    </li>
                  ))}
            </ul>
          </div>
        )}
      </form>

      {!q ? (
        <StartState onPick={(v) => (setDraft(v), commit(v))} onRemove={removeRecent} />
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2" role="group" aria-label="Filters">
            <span className="label text-[10px] text-subtle">Status</span>
            {(Object.keys(STATUS_LABEL) as SearchStatus[]).map((s) => (
              <FilterChip key={s} on={statuses.includes(s)} onClick={() => setStatuses((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]))}>
                {STATUS_LABEL[s]}
              </FilterChip>
            ))}
            <span className="label ml-2 text-[10px] text-subtle">Access</span>
            {TIERS.map((a) => (
              <FilterChip key={a} on={access.includes(a)} onClick={() => setAccess((x) => (x.includes(a) ? x.filter((y) => y !== a) : [...x, a]))}>
                {TIER_BADGE[a]}
              </FilterChip>
            ))}
            <label className="ml-2 flex items-center gap-2">
              <span className="label text-[10px] text-subtle">Series</span>
              <select value={seriesId} onChange={(e) => setSeriesId(e.target.value)} className="h-8 rounded-chip border border-line-strong bg-surface px-2 text-[13px]">
                <option value="">All series</option>
                {series.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            {filtersOn > 0 && (
              <button onClick={() => (setStatuses([]), setAccess([]), setSeriesId(''))} className="text-[13px] font-semibold text-muted hover:text-text">
                Clear filters
              </button>
            )}
          </div>

          <div className="mt-4 overflow-x-auto [&_[role=tab]]:whitespace-nowrap">
            <Tabs<Tab> label="Result type" value={tab} onChange={setTab} tabs={(Object.keys(TAB_LABEL) as Tab[]).map((t) => ({ value: t, label: `${TAB_LABEL[t]} · ${ofTab(t).length}` }))} />
          </div>
          <p className="sr-only" aria-live="polite">
            {filtered.length} results for {q}
          </p>

          {ofTab(tab).length === 0 ? (
            <NoResults q={q} filtered={filtersOn > 0} />
          ) : tab === 'all' ? (
            <div className="mt-5 space-y-8">
              {(['events', 'hands', 'players', 'archive'] as Tab[])
                .filter((t) => ofTab(t).length)
                .map((t) => (
                  <section key={t} aria-label={TAB_LABEL[t]}>
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="text-base font-bold">{TAB_LABEL[t]}</h2>
                      {ofTab(t).length > 4 && (
                        <button onClick={() => setTab(t)} className="text-sm font-semibold text-muted hover:text-text">
                          See all {ofTab(t).length} →
                        </button>
                      )}
                    </div>
                    <ResultList items={ofTab(t).slice(0, 4)} />
                  </section>
                ))}
            </div>
          ) : (
            <div className="mt-5">
              <ResultList items={ofTab(tab)} />
            </div>
          )}
        </>
      )}
    </Page>
  );
}

function ResultList({ items }: { items: SearchItem[] }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
      {items.map((it) => (
        <li key={it.kind + it.id}>
          <ResultRow it={it} />
        </li>
      ))}
    </ul>
  );
}

function ResultRow({ it }: { it: SearchItem }) {
  const { state } = useApp();
  const p = it.kind === 'player' ? players.find((x) => x.id === it.id) : undefined;
  const h = it.kind === 'hand' ? hands.find((x) => x.id === it.id) : undefined;
  const a = it.kind === 'archive' ? archive.find((x) => x.id === it.id) : undefined;
  const e = it.kind === 'event' ? events.find((x) => x.id === it.id) : undefined;
  return (
    <div className="flex items-center gap-3 px-3 py-3 transition-colors duration-150 hover:bg-surface-2 sm:gap-4 sm:px-4">
      <Link to={it.url} className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        {p ? (
          <span className="flex w-20 shrink-0 justify-center sm:w-28">
            <Avatar name={p.name} hue={p.hue} size={44} vivid />
          </span>
        ) : (
          <span className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-[6px] bg-surface-3 sm:w-28">
            {it.image && <img src={it.image} alt="" loading="lazy" className="size-full object-cover" />}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="label block text-[10px] text-subtle">{KIND_LABEL[it.kind]}</span>
          <span className="block truncate text-[15px] font-semibold">{it.title}</span>
          <span className="block truncate text-xs text-muted">{it.sub}</span>
        </span>
      </Link>
      <span className="hidden shrink-0 flex-col items-end gap-1 text-xs sm:flex">
        <span className="flex items-center gap-1.5">
          {it.badge && <StatusBadge status={it.badge} size="sm" />}
          {!it.badge && it.status === 'upcoming' && <StatusBadge status="upcoming" size="sm" />}
          {it.access && <AccessBadge access={it.access} live={liveOf(it)} locked={!canWatch(it.access, state, liveOf(it))} />}
        </span>
        {/* outcomes stay behind a reveal in spoiler-free mode */}
        {h && (
          <Spoiler k={`hand-${h.id}`} inline label="Hand result hidden">
            <span className="max-w-56 truncate text-muted">{h.result}</span>
          </Spoiler>
        )}
        {a && (
          <Spoiler k={`archive-${a.id}`} inline label="Champion hidden">
            <span className="text-muted">Champion: {players.find((x) => x.id === a.winnerId)?.name}</span>
          </Spoiler>
        )}
        {e?.winnerId && (
          <Spoiler k={`winner-${e.id}`} inline label="Champion hidden">
            <span className="text-muted">Champion: {players.find((x) => x.id === e.winnerId)?.name}</span>
          </Spoiler>
        )}
      </span>
    </div>
  );
}

/** Empty query: recent searches + quick ideas. */
function StartState({ onPick, onRemove }: { onPick: (v: string) => void; onRemove: (v: string) => void }) {
  const { state } = useApp();
  const ideas = ['Main Event', 'Final Table', 'High Roller', 'Lindgren', 'Pot-Limit Omaha', 'All-in'];
  return (
    <div className="mt-8 grid gap-8 md:grid-cols-2">
      <section aria-label="Recent searches">
        <h2 className="label mb-3 text-subtle">Recent searches</h2>
        {state.recentSearches.length ? (
          <ul className="flex flex-wrap gap-2">
            {state.recentSearches.map((r) => (
              <li key={r} className="flex items-center rounded-full border border-line-strong">
                <button onClick={() => onPick(r)} className="py-1.5 pr-1 pl-3.5 text-[13px] font-semibold hover:text-gold-strong">
                  {r}
                </button>
                <button onClick={() => onRemove(r)} aria-label={`Remove “${r}” from recent searches`} className="mr-1 rounded-full p-1.5 text-subtle hover:text-text">
                  <Icon name="close" size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Your searches will show up here.</p>
        )}
      </section>
      <section aria-label="Try searching for">
        <h2 className="label mb-3 text-subtle">Try searching for</h2>
        <ul className="flex flex-wrap gap-2">
          {ideas.map((i) => (
            <li key={i}>
              <FilterChip on={false} onClick={() => onPick(i)}>
                {i}
              </FilterChip>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function NoResults({ q, filtered }: { q: string; filtered: boolean }) {
  const picks = [...hands].filter((h) => h.access === 'free').sort((a, b) => b.views - a.views).slice(0, 3);
  return (
    <div className="mt-6 space-y-6">
      <EmptyState title={`No results for “${q}”`} body={filtered ? 'Try removing a filter, or check the spelling.' : 'Check the spelling, or try a player, an event or a hand type.'} />
      <section aria-label="Recommended">
        <h2 className="mb-3 text-base font-bold">Watch these instead</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {picks.map((h) => (
            <HandCard key={h.id} hand={h} />
          ))}
        </div>
      </section>
    </div>
  );
}
