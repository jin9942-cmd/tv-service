import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppRoute, AppTab, HomeSection, Member } from '../data/types';
import { store, toast, useStore, type Mode } from '../state/store';
import { MEMBER_LABEL } from '../state/selectors';
import { Env, Icon, useEnv, type AppEnv, type SheetKind } from './ui';
import { Home } from './screens/Home';
import { ScheduleTab } from './screens/ScheduleTab';
import { VodTab, VodDetail } from './screens/Vod';
import { TournamentsTab, SeriesDetail } from './screens/Tournaments';
import { PlayerDetail } from './screens/PlayerDetail';
import { Search } from './screens/Search';
import { Paywall } from './screens/Paywall';
import { MyTab, Inbox } from './screens/My';
import { LivePlayer } from './screens/LivePlayer';

const TABS: { tab: AppTab; label: string; icon: string }[] = [
  { tab: 'home', label: 'Home', icon: 'home' },
  { tab: 'schedule', label: 'Schedule', icon: 'calendar' },
  { tab: 'vod', label: 'VOD', icon: 'film' },
  { tab: 'tournaments', label: 'Tournaments', icon: 'trophy' },
  { tab: 'my', label: 'My', icon: 'user' },
];

export interface PreviewOverrides {
  member: Member;
  mode: Mode;
  layout: HomeSection[];
}

/** The mobile app. Rendered in the App demo frame, full-screen on phones, and read-only inside the CMS preview. */
export function AppPhone({ preview }: { preview?: PreviewOverrides }) {
  const live = {
    member: useStore((s) => s.member),
    mode: useStore((s) => s.mode),
    layouts: useStore((s) => s.layouts),
    tz: useStore((s) => s.tz),
    notes: useStore((s) => s.notes),
  };
  const member = preview?.member ?? live.member;
  const mode = preview?.mode ?? live.mode;
  const layout = preview?.layout ?? live.layouts[mode];

  const [stack, setStack] = useState<AppRoute[]>([{ name: 'tab', tab: 'home' }]);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const route = stack[stack.length - 1];

  const push = useCallback(
    (r: AppRoute) => {
      if (preview) return;
      setSheet(null);
      setStack((s) => (r.name === 'tab' ? [r] : [...s, r]));
    },
    [preview],
  );
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const replace = useCallback((r: AppRoute) => !preview && setStack((s) => [...s.slice(0, -1), r]), [preview]);
  const goTab = useCallback((tab: AppTab) => push({ name: 'tab', tab }), [push]);

  // New screen → scroll to top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [stack.length, route]);

  const env: AppEnv = useMemo(
    () => ({
      member,
      mode,
      layout,
      tz: live.tz,
      notes: live.notes && !preview,
      preview: !!preview,
      route,
      push,
      replace,
      back,
      goTab,
      sheet: (s) => !preview && setSheet(s),
      scrollRoot: () => scrollRef.current,
    }),
    [member, mode, layout, live.tz, live.notes, preview, route, push, replace, back, goTab],
  );

  const tabRoute = route.name === 'tab';
  const fullBleed = route.name === 'live' || route.name === 'vod';

  return (
    <Env.Provider value={env}>
      <div className={`app ${preview ? 'is-preview' : ''}`}>
        <div className={`app-scroll ${tabRoute ? 'has-tabbar' : ''} ${fullBleed ? 'is-player' : ''}`} ref={scrollRef}>
          <Screen route={route} />
        </div>

        {tabRoute && (
          <nav className="tabbar" aria-label="App tabs">
            {TABS.map((t) => (
              <button key={t.tab} className={route.tab === t.tab ? 'is-on' : ''} onClick={() => goTab(t.tab)} aria-current={route.tab === t.tab}>
                <Icon name={t.icon} size={22} />
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
        )}

        {sheet && <BottomSheet sheet={sheet} onClose={() => setSheet(null)} />}
        {!preview && <AppToasts />}
      </div>
    </Env.Provider>
  );
}

function Screen({ route }: { route: AppRoute }) {
  switch (route.name) {
    case 'tab':
      return route.tab === 'home' ? <Home /> : route.tab === 'schedule' ? <ScheduleTab /> : route.tab === 'vod' ? <VodTab /> : route.tab === 'tournaments' ? <TournamentsTab /> : <MyTab />;
    case 'live':
      return <LivePlayer key={route.scheduleId} scheduleId={route.scheduleId} />;
    case 'vod':
      return <VodDetail key={route.vodId} vodId={route.vodId} />;
    case 'series':
      return <SeriesDetail seriesId={route.seriesId} />;
    case 'player':
      return <PlayerDetail playerId={route.playerId} />;
    case 'search':
      return <Search />;
    case 'paywall':
      return <Paywall />;
    case 'inbox':
      return <Inbox />;
  }
}

/** Login prompt and paywall bottom sheets. Demo login/subscription just switch the member state. */
function BottomSheet({ sheet, onClose }: { sheet: NonNullable<SheetKind>; onClose: () => void }) {
  const { push } = useCtxPush();
  if (!sheet) return null;
  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={sheet.kind === 'login' ? 'Log in' : 'Subscribe'}>
        <span className="sheet-handle" />
        {sheet.kind === 'login' ? (
          <>
            <h3>Log in to watch</h3>
            <p className="muted">{sheet.reason}</p>
            <button
              className="btn btn-gold btn-block"
              onClick={() => {
                store.set({ member: 'free' });
                toast('Logged in as a Free member (demo)');
                onClose();
              }}
            >
              Log in (demo)
            </button>
            <button className="btn btn-ghost btn-block" onClick={onClose}>
              Not now
            </button>
            <p className="fineprint">Demo only — no real account or password.</p>
          </>
        ) : (
          <>
            <p className="sheet-kicker">Preview ended</p>
            <h3>Subscribe to keep watching</h3>
            <p className="muted">
              “{sheet.title}” is available on <b>{sheet.tier === 'premium' ? 'Premium' : 'Basic'}</b>
              {sheet.tier === 'basic' ? ' and Premium' : ''}.
            </p>
            {(sheet.tier === 'basic' ? (['basic', 'premium'] as const) : (['premium'] as const)).map((t) => (
              <button
                key={t}
                className={`btn btn-block ${t === 'premium' ? 'btn-gold' : 'btn-outline'}`}
                onClick={() => {
                  store.set({ member: t });
                  toast(`Subscribed to ${MEMBER_LABEL[t]} (demo) — enjoy the stream`);
                  onClose();
                }}
              >
                Subscribe {MEMBER_LABEL[t]}
              </button>
            ))}
            <button
              className="btn btn-ghost btn-block"
              onClick={() => {
                onClose();
                push({ name: 'paywall' });
              }}
            >
              Compare plans
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function useCtxPush() {
  const env = useEnv();
  return { push: env.push };
}

function AppToasts() {
  const toasts = useStore((s) => s.toasts);
  const mine = toasts.filter((t) => t.scope === 'app');
  if (!mine.length) return null;
  return (
    <div className="app-toasts" role="status" aria-live="polite">
      {mine.map((t) => (
        <div key={t.id} className="app-toast">
          {t.text}
        </div>
      ))}
    </div>
  );
}
