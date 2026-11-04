// TV Preview: a 1920×1080 "10-foot" UI rendered inside a TV frame and scaled to fit.
// Navigation is focus-based (keyboard arrows / Enter / Backspace act as the remote's D-pad / OK / Back).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Platform } from '../../data/types';
import { PLATFORMS, TV_PLATFORMS } from '../../data/platforms';
import { useApp } from '../../state/app';
import { Icon, cx } from '../../components/ui';
import { TvApp } from './TvApp';
import { SHELLS, SHELL_OF } from './tvTokens';

const SHELL_LABEL = { 'top-tabs': 'Top tab bar · poster cards · lift + soft shadow', 'side-fixed': 'Fixed side menu · uniform grid · thick square focus', 'side-rail': 'Collapsible rail · content rows · scale + bright border' } as const;

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
                {/* Switching platform swaps the UI shell immediately; the current screen is kept for side-by-side comparison. */}
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
      <p className="mt-1 text-xs text-muted">
        UI shell: {SHELL_LABEL[SHELLS[SHELL_OF[platform]].nav]}
        {SHELLS[SHELL_OF[platform]].systemBar && ' · system bar + colour-key hints'}
        {SHELLS[SHELL_OF[platform]].timeline === 'trickplay' && ' · trick-play timeline'}
      </p>
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
