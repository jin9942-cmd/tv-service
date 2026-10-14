// TV Preview: a 1920×1080 "10-foot" UI rendered inside a TV frame and scaled to fit.
// Navigation is focus-based (keyboard arrows / Enter / Backspace act as the remote's D-pad / OK / Back).
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { OverlayLevel, Platform } from '../../data/types';
import { HERO_DAY_ID, archive, dayById, eventById, events, hands, playerById } from '../../data/mock';
import { PLATFORMS, TV_PLATFORMS, overlayAllowed } from '../../data/platforms';
import { chips, duration, money } from '../../lib/format';
import { fmtDateTime } from '../../lib/time';
import { gateFor, useApp, useTick } from '../../state/app';
import { useLiveStacks } from '../../state/stacks';
import { BraceletIcon, Icon, StatusBadge, cx } from '../../components/ui';
import { Stage } from '../player/Stage';
import { HAND_META, HandGlyph } from '../player/markers';
import { useRemoteFocus, type FocusModel } from './focus';

type Screen = { name: 'home' } | { name: 'event'; eventId: string } | { name: 'player'; dayId: string } | { name: 'login'; after?: Screen };

export function TvPreview() {
  const { state, set } = useApp();
  const [safe, setSafe] = useState(true);
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  // Opening the preview switches to a TV platform (kept in sync with Demo Controls).
  useEffect(() => {
    if (PLATFORMS[state.platform].kind !== 'tv') set({ platform: 'appletv' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 1920));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && set({ tvPreview: false });
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [set]);

  const platform = PLATFORMS[state.platform].kind === 'tv' ? state.platform : 'appletv';

  return (
    <div className="fixed inset-0 z-[55] overflow-y-auto bg-black/95" role="dialog" aria-modal="true" aria-label="TV preview">
      <div className="mx-auto flex max-w-[110rem] flex-col gap-4 p-4 lg:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="label flex items-center gap-2 text-gold">
            <Icon name="tv" size={16} /> TV Preview
          </p>
          <label className="flex items-center gap-2 text-sm text-muted">
            Platform
            <select data-tv-ignore value={platform} onChange={(e) => set({ platform: e.target.value as Platform })} className="h-9 rounded-chip border border-line-strong bg-surface px-2 text-sm text-text">
              {TV_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORMS[p].label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" data-tv-ignore checked={safe} onChange={(e) => setSafe(e.target.checked)} className="accent-[var(--color-gold)]" /> Show overscan safe area (5%)
          </label>
          <p className="hidden text-xs text-subtle lg:block">Remote: ← ↑ → ↓ move · Enter = OK · Backspace = Back · Esc closes preview</p>
          <button onClick={() => set({ tvPreview: false })} className="ml-auto inline-flex h-9 items-center gap-2 rounded-chip border border-line-strong px-3 text-sm font-semibold hover:border-gold">
            <Icon name="close" size={16} /> Close
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          {/* TV bezel */}
          <div className="rounded-[18px] bg-[#050506] p-3 shadow-2xl ring-1 ring-white/10">
            <div ref={frame} className="relative aspect-video overflow-hidden rounded-[6px] bg-bg">
              <div className="absolute top-0 left-0 origin-top-left" style={{ width: 1920, height: 1080, transform: `scale(${scale})` }}>
                <TvApp platform={platform} />
                {safe && <div className="pointer-events-none absolute inset-[5%] rounded-sm border-2 border-dashed border-gold/40" aria-hidden />}
              </div>
            </div>
            <div className="mx-auto mt-2 h-1.5 w-24 rounded-full bg-white/10" aria-hidden />
          </div>
          <ParityPanel platform={platform} />
        </div>
      </div>
    </div>
  );
}

// ---- TV app -------------------------------------------------------------------------------------

function TvApp({ platform }: { platform: Platform }) {
  const { state, set } = useApp();
  const [stack, setStack] = useState<Screen[]>([{ name: 'home' }]);
  const screen = stack[stack.length - 1];
  const push = (s: Screen) => setStack((x) => [...x, s]);
  const back = () => setStack((x) => (x.length > 1 ? x.slice(0, -1) : x));
  const replace = (s: Screen) => setStack((x) => [...x.slice(0, -1), s]);
  const signedIn = state.scenario !== 'guest';

  const liveDays = events.flatMap((e) => e.days.filter((d) => d.status === 'live' || d.status === 'delayed').map((d) => ({ e, d })));
  const trending = [...hands].sort((a, b) => b.views - a.views).slice(0, 8);
  const hero = dayById(HERO_DAY_ID)!;

  const menu = [
    { id: 'm-home', label: 'Home', icon: 'star', onSelect: () => setStack([{ name: 'home' }]) },
    { id: 'm-live', label: 'Live', icon: 'play', onSelect: () => setStack([{ name: 'home' }]) },
    { id: 'm-events', label: 'Events', icon: 'layers', onSelect: () => push({ name: 'event', eventId: 'lv-main' }) },
    { id: 'm-account', label: signedIn ? 'Account' : 'Sign in', icon: 'user', onSelect: () => (signedIn ? undefined : push({ name: 'login' })) },
  ];

  const openDay = (dayId: string) => push({ name: 'player', dayId });

  // Player state lives here so the focus model can reference it.
  const caps = PLATFORMS[platform];
  const [overlay, setOverlay] = useState<OverlayLevel>('basic');
  const [views, setViews] = useState<1 | 2 | 4>(1);
  const [playing, setPlaying] = useState(true);
  const [seekTo, setSeekTo] = useState<number | null>(null);
  useEffect(() => {
    if (!overlayAllowed(platform, overlay)) setOverlay(caps.overlayMax);
    if (views > caps.multiview) setViews(caps.multiview);
  }, [platform, caps, overlay, views]);
  const levels = (['off', 'basic', 'pro'] as OverlayLevel[]).filter((l) => overlayAllowed(platform, l));
  const viewOpts = ([1, 2, 4] as const).filter((v) => v <= caps.multiview);

  const model: FocusModel = useMemo(() => {
    if (screen.name === 'home')
      return {
        menu,
        rows: [
          {
            id: 'hero',
            items: [
              { id: 'hero-watch', onSelect: () => openDay(HERO_DAY_ID) },
              { id: 'hero-event', onSelect: () => push({ name: 'event', eventId: 'lv-main' }) },
            ],
          },
          { id: 'live', items: liveDays.map(({ d }) => ({ id: `live-${d.id}`, onSelect: () => openDay(d.id) })) },
          { id: 'hands', items: trending.map((h) => ({ id: `hand-${h.id}`, onSelect: () => openDay(h.dayId) })) },
          { id: 'archive', items: archive.map((a) => ({ id: `arc-${a.id}`, onSelect: () => openDay('lv-main-day3') })) },
        ],
      };
    if (screen.name === 'event') {
      const e = eventById(screen.eventId)!;
      return {
        menu,
        onBack: back,
        rows: [
          { id: 'ev-actions', items: [{ id: 'ev-watch', onSelect: () => openDay(e.days[e.days.length - 1].id) }, { id: 'ev-back', onSelect: back }] },
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
      return {
        onBack: back,
        rows: [
          {
            id: 'ctl',
            items: [
              { id: 'p-play', onSelect: () => setPlaying((p) => !p) },
              { id: 'p-prev', onSelect: () => setSeekTo((t) => Math.max(0, (t ?? 0) - 1)) },
              { id: 'p-next', onSelect: () => setSeekTo((t) => Math.min(dayHands.length - 1, (t ?? -1) + 1)) },
              { id: 'p-live', onSelect: () => setSeekTo(null) },
              { id: 'p-overlay', onSelect: () => setOverlay((o) => levels[(levels.indexOf(o) + 1) % levels.length]) },
              { id: 'p-multi', disabled: viewOpts.length < 2, onSelect: () => setViews((v) => viewOpts[(viewOpts.indexOf(v as 1) + 1) % viewOpts.length]) },
              { id: 'p-back', onSelect: back },
            ],
          },
          { id: 'markers', items: dayHands.map((h, i) => ({ id: `mk-${h.id}`, onSelect: () => setSeekTo(i) })) },
        ],
      };
    }
    return { onBack: back, rows: [{ id: 'login', items: [{ id: 'login-back', onSelect: back }] }] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, signedIn, state.scenario, platform, levels.join(), viewOpts.join()]);

  const screenKey = JSON.stringify(screen);
  const { isFocused, focusedRow, setPos } = useRemoteFocus(model, screenKey);
  // Mouse/touch is optional: a click focuses the item and runs the same action as OK.
  const click = (row: number, col: number, fn?: () => void) => {
    setPos({ zone: 'content', row, col });
    const item = model.rows[row]?.items[col];
    if (!item?.disabled) (fn ?? item?.onSelect)?.();
  };

  return (
    <div className="flex size-full bg-bg text-text">
      {screen.name !== 'player' && screen.name !== 'login' && (
        <aside className="flex w-[300px] shrink-0 flex-col gap-3 border-r border-line bg-surface px-8 py-16">
          <p className="mb-8 text-[44px] font-black tracking-tight">
            WSOP <span className="text-gold">TV</span>
          </p>
          {menu.map((m, i) => (
            <TvFocusable key={m.id} focused={isFocused(m.id)} onClick={() => (setPos({ zone: 'menu', index: i }), m.onSelect())} className="flex items-center gap-4 rounded-[14px] px-5 py-4 text-[28px] font-semibold">
              <Icon name={m.icon} size={30} /> {m.label}
            </TvFocusable>
          ))}
          <p className="mt-auto text-[18px] text-subtle">{PLATFORMS[platform].label}</p>
        </aside>
      )}

      <div className="relative min-w-0 flex-1 overflow-hidden">
        {screen.name === 'home' && (
          <div className="h-full overflow-hidden px-[96px] py-[64px]">
            {/* hero */}
            <section className={cx('mb-12 transition-opacity duration-200', focusedRow > 1 && 'opacity-60')}>
              <div className="flex items-center gap-4">
                <StatusBadge status={state.streamMode} />
                <span className="label flex items-center gap-2 text-[18px] text-gold">
                  <BraceletIcon size={22} /> Event #{hero.event.number}
                </span>
              </div>
              <h1 className="mt-5 text-[76px] leading-[1.02] font-black tracking-tight">
                {hero.event.name}
                <span className="block text-muted">{hero.day.label}</span>
              </h1>
              <p className="mt-4 text-[26px] text-muted tnum">
                {hero.event.remaining} players left · Level {hero.event.level} · First prize {money(hero.event.firstPrize)}
              </p>
              <div className="mt-8 flex gap-5">
                <TvFocusable focused={isFocused('hero-watch')} onClick={() => click(0, 0, () => openDay(HERO_DAY_ID))} className="flex items-center gap-3 rounded-[14px] bg-gold px-10 py-5 text-[28px] font-bold text-ink">
                  <Icon name="play" size={30} /> Watch now
                </TvFocusable>
                <TvFocusable focused={isFocused('hero-event')} onClick={() => click(0, 1, () => push({ name: 'event', eventId: 'lv-main' }))} className="rounded-[14px] bg-surface-3 px-10 py-5 text-[28px] font-bold">
                  Event details
                </TvFocusable>
              </div>
            </section>
            <TvRow title="Live now" active={focusedRow === 1}>
              {liveDays.map(({ e, d }, i) => (
                <TvCard key={d.id} focused={isFocused(`live-${d.id}`)} onClick={() => click(1, i, () => openDay(d.id))} title={`${e.name}`} sub={d.label} badge={<StatusBadge status={d.id === HERO_DAY_ID ? state.streamMode : d.status} />} hue={220 + i * 20} />
              ))}
            </TvRow>
            <TvRow title="Trending hands" active={focusedRow === 2}>
              {trending.map((h, i) => (
                <TvCard key={h.id} focused={isFocused(`hand-${h.id}`)} onClick={() => click(2, i, () => openDay(h.dayId))} title={h.title} sub={`${HAND_META[h.type].label} · Pot ${chips(h.pot)}`} badge={<HandGlyph type={h.type} size={28} />} hue={210 + i * 9} />
              ))}
            </TvRow>
            <TvRow title="Archive classics" active={focusedRow === 3}>
              {archive.map((a, i) => (
                <TvCard key={a.id} focused={isFocused(`arc-${a.id}`)} onClick={() => click(3, i, () => openDay('lv-main-day3'))} title={`${a.year} ${a.title}`} sub={duration(a.durationSec)} hue={a.hue} />
              ))}
            </TvRow>
          </div>
        )}

        {screen.name === 'event' && <TvEvent eventId={screen.eventId} isFocused={isFocused} click={click} openDay={openDay} back={back} />}
        {screen.name === 'player' && (
          <TvPlayer dayId={screen.dayId} platform={platform} isFocused={isFocused} click={click} overlay={overlay} views={views} playing={playing} seekTo={seekTo} focusedRow={focusedRow} />
        )}
        {screen.name === 'login' && <TvLogin isFocused={isFocused} onDone={() => (screen.after ? replace(screen.after) : back())} back={back} />}
      </div>
    </div>
  );
}

function TvFocusable({ focused, children, className, onClick, disabled }: { focused: boolean; children: ReactNode; className?: string; onClick?: () => void; disabled?: boolean }) {
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
      disabled={disabled}
      className={cx('shrink-0 text-left transition-[transform,box-shadow,background-color] duration-200 ease-out', focused ? 'z-10 scale-[1.06] shadow-[var(--tv-focus-ring)]' : 'scale-100', disabled && 'opacity-40', className)}
    >
      {children}
    </button>
  );
}

function TvRow({ title, active, children }: { title: string; active: boolean; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className={cx('mb-5 text-[32px] font-bold transition-colors duration-200', active ? 'text-text' : 'text-muted')}>{title}</h2>
      <div className="-mx-6 flex gap-7 overflow-hidden px-6 py-4">{children}</div>
    </section>
  );
}

function TvCard({ focused, title, sub, badge, hue, onClick }: { focused: boolean; title: string; sub: string; badge?: ReactNode; hue: number; onClick: () => void }) {
  return (
    <TvFocusable focused={focused} onClick={onClick} className="w-[400px] rounded-[16px]">
      <div className="stage relative aspect-video rounded-[16px]" style={{ ['--stage-a' as string]: `hsl(${hue} 16% 18%)`, ['--stage-b' as string]: `hsl(${hue} 20% 7%)` }}>
        {badge && <span className="absolute top-4 left-4">{badge}</span>}
      </div>
      <p className="mt-4 line-clamp-1 text-[26px] font-semibold">{title}</p>
      <p className="text-[20px] text-muted">{sub}</p>
    </TvFocusable>
  );
}

function TvEvent({ eventId, isFocused, click, openDay, back }: { eventId: string; isFocused: (id: string) => boolean; click: (r: number, c: number, fn?: () => void) => void; openDay: (id: string) => void; back: () => void }) {
  const { state } = useApp();
  const e = eventById(eventId)!;
  return (
    <div className="h-full overflow-hidden px-[96px] py-[72px]">
      <p className="label flex items-center gap-3 text-[20px] text-gold">
        <BraceletIcon size={26} /> Event #{e.number}
      </p>
      <h1 className="mt-4 text-[68px] leading-[1.05] font-black tracking-tight">{e.name}</h1>
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
        <TvFocusable focused={isFocused('ev-watch')} onClick={() => click(0, 0, () => openDay(e.days[e.days.length - 1].id))} className="flex items-center gap-3 rounded-[14px] bg-gold px-10 py-5 text-[28px] font-bold text-ink">
          <Icon name="play" size={30} /> Watch {e.days[e.days.length - 1].label}
        </TvFocusable>
        <TvFocusable focused={isFocused('ev-back')} onClick={() => click(0, 1, back)} className="rounded-[14px] bg-surface-3 px-10 py-5 text-[28px] font-bold">
          Back
        </TvFocusable>
      </div>
      <h2 className="mt-14 mb-5 text-[32px] font-bold">Days</h2>
      <div className="-mx-6 flex gap-6 overflow-hidden px-6 py-4">
        {e.days.map((d, i) => (
          <TvFocusable key={d.id} focused={isFocused(`day-${d.id}`)} onClick={() => click(1, i, () => openDay(d.id))} className="w-[320px] rounded-[16px] bg-surface p-6">
            <StatusBadge status={d.id === HERO_DAY_ID ? state.streamMode : d.status} />
            <p className="mt-4 text-[32px] font-bold">{d.label}</p>
            <p className="text-[20px] text-muted">{fmtDateTime(d.start, state.tz)}</p>
          </TvFocusable>
        ))}
      </div>
    </div>
  );
}

function TvPlayer({
  dayId,
  platform,
  isFocused,
  click,
  overlay,
  views,
  playing,
  seekTo,
  focusedRow,
}: {
  dayId: string;
  platform: Platform;
  isFocused: (id: string) => boolean;
  click: (r: number, c: number, fn?: () => void) => void;
  overlay: OverlayLevel;
  views: 1 | 2 | 4;
  playing: boolean;
  seekTo: number | null;
  focusedRow: number;
}) {
  const { state } = useApp();
  const stacks = useLiveStacks();
  const now = useTick(1000);
  const { event, day } = dayById(dayId)!;
  const status = dayId === HERO_DAY_ID ? state.streamMode : day.status;
  const caps = PLATFORMS[platform];
  const dayHands = hands.filter((h) => h.dayId === dayId);
  const current = seekTo === null ? null : dayHands[seekTo];
  const gate = gateFor(state.scenario);

  if (gate !== 'ok') {
    return (
      <div className="stage flex size-full flex-col items-center justify-center gap-8 text-center">
        <p className="label text-[22px] text-gold">{gate === 'login' ? 'Sign in to watch' : 'Account action needed'}</p>
        <h1 className="max-w-[1200px] text-[60px] font-black">{gate === 'login' ? 'Activate this TV with GGPASS' : 'Finish setup on your phone or the web'}</h1>
        <div className="flex gap-5">
          <TvFocusable focused={isFocused('gate-signin')} onClick={() => click(0, 0)} className="rounded-[14px] bg-gold px-10 py-5 text-[28px] font-bold text-ink">
            {gate === 'login' ? 'Sign in' : 'Continue (demo)'}
          </TvFocusable>
          <TvFocusable focused={isFocused('gate-back')} onClick={() => click(0, 1)} className="rounded-[14px] bg-surface-3 px-10 py-5 text-[28px] font-bold">
            Back
          </TvFocusable>
        </div>
      </div>
    );
  }

  const ctl = [
    { id: 'p-play', label: playing ? 'Pause' : 'Play', icon: playing ? 'pause' : 'play' },
    { id: 'p-prev', label: 'Previous hand', icon: 'prev' },
    { id: 'p-next', label: 'Next hand', icon: 'next' },
    { id: 'p-live', label: status === 'vod' ? 'Restart' : 'Jump to Live', icon: 'fwd10' },
    { id: 'p-overlay', label: `Overlay: ${overlay === 'off' ? 'Off' : overlay === 'basic' ? 'Basic' : 'Pro'}`, icon: 'layers' },
    { id: 'p-multi', label: caps.multiview > 1 ? `Multiview: ${views}` : 'Multiview n/a', icon: views === 4 ? 'grid4' : views === 2 ? 'grid2' : 'grid1' },
    { id: 'p-back', label: 'Back', icon: 'back' },
  ];

  return (
    <div className="relative size-full">
      <div className={cx('grid size-full gap-1 bg-black', views === 2 && 'grid-cols-2', views === 4 && 'grid-cols-2 grid-rows-2')}>
        {day.tables.concat(day.tables).slice(0, views).map((t, i) => (
          <Stage key={`${t.id}-${i}`} overlay={overlay} tableName={t.name} seats={stacks} playing={playing} phase={Math.floor(now / 6000) % 3} compact={views > 1} hue={220 + i * 25} />
        ))}
      </div>
      <div className="absolute top-12 left-[96px] flex items-center gap-5">
        <StatusBadge status={status} />
        <p className="text-[28px] font-bold drop-shadow">
          {event.name} · {day.label}
        </p>
      </div>
      {current && (
        <div className="absolute top-32 left-[96px] rounded-[14px] bg-black/75 px-6 py-4">
          <p className="label flex items-center gap-3 text-[18px] text-gold">
            <HandGlyph type={current.type} size={24} /> {HAND_META[current.type].label}
          </p>
          <p className="mt-2 text-[26px] font-semibold">{current.title}</p>
          <p className="text-[20px] text-muted">{current.playerIds.map((id) => playerById(id).name).join(' vs ')}</p>
        </div>
      )}
      {/* HUD — fades when the focus leaves it, like a real TV player */}
      <div className={cx('absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-[96px] pt-24 pb-[60px] transition-opacity duration-200', focusedRow < 0 && 'opacity-0')}>
        <div className="mb-6 flex items-center gap-4">
          <span className="label text-[16px] text-subtle">Hands</span>
          <div className="flex gap-3 overflow-hidden p-2">
            {dayHands.map((h, i) => (
              <TvFocusable key={h.id} focused={isFocused(`mk-${h.id}`)} onClick={() => click(1, i)} className={cx('flex items-center gap-2 rounded-full px-4 py-2 text-[18px] font-semibold', seekTo === i ? 'bg-gold-dim' : 'bg-white/10')}>
                <HandGlyph type={h.type} size={22} /> {duration(h.t)}
              </TvFocusable>
            ))}
          </div>
        </div>
        <div className="flex gap-4">
          {ctl.map((c, i) => (
            <TvFocusable key={c.id} focused={isFocused(c.id)} disabled={c.id === 'p-multi' && caps.multiview < 2} onClick={() => click(0, i)} className="flex items-center gap-3 rounded-[14px] bg-white/10 px-6 py-4 text-[22px] font-semibold">
              <Icon name={c.icon} size={26} /> {c.label}
            </TvFocusable>
          ))}
        </div>
      </div>
    </div>
  );
}

function TvLogin({ isFocused, onDone, back }: { isFocused: (id: string) => boolean; onDone: () => void; back: () => void }) {
  const { set, toast } = useApp();
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
    <div className="flex size-full items-center justify-center gap-[140px] px-[140px]">
      <div className="max-w-[820px]">
        <p className="text-[48px] font-black tracking-tight">
          WSOP <span className="text-gold">TV</span>
        </p>
        <h1 className="mt-8 text-[60px] leading-tight font-black">Sign in with GGPASS</h1>
        <ol className="mt-8 space-y-5 text-[30px] text-muted">
          <li>
            1. Go to <b className="text-text">ggpass.example/activate</b> on your phone
          </li>
          <li>2. Enter this code</li>
        </ol>
        <p className="mt-6 text-[110px] font-black tracking-[0.12em] text-gold tnum" aria-label={`Activation code ${code}`}>
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
        <TvFocusable focused={isFocused('login-back')} onClick={back} className="mt-10 rounded-[14px] bg-surface-3 px-10 py-5 text-[26px] font-bold">
          Back
        </TvFocusable>
      </div>
      <div className="flex flex-col items-center gap-5">
        <QrMock />
        <p className="text-[24px] text-muted">Or scan with your phone camera</p>
      </div>
    </div>
  );
}

/** Deterministic QR-like pattern (mock — not a scannable code). */
function QrMock() {
  const n = 25;
  const cells: boolean[] = [];
  let seed = 7;
  for (let i = 0; i < n * n; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    cells.push(seed / 233280 > 0.52);
  }
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={7} height={7} fill="#000" />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" />
      <rect x={x + 2} y={y + 2} width={3} height={3} fill="#000" />
    </g>
  );
  const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
  return (
    <svg width={420} height={420} viewBox={`-2 -2 ${n + 4} ${n + 4}`} className="rounded-[18px] bg-white" role="img" aria-label="QR code (mock)">
      {cells.map((on, i) => {
        const x = i % n;
        const y = Math.floor(i / n);
        return on && !inFinder(x, y) ? <rect key={i} x={x} y={y} width={1} height={1} fill="#000" /> : null;
      })}
      {finder(0, 0)}
      {finder(n - 7, 0)}
      {finder(0, n - 7)}
    </svg>
  );
}

// ---- feature parity ----------------------------------------------------------------------------

function ParityPanel({ platform }: { platform: Platform }) {
  const caps = PLATFORMS[platform];
  const rows: [string, string, boolean | 'partial'][] = [
    ['Live, Delayed & VOD', 'Supported', true],
    ['Hand markers', caps.handMarkers ? 'Supported' : 'Not supported', caps.handMarkers],
    ['Data overlay', caps.overlayMax === 'pro' ? 'Off / Basic / Pro' : 'Off / Basic only', caps.overlayMax === 'pro' ? true : 'partial'],
    ['Multiview', caps.multiview === 1 ? 'Not supported' : `Up to ${caps.multiview} tables`, caps.multiview === 4 ? true : caps.multiview === 1 ? false : 'partial'],
    ['Alternate audio tracks', caps.audioTracks ? 'Commentary EN/ES · Natural sound' : 'Main commentary only', caps.audioTracks],
    ['Closed captions', caps.captions ? 'Supported' : 'Not supported', caps.captions],
    ['Sign-in', caps.signIn === 'device-code' ? 'Activation code + QR' : 'GGPASS web', true],
  ];
  return (
    <section className="rounded-panel border border-line bg-surface p-4" aria-label="Feature parity">
      <p className="label text-gold">Feature parity</p>
      <h2 className="mt-1 text-lg font-bold">{caps.label}</h2>
      <ul className="mt-3 space-y-2">
        {rows.map(([k, v, ok]) => (
          <li key={k} className="flex items-start gap-3 rounded-chip bg-surface-2 p-2.5">
            <span className={cx('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black', ok === true ? 'bg-ok/20 text-ok' : ok === 'partial' ? 'bg-delayed/20 text-delayed' : 'bg-surface-3 text-subtle')} aria-hidden>
              {ok === true ? '✓' : ok === 'partial' ? '½' : '—'}
            </span>
            <span>
              <span className="block text-sm font-semibold">{k}</span>
              <span className="text-xs text-muted">{v}</span>
            </span>
          </li>
        ))}
      </ul>
      <table className="mt-4 w-full text-[11px]">
        <caption className="label mb-1 text-left text-[10px] text-subtle">All TV platforms</caption>
        <thead>
          <tr className="text-subtle">
            <th className="py-1 text-left font-semibold">Platform</th>
            <th className="font-semibold">Overlay</th>
            <th className="font-semibold">Multiview</th>
          </tr>
        </thead>
        <tbody>
          {TV_PLATFORMS.map((p) => (
            <tr key={p} className={cx('border-t border-line', p === platform && 'text-gold-strong')}>
              <td className="py-1.5">{PLATFORMS[p].label}</td>
              <td className="text-center capitalize">{PLATFORMS[p].overlayMax}</td>
              <td className="text-center tnum">{PLATFORMS[p].multiview === 1 ? '—' : PLATFORMS[p].multiview}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[11px] text-subtle">Assumed capabilities for the demo — confirm per platform SDK.</p>
    </section>
  );
}
