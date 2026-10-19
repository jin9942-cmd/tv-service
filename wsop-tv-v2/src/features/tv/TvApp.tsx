// The TV app inside the preview frame (1920×1080 canvas).
// Shared: data, screens (Home / Event / Player / Login), key mapping. Per platform: the UI shell and focus language.
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { OverlayLevel, Platform } from '../../data/types';
import { HERO_DAY_ID, archive, dayById, eventById, events, hands, playerById, seatsFor } from '../../data/mock';
import { handFor } from '../player/hand';
import { PLATFORMS, overlayAllowed } from '../../data/platforms';
import { chips, duration, money } from '../../lib/format';
import { fmtDateTime, fmtTime } from '../../lib/time';
import { gateFor, useApp, useTick } from '../../state/app';
import { useLiveStacks } from '../../state/stacks';
import { isOnAir } from '../../lib/broadcast';
import { BraceletIcon, Icon, StatusBadge, cx } from '../../components/ui';
import { Stage } from '../player/Stage';
import { HAND_META, HandGlyph } from '../player/markers';
import { useRemoteFocus, type FocusItem, type FocusModel } from './focus';
import { SHELLS, SHELL_OF, TV_FOCUS, notAvailable, type ShellFamily, type ShellSpec } from './tvTokens';
import { QrMock } from './QrMock';
import { WSOP_LOGO } from '../../lib/brand';
import { COMPLETE_THRESHOLD } from '../../data/policy';
import { buildIndex, search, KIND_LABEL, type SearchItem } from '../../lib/search';
import { useMyList } from '../library/listActions';

type Screen =
  | { name: 'home' }
  | { name: 'event'; eventId: string }
  | { name: 'player'; dayId: string }
  | { name: 'login'; after?: Screen }
  | { name: 'search' }
  /** Options for a focused Continue Watching card (the remote's options key — "o" in the demo). */
  | { name: 'options'; dayId: string };

interface HomeCard {
  id: string;
  title: string;
  sub: string;
  hue: number;
  badge?: ReactNode;
  onSelect: () => void;
}
interface HomeRow {
  id: string;
  title: string;
  hint?: string;
  cards: HomeCard[];
}

interface TvCtx {
  family: ShellFamily;
  spec: ShellSpec;
  label: string;
  isFocused: (id: string) => boolean;
  /** Mouse is optional: a click focuses the item and runs the same action as OK. */
  click: (row: number, col: number) => void;
}
const Ctx = createContext<TvCtx>(null as unknown as TvCtx);
const useTv = () => useContext(Ctx);

export function TvApp({ platform }: { platform: Platform }) {
  const { state, set, toast } = useApp();
  const myList = useMyList();
  const family = SHELL_OF[platform];
  const spec = SHELLS[family];
  const caps = PLATFORMS[platform];
  const [stack, setStack] = useState<Screen[]>([{ name: 'home' }]);
  const screen = stack[stack.length - 1];
  const push = (s: Screen) => setStack((x) => [...x, s]);
  const back = () => setStack((x) => (x.length > 1 ? x.slice(0, -1) : x));
  const replace = (s: Screen) => setStack((x) => [...x.slice(0, -1), s]);
  const signedIn = state.scenario !== 'guest';

  const liveDays = events.flatMap((e) => e.days.filter((d) => d.status === 'live' || d.status === 'delayed').map((d) => ({ e, d })));
  const trending = [...hands].sort((a, b) => b.views - a.views).slice(0, 8);
  const [tab, setTab] = useState(0);

  const menu: (FocusItem & { label: string; icon: string })[] = [
    { id: 'm-home', label: 'Home', icon: 'star', onSelect: () => (setTab(0), setStack([{ name: 'home' }])) },
    { id: 'm-live', label: 'Live', icon: 'play', onSelect: () => (setTab(1), setStack([{ name: 'home' }])) },
    { id: 'm-events', label: 'Events', icon: 'layers', onSelect: () => (setTab(2), setStack([{ name: 'event', eventId: 'lv-main' }])) },
    { id: 'm-search', label: 'Search', icon: 'search', onSelect: () => (setTab(3), setStack([{ name: 'search' }])) },
    { id: 'm-account', label: signedIn ? 'Account' : 'Sign in', icon: 'user', onSelect: () => (signedIn ? undefined : push({ name: 'login' })) },
  ];
  const openDay = (dayId: string) => push({ name: 'player', dayId });

  // ---- home rows (Continue Watching and My List appear only when they have something) ----
  const continueItems = signedIn
    ? Object.entries(state.progress)
        .map(([id, sec]) => ({ ref: dayById(id), sec }))
        .filter((x): x is { ref: NonNullable<ReturnType<typeof dayById>>; sec: number } => !!x.ref && x.sec / (x.ref.day.durationMin * 60) < COMPLETE_THRESHOLD)
    : [];
  const listCards: HomeCard[] = signedIn
    ? [...state.myList]
        .sort((a, b) => b.addedAt - a.addedAt)
        .flatMap((x, i): HomeCard[] => {
          if (x.kind === 'day') {
            const r = dayById(x.id);
            return r ? [{ id: `ml-${x.id}`, title: r.event.name, sub: r.day.label, hue: 205 + i * 12, onSelect: () => openDay(x.id) }] : [];
          }
          if (x.kind === 'event') {
            const e = eventById(x.id);
            return e ? [{ id: `ml-${x.id}`, title: e.name, sub: `Event #${e.number}`, hue: 205 + i * 12, onSelect: () => push({ name: 'event', eventId: e.id }) }] : [];
          }
          if (x.kind === 'hand') {
            const h = hands.find((y) => y.id === x.id);
            return h ? [{ id: `ml-${x.id}`, title: h.title, sub: `Hand · Pot ${chips(h.pot)}`, hue: 205 + i * 12, onSelect: () => openDay(h.dayId) }] : [];
          }
          const a = archive.find((y) => y.id === x.id);
          return a ? [{ id: `ml-${x.id}`, title: `${a.year} ${a.title}`, sub: duration(a.durationSec), hue: a.hue, onSelect: () => openDay('lv-main-day3') }] : [];
        })
    : [];
  const homeRows: HomeRow[] = [
    ...(continueItems.length
      ? [
          {
            id: 'continue',
            title: 'Continue Watching',
            hint: 'Press O for options',
            cards: continueItems.map(({ ref, sec }, i) => ({
              id: `cw-${ref.day.id}`,
              title: ref.event.name,
              sub: `${ref.day.label} · ${Math.round((sec / (ref.day.durationMin * 60)) * 100)}% watched`,
              hue: 200 + i * 15,
              onSelect: () => openDay(ref.day.id),
            })),
          },
        ]
      : []),
    ...(listCards.length ? [{ id: 'mylist', title: 'My List', cards: listCards }] : []),
    { id: 'live', title: 'Live now', cards: liveDays.map(({ e, d }, i) => ({ id: `live-${d.id}`, title: e.name, sub: d.label, hue: 220 + i * 20, badge: <StatusBadge status={d.id === HERO_DAY_ID ? state.streamMode : d.status} />, onSelect: () => openDay(d.id) })) },
    { id: 'hands', title: 'Trending hands', cards: trending.map((h, i) => ({ id: `hand-${h.id}`, title: h.title, sub: `${HAND_META[h.type].label} · Pot ${chips(h.pot)}`, hue: 210 + i * 9, badge: <HandGlyph type={h.type} size={30} />, onSelect: () => openDay(h.dayId) })) },
    { id: 'archive', title: 'Archive classics', cards: archive.map((a) => ({ id: `arc-${a.id}`, title: `${a.year} ${a.title}`, sub: duration(a.durationSec), hue: a.hue, onSelect: () => openDay('lv-main-day3') })) },
  ];

  // ---- search (on-screen keyboard) ----
  const [tvQuery, setTvQuery] = useState('');
  const tvResults: SearchItem[] = useMemo(() => (tvQuery.trim() ? search(buildIndex(state.streamMode, state.spoilerFree), tvQuery).slice(0, 10) : []), [tvQuery, state.streamMode, state.spoilerFree]);
  const openResult = (r: SearchItem) => {
    set((s) => ({ recentSearches: [tvQuery.trim(), ...s.recentSearches.filter((x) => x.toLowerCase() !== tvQuery.trim().toLowerCase())].slice(0, 8) }));
    if (r.kind === 'day') return openDay(r.id);
    if (r.kind === 'event') return push({ name: 'event', eventId: r.id });
    if (r.kind === 'hand') return openDay(hands.find((h) => h.id === r.id)!.dayId);
    if (r.kind === 'archive') return openDay('lv-main-day3');
    toast('Player profiles open on web and mobile (demo)');
  };
  const removeContinue = (dayId: string) => {
    const sec = state.progress[dayId];
    set((s) => {
      const next = { ...s.progress };
      delete next[dayId];
      return { progress: next };
    });
    toast('Removed from Continue Watching', { label: 'Undo', onClick: () => set((s) => ({ progress: { ...s.progress, [dayId]: sec } })) });
  };
  const toggleList = (kind: 'event', id: string) => (signedIn ? myList.toggle(kind, id) : (set({ pendingListAdd: { kind, id } }), push({ name: 'login' })));

  // ---- player state (owned here so the focus model can reference it) ----
  const [overlay, setOverlay] = useState<OverlayLevel>('basic');
  const [views, setViews] = useState<1 | 2 | 4>(1);
  const [playing, setPlaying] = useState(true);
  const [handIdx, setHandIdx] = useState<number | null>(null);
  const [scrub, setScrub] = useState(9);
  useEffect(() => {
    if (!overlayAllowed(platform, overlay)) setOverlay(caps.overlayMax);
    if (views > caps.multiview) setViews(caps.multiview);
  }, [platform, caps, overlay, views]);

  const model: FocusModel = useMemo(() => {
    const placement = spec.nav === 'top-tabs' ? 'top' : 'side';
    if (screen.name === 'home')
      return {
        menu,
        menuPlacement: placement,
        rows: [
          { id: 'hero', items: [{ id: 'hero-watch', onSelect: () => openDay(HERO_DAY_ID) }, { id: 'hero-event', onSelect: () => push({ name: 'event', eventId: 'lv-main' }) }] },
          ...homeRows.map((r) => ({ id: r.id, items: r.cards.map((c) => ({ id: c.id, onSelect: c.onSelect })) })),
        ],
      };
    if (screen.name === 'options')
      return {
        onBack: back,
        rows: [{ id: 'opt', items: [{ id: 'opt-remove', onSelect: () => (removeContinue(screen.dayId), back()) }, { id: 'opt-cancel', onSelect: back }] }],
      };
    if (screen.name === 'search') {
      const keys = ['abcdefghi', 'jklmnopqr', 'stuvwxyz0'].map((r) => r.split(''));
      const results = tvResults.length
        ? tvResults.map((r) => ({ id: `sr-${r.kind}-${r.id}`, onSelect: () => openResult(r) }))
        : !tvQuery.trim() && state.recentSearches.length
          ? state.recentSearches.map((r) => ({ id: `rs-${r}`, onSelect: () => setTvQuery(r) }))
          : [{ id: 'sr-none', disabled: true }];
      return {
        menu,
        menuPlacement: placement,
        rows: [
          ...keys.map((r, ri) => ({ id: `kb${ri}`, items: r.map((ch) => ({ id: `k-${ch}`, onSelect: () => setTvQuery((q) => q + ch) })) })),
          { id: 'kb3', items: [{ id: 'k-space', onSelect: () => setTvQuery((q) => q + ' ') }, { id: 'k-del', onSelect: () => setTvQuery((q) => q.slice(0, -1)) }, { id: 'k-clear', onSelect: () => setTvQuery('') }] },
          { id: 'results', items: results },
        ],
      };
    }
    if (screen.name === 'event') {
      const e = eventById(screen.eventId)!;
      return {
        menu,
        menuPlacement: placement,
        onBack: back,
        rows: [
          { id: 'ev-actions', items: [{ id: 'ev-watch', onSelect: () => openDay(e.days[e.days.length - 1].id) }, { id: 'ev-list', onSelect: () => toggleList('event', e.id) }, { id: 'ev-back', onSelect: back }] },
          { id: 'ev-days', items: e.days.map((d) => ({ id: `day-${d.id}`, onSelect: () => openDay(d.id) })) },
        ],
      };
    }
    if (screen.name === 'player') {
      const dayHands = hands.filter((h) => h.dayId === screen.dayId);
      const gate = gateFor(state.scenario);
      if (gate !== 'ok')
        return {
          onBack: back,
          rows: [{ id: 'gate', items: [{ id: 'gate-signin', onSelect: () => (gate === 'login' ? replace({ name: 'login', after: screen }) : set({ scenario: 'active' })) }, { id: 'gate-back', onSelect: back }] }],
        };
      const levels: OverlayLevel[] = ['off', 'basic', 'pro'];
      return {
        onBack: back,
        rows: [
          {
            id: 'ctl',
            items: [
              { id: 'p-play', onSelect: () => setPlaying((p) => !p) },
              { id: 'p-prev', onSelect: () => setHandIdx((i) => Math.max(0, (i ?? 0) - 1)) },
              { id: 'p-next', onSelect: () => setHandIdx((i) => Math.min(dayHands.length - 1, (i ?? -1) + 1)) },
              { id: 'p-live', onSelect: () => (setHandIdx(null), setScrub(9)) },
              { id: 'p-back', onSelect: back },
            ],
          },
          spec.timeline === 'trickplay'
            ? { id: 'trick', items: Array.from({ length: 10 }, (_, i) => ({ id: `tp-${i}`, onSelect: () => (setScrub(i), setHandIdx(null)) })) }
            : { id: 'markers', items: dayHands.map((h, i) => ({ id: `mk-${h.id}`, onSelect: () => setHandIdx(i) })) },
          { id: 'overlay', items: levels.map((l) => ({ id: `ov-${l}`, disabled: !overlayAllowed(platform, l), onSelect: () => setOverlay(l) })) },
          caps.multiview === 1
            ? { id: 'multi', items: [{ id: 'mv-na', disabled: true }] }
            : { id: 'multi', items: ([1, 2, 4] as const).map((v) => ({ id: `mv-${v}`, disabled: v > caps.multiview, onSelect: () => setViews(v) })) },
        ],
      };
    }
    return { onBack: back, rows: [{ id: 'login', items: [{ id: 'login-back', onSelect: back }] }] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, signedIn, state.scenario, state.progress, state.myList, state.recentSearches, tvQuery, tvResults, platform, spec.nav, spec.timeline]);

  const screenKey = `${JSON.stringify(screen)}|${family}`;
  const { pos, isFocused, focusedRow, setPos, setMenuIndex, inMenu } = useRemoteFocus(model, screenKey);
  // Options key ("o" in the demo) on a focused Continue Watching card.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'o' || (e.target as HTMLElement)?.closest?.('select, input, [data-tv-ignore]')) return;
      const id = pos.zone === 'content' ? model.rows[pos.row]?.items[pos.col]?.id : undefined;
      if (screen.name === 'home' && id?.startsWith('cw-')) (e.preventDefault(), push({ name: 'options', dayId: id.slice(3) }));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMenuIndex(tab);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const click = (row: number, col: number) => {
    setPos({ zone: 'content', row, col });
    const item = model.rows[row]?.items[col];
    if (item && !item.disabled) item.onSelect?.();
  };
  const clickMenu = (i: number) => {
    setPos({ zone: 'menu', index: i });
    menu[i].onSelect?.();
  };

  const ctx: TvCtx = { family, spec, label: caps.label, isFocused, click };
  const chromeHidden = screen.name === 'player' || screen.name === 'login';

  let body: ReactNode = null;
  if (screen.name === 'home') body = <TvHome rows={homeRows} focusedRow={focusedRow} />;
  if (screen.name === 'options')
    body = (
      <>
        <TvHome rows={homeRows} focusedRow={-1} />
        <TvOptions dayId={screen.dayId} />
      </>
    );
  if (screen.name === 'search') body = <TvSearch query={tvQuery} results={tvResults} focusedRow={focusedRow} />;
  if (screen.name === 'event') body = <TvEvent eventId={screen.eventId} inList={myList.has('event', screen.eventId)} />;
  if (screen.name === 'player')
    body = <TvPlayer dayId={screen.dayId} platform={platform} overlay={overlay} views={views} playing={playing} handIdx={handIdx} scrub={scrub} />;
  if (screen.name === 'login') body = <TvLogin onDone={() => (screen.after ? replace(screen.after) : back())} />;

  return (
    <Ctx.Provider value={ctx}>
      <div className="relative flex size-full flex-col bg-bg text-text" data-shell={family}>
        {spec.systemBar && <SystemBar label={caps.label} />}
        <div className="flex min-h-0 flex-1">
          {!chromeHidden && spec.nav === 'side-fixed' && <SideMenu items={menu} active={tab} onClick={clickMenu} />}
          {!chromeHidden && spec.nav === 'side-rail' && <Rail items={menu} active={tab} expanded={inMenu} onClick={clickMenu} />}
          <div className="relative flex min-w-0 flex-1 flex-col">
            {!chromeHidden && spec.nav === 'top-tabs' && <TopTabs items={menu} active={tab} onClick={clickMenu} />}
            <div className="relative min-h-0 flex-1 overflow-hidden">{body}</div>
          </div>
        </div>
        {spec.colorKeys && <ColorKeys />}
      </div>
    </Ctx.Provider>
  );
}

// ---- focusable primitive (applies the platform's focus tokens) ----------------------------------

function F({ id, children, className, onClick, disabled, reason }: { id: string; children: ReactNode; className?: string; onClick?: () => void; disabled?: boolean; reason?: string }) {
  const { family, isFocused } = useTv();
  const t = TV_FOCUS[family];
  const focused = isFocused(id);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [focused]);
  return (
    <button
      ref={ref}
      tabIndex={-1}
      onClick={onClick}
      aria-current={focused || undefined}
      aria-disabled={disabled || undefined}
      title={reason}
      className={cx('relative shrink-0 text-left', t.base, focused ? t.focused : t.idle, disabled && t.disabled, className)}
    >
      {children}
      {disabled && reason && <span className="absolute top-full left-0 mt-2 text-[16px] font-medium whitespace-nowrap text-muted">{reason}</span>}
    </button>
  );
}

// ---- shell chrome ----------------------------------------------------------------------------------

type MenuItem = FocusItem & { label: string; icon: string };

function TvLogo({ size = 40 }: { size?: number }) {
  return (
    <p className="flex items-center gap-2 font-black tracking-tight" style={{ fontSize: size }}>
      <img src={WSOP_LOGO} alt="WSOP" style={{ height: size * 1.6, width: 'auto' }} />
      <span className="text-gold">TV</span>
    </p>
  );
}

/** Apple TV: horizontal tab bar at the top. */
function TopTabs({ items, active, onClick }: { items: MenuItem[]; active: number; onClick: (i: number) => void }) {
  const { isFocused } = useTv();
  return (
    <nav className="flex h-[132px] shrink-0 items-center justify-center gap-3 px-[96px]">
      <div className="absolute left-[96px]">
        <TvLogo size={34} />
      </div>
      <div className="flex gap-2 rounded-full bg-white/8 p-2 backdrop-blur">
        {items.map((m, i) => {
          const f = isFocused(m.id);
          return (
            <button
              key={m.id}
              tabIndex={-1}
              onClick={() => onClick(i)}
              aria-current={f || undefined}
              className={cx('rounded-full px-8 py-3 text-[26px] font-semibold transition-[transform,background-color,color] duration-300', f ? 'scale-110 bg-white text-ink shadow-xl' : i === active ? 'bg-white/15 text-text' : 'text-muted')}
            >
              {m.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Roku: fixed left menu with square highlights. */
function SideMenu({ items, active, onClick }: { items: MenuItem[]; active: number; onClick: (i: number) => void }) {
  const { isFocused } = useTv();
  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-r-2 border-line bg-surface px-6 py-12">
      <div className="mb-12 px-4">
        <TvLogo size={38} />
      </div>
      {items.map((m, i) => {
        const f = isFocused(m.id);
        return (
          <button
            key={m.id}
            tabIndex={-1}
            onClick={() => onClick(i)}
            aria-current={f || undefined}
            className={cx('mb-2 flex items-center gap-4 rounded-[4px] px-5 py-4 text-[28px] font-semibold', TV_FOCUS.roku.base, f ? 'bg-white/10 shadow-[inset_0_0_0_5px_#ffffff]' : i === active ? 'bg-surface-3 text-text' : 'text-muted')}
          >
            <Icon name={m.icon} size={30} /> {m.label}
          </button>
        );
      })}
    </aside>
  );
}

/** Android TV / Samsung / LG: collapsible rail (icons only until focused). */
function Rail({ items, active, expanded, onClick }: { items: MenuItem[]; active: number; expanded: boolean; onClick: (i: number) => void }) {
  const { isFocused } = useTv();
  return (
    <aside className={cx('flex shrink-0 flex-col overflow-hidden border-r border-line bg-surface/80 py-12 transition-[width] duration-200 ease-out', expanded ? 'w-[340px]' : 'w-[128px]')}>
      <div className={cx('mb-12 flex h-12 items-center', expanded ? 'px-10' : 'justify-center')}>{expanded ? <TvLogo size={34} /> : <BraceletIcon size={44} />}</div>
      {items.map((m, i) => {
        const f = isFocused(m.id);
        return (
          <button
            key={m.id}
            tabIndex={-1}
            onClick={() => onClick(i)}
            aria-current={f || undefined}
            aria-label={m.label}
            className={cx('mx-5 mb-2 flex items-center gap-5 rounded-full py-4 text-[26px] font-semibold whitespace-nowrap transition-colors duration-150', expanded ? 'px-6' : 'justify-center px-0', f ? 'bg-white text-ink' : i === active ? 'text-gold' : 'text-muted')}
          >
            <Icon name={m.icon} size={32} />
            {expanded && m.label}
          </button>
        );
      })}
    </aside>
  );
}

/** Samsung / LG: thin system bar at the top. */
function SystemBar({ label }: { label: string }) {
  const now = useTick(30_000);
  return (
    <div className="flex h-[56px] shrink-0 items-center justify-between bg-black px-10 text-[20px] text-muted">
      <span className="font-semibold">{label.startsWith('LG') ? 'webOS' : 'Tizen'} · Apps › WSOP TV</span>
      <span className="flex items-center gap-6">
        <span>Wi-Fi ▂▄▆</span>
        <span className="tnum">{fmtTime(now, Intl.DateTimeFormat().resolvedOptions().timeZone)}</span>
      </span>
    </div>
  );
}

/** Samsung / LG: colour-key hints along the bottom. */
function ColorKeys() {
  const keys = [
    ['#e5484d', 'A', 'Live'],
    ['#4cc38a', 'B', 'Overlay'],
    ['#f5c518', 'C', 'Hands'],
    ['#3b82f6', 'D', 'Search'],
  ];
  return (
    <div className="flex h-[64px] shrink-0 items-center gap-10 border-t border-line bg-black/80 px-10 text-[20px] text-muted" aria-label="Remote colour buttons">
      {keys.map(([c, k, l]) => (
        <span key={k} className="flex items-center gap-3">
          <span className="flex size-7 items-center justify-center rounded-[6px] text-[14px] font-black text-black" style={{ background: c }}>
            {k}
          </span>
          {l}
        </span>
      ))}
      <span className="ml-auto">◀ ▶ ▲ ▼ Move · OK Select · ↩ Back</span>
    </div>
  );
}

// ---- shared content pieces ------------------------------------------------------------------------

function Art({ hue, aspect, radius, children }: { hue: number; aspect: string; radius: string; children?: ReactNode }) {
  return (
    <div className="stage relative overflow-hidden" style={{ aspectRatio: aspect, borderRadius: radius, ['--stage-a' as string]: `hsl(${hue} 16% 19%)`, ['--stage-b' as string]: `hsl(${hue} 20% 7%)` }}>
      {children}
    </div>
  );
}

function Card({ id, row, col, title, sub, hue, badge }: { id: string; row: number; col: number; title: string; sub: string; hue: number; badge?: ReactNode }) {
  const { spec, click, family } = useTv();
  const poster = spec.card.aspect === '2 / 3';
  return (
    <F id={id} onClick={() => click(row, col)} className={cx(family === 'roku' ? 'rounded-[4px]' : '')}>
      <div style={{ width: spec.card.w }}>
        <Art hue={hue} aspect={spec.card.aspect} radius={spec.card.radius}>
          {badge && <span className="absolute top-4 left-4">{badge}</span>}
          {poster && (
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-5 pt-16">
              <span className="line-clamp-3 block text-[26px] leading-tight font-bold">{title}</span>
            </span>
          )}
        </Art>
        {!poster && <p className="mt-3 line-clamp-1" style={{ fontSize: spec.card.titleSize, fontWeight: 600 }}>{title}</p>}
        <p className={cx('text-[19px] text-muted', poster && 'mt-3')}>{sub}</p>
      </div>
    </F>
  );
}

function Row({ title, hint, active, children }: { title: string; hint?: string; active: boolean; children: ReactNode }) {
  const { family } = useTv();
  return (
    <section className={family === 'roku' ? 'mb-8' : 'mb-10'}>
      <h2 className={cx('mb-4 flex items-baseline gap-5 font-bold transition-colors duration-200', family === 'roku' ? 'text-[28px]' : 'text-[32px]', active ? 'text-text' : 'text-muted')}>
        {title}
        {hint && active && <span className="text-[20px] font-medium text-subtle">{hint}</span>}
      </h2>
      <div className={cx('-mx-8 flex overflow-hidden px-8', family === 'roku' ? 'gap-5 py-3' : family === 'apple' ? 'gap-10 pt-6 pb-10' : 'gap-7 py-5')}>{children}</div>
    </section>
  );
}

function PrimaryButton({ id, row, col, children, secondary }: { id: string; row: number; col: number; children: ReactNode; secondary?: boolean }) {
  const { click, family } = useTv();
  return (
    <F
      id={id}
      onClick={() => click(row, col)}
      className={cx('flex items-center gap-3 px-10 py-5 text-[28px] font-bold', family === 'roku' ? 'rounded-[4px]' : family === 'apple' ? 'rounded-[18px]' : 'rounded-full', secondary ? 'bg-surface-3 text-text' : 'bg-gold text-ink')}
    >
      {children}
    </F>
  );
}

// ---- screens ------------------------------------------------------------------------------------

function TvHome({ rows, focusedRow }: { rows: HomeRow[]; focusedRow: number }) {
  const { state } = useApp();
  const { spec } = useTv();
  const hero = dayById(HERO_DAY_ID)!;
  return (
    <div className="h-full overflow-hidden pt-6 pb-16" style={{ paddingLeft: spec.contentPad, paddingRight: spec.contentPad }}>
      <section className={cx('mb-10 transition-opacity duration-200', focusedRow > 1 && 'opacity-60')}>
        <div className="flex items-center gap-4">
          <StatusBadge status={state.streamMode} />
          <span className="label flex items-center gap-2 text-[18px] text-gold">
            <BraceletIcon size={22} /> Event #{hero.event.number}
          </span>
        </div>
        <h1 className="mt-5 text-[68px] leading-[1.02] font-black tracking-tight">
          {hero.event.name}
          <span className="block text-muted">{hero.day.label}</span>
        </h1>
        <p className="mt-3 text-[24px] text-muted tnum">
          {hero.event.remaining} players left · Level {hero.event.level} · First prize {money(hero.event.firstPrize)}
        </p>
        <div className="mt-7 flex gap-5">
          <PrimaryButton id="hero-watch" row={0} col={0}>
            <Icon name="play" size={30} /> Watch now
          </PrimaryButton>
          <PrimaryButton id="hero-event" row={0} col={1} secondary>
            Event details
          </PrimaryButton>
        </div>
      </section>
      {rows.map((r, ri) => (
        <Row key={r.id} title={r.title} hint={r.hint} active={focusedRow === ri + 1}>
          {r.cards.map((c, i) => (
            <Card key={c.id} id={c.id} row={ri + 1} col={i} title={c.title} sub={c.sub} hue={c.hue} badge={c.badge} />
          ))}
        </Row>
      ))}
    </div>
  );
}

function TvEvent({ eventId, inList }: { eventId: string; inList: boolean }) {
  const { state } = useApp();
  const { spec, family, click } = useTv();
  const e = eventById(eventId)!;
  return (
    <div className="h-full overflow-hidden pt-8" style={{ paddingLeft: spec.contentPad, paddingRight: spec.contentPad }}>
      <p className="label flex items-center gap-3 text-[20px] text-gold">
        <BraceletIcon size={26} /> Event #{e.number}
      </p>
      <h1 className="mt-4 text-[64px] leading-[1.05] font-black tracking-tight">{e.name}</h1>
      <dl className="mt-8 grid max-w-[1200px] grid-cols-4 gap-8">
        {[
          ['Entrants', e.entrants.toLocaleString()],
          ['Prize pool', money(e.prizePool)],
          ['Level', String(e.level)],
          ['Players left', String(e.remaining)],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="label text-[16px] text-subtle">{k}</dt>
            <dd className="mt-2 text-[40px] font-black tnum">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-10 flex gap-5">
        <PrimaryButton id="ev-watch" row={0} col={0}>
          <Icon name="play" size={30} /> Watch {e.days[e.days.length - 1].label}
        </PrimaryButton>
        <PrimaryButton id="ev-list" row={0} col={1} secondary>
          <Icon name={inList ? 'check' : 'plus'} size={30} /> {inList ? 'In My List' : 'My List'}
        </PrimaryButton>
        <PrimaryButton id="ev-back" row={0} col={2} secondary>
          Back
        </PrimaryButton>
      </div>
      <h2 className="mt-12 mb-4 text-[32px] font-bold">Days</h2>
      <div className="-mx-8 flex gap-6 overflow-hidden px-8 py-5">
        {e.days.map((d, i) => (
          <F key={d.id} id={`day-${d.id}`} onClick={() => click(1, i)} className={cx('w-[320px] bg-surface p-6', family === 'roku' ? 'rounded-[4px]' : family === 'apple' ? 'rounded-[22px]' : 'rounded-[14px]')}>
            <StatusBadge status={d.id === HERO_DAY_ID ? state.streamMode : d.status} />
            <p className="mt-4 text-[32px] font-bold">{d.label}</p>
            <p className="text-[20px] text-muted">{fmtDateTime(d.start, state.tz)}</p>
          </F>
        ))}
      </div>
    </div>
  );
}

function TvPlayer({ dayId, platform, overlay, views, playing, handIdx, scrub }: { dayId: string; platform: Platform; overlay: OverlayLevel; views: 1 | 2 | 4; playing: boolean; handIdx: number | null; scrub: number }) {
  const { state } = useApp();
  const { spec, label, click, family } = useTv();
  const seatBase = useMemo(() => seatsFor(dayId), [dayId]);
  const hand = useMemo(() => handFor(dayId), [dayId]);
  const now = useTick(1000);
  const { event, day } = dayById(dayId)!;
  const status = dayId === HERO_DAY_ID ? state.streamMode : day.status;
  const stacks = useLiveStacks(seatBase, isOnAir(status));
  const caps = PLATFORMS[platform];
  const dayHands = hands.filter((h) => h.dayId === dayId);
  const current = handIdx === null ? null : dayHands[handIdx];
  const gate = gateFor(state.scenario);
  const shape = family === 'roku' ? 'rounded-[4px]' : family === 'apple' ? 'rounded-[16px]' : 'rounded-full';

  if (gate !== 'ok') {
    return (
      <div className="stage flex size-full flex-col items-center justify-center gap-8 text-center">
        <p className="label text-[22px] text-gold">{gate === 'login' ? 'Sign in to watch' : 'Account action needed'}</p>
        <h1 className="max-w-[1200px] text-[60px] font-black">{gate === 'login' ? 'Activate this TV with GGPASS' : 'Finish setup on your phone or the web'}</h1>
        <div className="flex gap-5">
          <PrimaryButton id="gate-signin" row={0} col={0}>
            {gate === 'login' ? 'Sign in' : 'Continue (demo)'}
          </PrimaryButton>
          <PrimaryButton id="gate-back" row={0} col={1} secondary>
            Back
          </PrimaryButton>
        </div>
      </div>
    );
  }

  const ctl = [
    { id: 'p-play', label: playing ? 'Pause' : 'Play', icon: playing ? 'pause' : 'play' },
    { id: 'p-prev', label: 'Previous hand', icon: 'prev' },
    { id: 'p-next', label: 'Next hand', icon: 'next' },
    { id: 'p-live', label: status === 'vod' ? 'Restart' : 'Jump to Live', icon: 'fwd10' },
    { id: 'p-back', label: 'Back', icon: 'back' },
  ];
  const pill = (selected?: boolean) => cx('flex items-center gap-3 px-6 py-3 text-[22px] font-semibold', shape, selected ? 'bg-white text-ink' : 'bg-white/10');

  return (
    <div className="relative size-full">
      <div className={cx('grid size-full gap-1 bg-black', views === 2 && 'grid-cols-2', views === 4 && 'grid-cols-2 grid-rows-2')}>
        {day.tables
          .concat(day.tables)
          .slice(0, views)
          .map((t, i) => (
            <Stage key={`${t.id}-${i}`} hand={hand} overlay={overlay} tableName={t.name} seats={stacks} playing={playing} phase={Math.floor(now / 6000) % 3} compact={views > 1} hue={220 + i * 25} />
          ))}
      </div>
      <div className="absolute top-10 left-[80px] flex items-center gap-5">
        <StatusBadge status={status} />
        <p className="text-[28px] font-bold drop-shadow">
          {event.name} · {day.label}
        </p>
      </div>
      {current && (
        <div className={cx('absolute top-28 left-[80px] bg-black/75 px-6 py-4', shape === 'rounded-full' ? 'rounded-[18px]' : shape)}>
          <p className="label flex items-center gap-3 text-[18px] text-gold">
            <HandGlyph type={current.type} size={24} /> {HAND_META[current.type].label}
          </p>
          <p className="mt-2 text-[26px] font-semibold">{current.title}</p>
          <p className="text-[20px] text-muted">{current.playerIds.map((id) => playerById(id).name).join(' vs ')}</p>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 space-y-5 bg-gradient-to-t from-black via-black/85 to-transparent px-[80px] pt-28 pb-10">
        {/* row 0: transport */}
        <div className="flex gap-4">
          {ctl.map((c, i) => (
            <F key={c.id} id={c.id} onClick={() => click(0, i)} className={pill()}>
              <Icon name={c.icon} size={26} /> {c.label}
            </F>
          ))}
        </div>

        {/* row 1: timeline — hand markers, or Roku's simple trick-play bar */}
        {spec.timeline === 'trickplay' ? (
          <div>
            <div className="mb-3 flex gap-3">
              {Array.from({ length: 10 }, (_, i) => (
                <F key={i} id={`tp-${i}`} onClick={() => click(1, i)} className="rounded-[4px]">
                  <div className="stage h-[72px] w-[128px] rounded-[4px]" style={{ ['--stage-a' as string]: `hsl(${215 + i * 4} 14% ${16 + (i === scrub ? 8 : 0)}%)` }}>
                    <span className="absolute bottom-1 left-2 text-[14px] text-white/70 tnum">{duration(((i + 1) / 10) * day.durationMin * 60 * 0.4)}</span>
                  </div>
                </F>
              ))}
            </div>
            <div className="h-2 rounded-[2px] bg-white/20">
              <div className="h-full rounded-[2px] bg-live" style={{ width: `${((scrub + 1) / 10) * 100}%` }} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <span className="label text-[16px] text-subtle">Hands</span>
            <div className="flex gap-3 overflow-hidden p-2">
              {dayHands.map((h, i) => (
                <F key={h.id} id={`mk-${h.id}`} onClick={() => click(1, i)} className={cx('flex items-center gap-2 px-4 py-2 text-[18px] font-semibold', shape, handIdx === i ? 'bg-gold-dim' : 'bg-white/10')}>
                  <HandGlyph type={h.type} size={22} /> {duration(h.t)}
                </F>
              ))}
            </div>
          </div>
        )}

        {/* rows 2–3: overlay level and multiview — unsupported options stay visible, disabled with a reason */}
        <div className="flex flex-wrap items-start gap-x-12 gap-y-4 pb-8">
          <div className="flex items-start gap-3">
            <span className="label mt-4 w-28 text-[16px] text-subtle">Overlay</span>
            {(['off', 'basic', 'pro'] as OverlayLevel[]).map((l, i) => {
              const ok = overlayAllowed(platform, l);
              return (
                <F key={l} id={`ov-${l}`} onClick={() => click(2, i)} disabled={!ok} reason={ok ? undefined : notAvailable(label)} className={pill(overlay === l)}>
                  {l === 'off' ? 'Off' : l === 'basic' ? 'Basic' : 'Pro'}
                </F>
              );
            })}
          </div>
          <div className="flex items-start gap-3">
            <span className="label mt-4 w-32 text-[16px] text-subtle">Multiview</span>
            {caps.multiview === 1 ? (
              <F id="mv-na" disabled reason={notAvailable(label)} className={pill()}>
                <Icon name="grid4" size={24} /> Multiview
              </F>
            ) : (
              ([1, 2, 4] as const).map((v, i) => (
                <F key={v} id={`mv-${v}`} onClick={() => click(3, i)} disabled={v > caps.multiview} reason={v > caps.multiview ? notAvailable(label) : undefined} className={pill(views === v)}>
                  <Icon name={v === 1 ? 'grid1' : v === 2 ? 'grid2' : 'grid4'} size={24} /> {v}
                </F>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TvLogin({ onDone }: { onDone: () => void }) {
  const { set, toast } = useApp();
  const { family } = useTv();
  const [authorized, setAuthorized] = useState(false);
  const code = '482 951';
  useEffect(() => {
    const a = window.setTimeout(() => {
      setAuthorized(true);
      set((s) => ({ scenario: s.scenario === 'guest' || s.scenario === 'noSub' ? 'active' : s.scenario }));
      toast('TV authorized with GGPASS (demo)');
    }, 5000);
    const b = window.setTimeout(onDone, 6800);
    return () => (window.clearTimeout(a), window.clearTimeout(b));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex size-full items-center justify-center gap-[120px] px-[120px]">
      <div className="max-w-[820px]">
        <TvLogo size={46} />
        <h1 className="mt-8 text-[58px] leading-tight font-black">Sign in with GGPASS</h1>
        <ol className="mt-8 space-y-5 text-[30px] text-muted">
          <li>
            1. Go to <b className="text-text">ggpass.example/activate</b> on your phone
          </li>
          <li>2. Enter this code</li>
        </ol>
        <p className="mt-6 text-[104px] font-black tracking-[0.12em] text-gold tnum" aria-label={`Activation code ${code}`}>
          {code}
        </p>
        <p className={cx('mt-6 flex items-center gap-4 text-[30px] font-semibold', authorized ? 'text-ok' : 'text-muted')} role="status">
          {authorized ? (
            <>
              <Icon name="check" size={36} /> Authorized — welcome back
            </>
          ) : (
            <>
              <span className="size-7 animate-spin rounded-full border-4 border-muted border-t-transparent" aria-hidden /> Waiting for confirmation…
            </>
          )}
        </p>
        <div className="mt-10">
          <PrimaryButton id="login-back" row={0} col={0} secondary>
            Back
          </PrimaryButton>
        </div>
      </div>
      <div className="flex flex-col items-center gap-5">
        <div className={family === 'roku' ? 'rounded-[4px] bg-white p-1' : ''}>
          <QrMock />
        </div>
        <p className="text-[24px] text-muted">Or scan with your phone camera</p>
      </div>
    </div>
  );
}

/** Options sheet for a Continue Watching card. */
function TvOptions({ dayId }: { dayId: string }) {
  const { family } = useTv();
  const ref = dayById(dayId);
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75">
      <div className={cx('w-[760px] bg-surface p-12', family === 'roku' ? 'rounded-[4px]' : 'rounded-[28px]')}>
        <p className="label text-[18px] text-gold">Options</p>
        <p className="mt-3 text-[40px] leading-tight font-black">
          {ref?.event.name} <span className="text-muted">· {ref?.day.label}</span>
        </p>
        <div className="mt-10 flex flex-col gap-4">
          <PrimaryButton id="opt-remove" row={0} col={0}>
            <Icon name="close" size={30} /> Remove from Continue Watching
          </PrimaryButton>
          <PrimaryButton id="opt-cancel" row={0} col={1} secondary>
            Cancel
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/** Search with an on-screen keyboard (remote-friendly) and a results row. */
function TvSearch({ query, results, focusedRow }: { query: string; results: SearchItem[]; focusedRow: number }) {
  const { state } = useApp();
  const { spec, click, family } = useTv();
  const keys = ['abcdefghi', 'jklmnopqr', 'stuvwxyz0'];
  const keyShape = family === 'roku' ? 'rounded-[4px]' : family === 'apple' ? 'rounded-[14px]' : 'rounded-[10px]';
  const showRecent = !query.trim() && !results.length && state.recentSearches.length > 0;
  return (
    <div className="flex h-full gap-16 overflow-hidden pt-8" style={{ paddingLeft: spec.contentPad, paddingRight: spec.contentPad }}>
      <div className="w-[640px] shrink-0">
        <div className={cx('flex h-[88px] items-center gap-4 border-2 border-line-strong bg-surface px-6 text-[34px]', keyShape)} aria-live="polite">
          <Icon name="search" size={34} className="text-muted" />
          {query ? <span className="font-semibold">{query}</span> : <span className="text-subtle">Search</span>}
          <span className="h-10 w-[3px] animate-pulse bg-gold" aria-hidden />
        </div>
        <div className="mt-8 space-y-3">
          {keys.map((r, ri) => (
            <div key={r} className="flex gap-3">
              {r.split('').map((ch, ci) => (
                <F key={ch} id={`k-${ch}`} onClick={() => click(ri, ci)} className={cx('flex size-[60px] items-center justify-center bg-white/10 text-[28px] font-semibold uppercase', keyShape)}>
                  {ch}
                </F>
              ))}
            </div>
          ))}
          <div className="flex gap-3">
            {[
              ['k-space', 'Space', 'w-[250px]'],
              ['k-del', 'Delete', 'w-[180px]'],
              ['k-clear', 'Clear', 'w-[170px]'],
            ].map(([id, label, w], ci) => (
              <F key={id} id={id} onClick={() => click(3, ci)} className={cx('flex h-[60px] items-center justify-center bg-white/10 text-[24px] font-semibold', w, keyShape)}>
                {label}
              </F>
            ))}
          </div>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <h2 className={cx('mb-5 text-[30px] font-bold', focusedRow === 4 ? 'text-text' : 'text-muted')}>{showRecent ? 'Recent searches' : query.trim() ? `Results · ${results.length}` : 'Type to search'}</h2>
        <div className="-mx-6 flex gap-5 overflow-hidden px-6 py-4">
          {showRecent
            ? state.recentSearches.map((r, i) => (
                <F key={r} id={`rs-${r}`} onClick={() => click(4, i)} className={cx('bg-white/10 px-7 py-4 text-[24px] font-semibold', keyShape)}>
                  {r}
                </F>
              ))
            : results.length
              ? results.map((r, i) => (
                  <F key={r.kind + r.id} id={`sr-${r.kind}-${r.id}`} onClick={() => click(4, i)} className={cx('w-[330px] overflow-hidden bg-surface', keyShape)}>
                    <div className="aspect-video bg-surface-3">{r.image && <img src={r.image} alt="" className="size-full object-cover" />}</div>
                    <div className="p-4">
                      <p className="label text-[14px] text-subtle">{KIND_LABEL[r.kind]}</p>
                      <p className="line-clamp-1 text-[22px] font-semibold">{r.title}</p>
                      <p className="line-clamp-1 text-[17px] text-muted">{r.sub}</p>
                    </div>
                  </F>
                ))
              : query.trim() && (
                  <F id="sr-none" disabled className={cx('bg-white/5 px-7 py-5 text-[24px] text-muted', keyShape)}>
                    No results for “{query}”
                  </F>
                )}
        </div>
      </div>
    </div>
  );
}
