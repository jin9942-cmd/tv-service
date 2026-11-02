// Demo-only developer panel. Deliberately styled unlike the product (dashed outline, monospace labels).
import { useEffect, useState } from 'react';
import type { AccountScenario, Platform, StreamStatus } from '../../data/types';
import { PLATFORMS } from '../../data/platforms';
import { useApp } from '../../state/app';
import { cx } from '../../components/ui';
import { INCLUDED_FROM_LABEL, PRESENTATION, type IncludedFrom } from '../../data/policy';

const SCENARIOS: { v: AccountScenario; label: string }[] = [
  { v: 'guest', label: '1 · Not signed in' },
  { v: 'free', label: '2 · GGPass · WSOP+ Free' },
  { v: 'basic', label: '3 · GGPass · WSOP+ Basic' },
  { v: 'premium', label: '4 · GGPass · WSOP+ Premium' },
  { v: 'unlinked', label: '5 · WSOP+ member, GGPass not linked (TBD)' },
  { v: 'restricted', label: '6 · GGPass account restricted' },
  { v: 'deviceLimit', label: '7 · Too many devices' },
  { v: 'expired', label: '8 · WSOP+ membership ended' },
  { v: 'grace', label: '9 · WSOP+ payment issue' },
];

export function DemoControls() {
  const { state, set } = useApp();
  // Collapsed by default so the product UI is what people see first.
  const [open, setOpen] = useState(false);
  // Presentation build: no floating button at all — Shift+D shows / hides the panel.
  const [revealed, setRevealed] = useState(!PRESENTATION);
  useEffect(() => {
    if (!PRESENTATION) return;
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.key.toLowerCase() !== 'd' || (e.target as HTMLElement)?.closest?.('input, textarea, select')) return;
      setRevealed((r) => !r);
      setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (!revealed) return null;

  return (
    <div className="fixed right-3 bottom-20 z-[58] w-[19rem] font-mono text-[12px] md:bottom-4">
      {open ? (
        <section aria-label="Demo Controls" className="max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-card border-2 border-dashed border-sky-400/70 bg-[#07121c]/95 p-3 text-sky-100 shadow-2xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-bold tracking-wide text-sky-300">⚙ DEMO CONTROLS</p>
            <button onClick={() => setOpen(false)} className="rounded px-2 py-0.5 text-sky-300 hover:bg-sky-400/10" aria-label="Collapse demo controls">
              —
            </button>
          </div>
          <p className="mb-3 text-[10.5px] text-sky-200/70">Not part of the product UI.</p>

          <Group label="Account state">
            <div className="space-y-1" role="radiogroup" aria-label="Account state">
              {SCENARIOS.map((s) => (
                <button
                  key={s.v}
                  role="radio"
                  aria-checked={state.scenario === s.v}
                  // Basic / Premium also set the tier that states 5, 7, 8, 9 hold.
                  onClick={() => set(s.v === 'basic' || s.v === 'premium' ? { scenario: s.v, paidTier: s.v } : { scenario: s.v })}
                  className={cx('block w-full rounded px-2 py-1 text-left', state.scenario === s.v ? 'bg-sky-400/20 text-white' : 'text-sky-200/80 hover:bg-sky-400/10')}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Group>

          <Group label="WSOP TV included from">
            <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="WSOP TV included from">
              {(['basic', 'premium', 'split'] as IncludedFrom[]).map((v) => (
                <button key={v} role="radio" aria-checked={state.includedFrom === v} onClick={() => set({ includedFrom: v })} className={cx('rounded px-1.5 py-1 text-[11px] leading-tight', state.includedFrom === v ? 'bg-sky-400/25 text-white' : 'text-sky-200/80 hover:bg-sky-400/10')}>
                  {INCLUDED_FROM_LABEL[v]}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10.5px] text-sky-200/60">
              Paid content needs this tier. Split: live/delayed → Premium; replays, archive, paid clips → Basic. States 5/7/8/9 hold WSOP+ {state.paidTier === 'basic' ? 'Basic' : 'Premium'}.
            </p>
          </Group>

          <Group label="Featured stream (Main Event FT)">
            <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Stream state">
              {(
                [
                  ['live', 'Live'],
                  ['delayed', 'Delayed'],
                  ['vod', 'VOD'],
                  ['late', 'Late start'],
                  ['interrupted', 'Interrupted'],
                ] as [Exclude<StreamStatus, 'upcoming'>, string][]
              ).map(([m, label]) => (
                <button key={m} role="radio" aria-checked={state.streamMode === m} onClick={() => set({ streamMode: m })} className={cx('rounded px-1.5 py-1 text-[11px] uppercase', state.streamMode === m ? 'bg-sky-400/25 text-white' : 'text-sky-200/80 hover:bg-sky-400/10')}>
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10.5px] text-sky-200/60">Delayed: feature table 30 min, outer tables 15 min · Outer Table 3 starts late, Outer Table 4 is interrupted (Tables panel).</p>
          </Group>

          <Group label="Region">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={state.regionBlocked} onChange={(e) => set({ regionBlocked: e.target.checked })} className="accent-sky-400" />
              Region restricted
            </label>
            <label className="mt-1 flex items-center gap-2">
              <input type="checkbox" checked={state.vpnDetected} onChange={(e) => set({ vpnDetected: e.target.checked })} className="accent-sky-400" />
              VPN/proxy detected
            </label>
            <label className="mt-1 flex items-center gap-2">
              <input type="checkbox" checked={state.abroad} onChange={(e) => set({ abroad: e.target.checked, abroadDismissed: false })} className="accent-sky-400" />
              Traveling abroad
            </label>
          </Group>

          <Group label="Platform">
            <select value={state.platform} onChange={(e) => set({ platform: e.target.value as Platform })} className="w-full rounded border border-sky-400/40 bg-[#0b1a27] px-2 py-1" aria-label="Platform">
              {(['web', 'mobile', 'tablet', 'tv'] as const).map((k) => (
                <optgroup key={k} label={k.toUpperCase()}>
                  {(Object.keys(PLATFORMS) as Platform[])
                    .filter((p) => PLATFORMS[p].kind === k)
                    .map((p) => (
                      <option key={p} value={p}>
                        {PLATFORMS[p].label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <button onClick={() => set({ tvPreview: !state.tvPreview })} className="mt-1.5 w-full rounded border border-sky-400/40 px-2 py-1 hover:bg-sky-400/10">
              {state.tvPreview ? 'Close TV Preview' : 'Open TV Preview'}
            </button>
          </Group>

          <Group label="Viewer">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={state.spoilerFree} onChange={(e) => set({ spoilerFree: e.target.checked })} className="accent-sky-400" />
              Spoiler-Free Mode
            </label>
          </Group>

          <Group label="WSOP+ page result">
            <p className="mb-1 text-[10.5px] text-sky-200/70">Payment result</p>
            <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Payment result">
              {(['success', 'fail', 'cancel'] as const).map((v) => (
                <button key={v} role="radio" aria-checked={state.paymentResult === v} onClick={() => set({ paymentResult: v })} className={cx('rounded px-1.5 py-1 text-[11px] capitalize', state.paymentResult === v ? 'bg-sky-400/25 text-white' : 'text-sky-200/80 hover:bg-sky-400/10')}>
                  {v}
                </button>
              ))}
            </div>
          </Group>
        </section>
      ) : (
        <button onClick={() => setOpen(true)} className="ml-auto block rounded-full border-2 border-dashed border-sky-400/70 bg-[#07121c]/95 px-3 py-2 font-bold text-sky-300 shadow-xl" aria-label="Open demo controls">
          ⚙ Demo Controls
        </button>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-sky-400/20 py-2">
      <p className="mb-1 text-[10px] tracking-wider text-sky-300/80 uppercase">{label}</p>
      {children}
    </div>
  );
}
