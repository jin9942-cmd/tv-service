// Demo-only developer panel. Deliberately styled unlike the product (dashed outline, monospace labels).
import { useState } from 'react';
import type { AccountScenario, Platform, StreamStatus } from '../../data/types';
import { PLATFORMS } from '../../data/platforms';
import { useApp } from '../../state/app';
import { cx } from '../../components/ui';

const SCENARIOS: { v: AccountScenario; label: string }[] = [
  { v: 'guest', label: '1 · Not signed in' },
  { v: 'noSub', label: '2 · GGPASS, no subscription' },
  { v: 'active', label: '3 · GGPASS + active subscription' },
  { v: 'unlinked', label: '4 · Subscribed, GGPASS not linked' },
  { v: 'restricted', label: '5 · GGPASS account restricted' },
  { v: 'deviceLimit', label: '6 · Too many devices' },
];

export function DemoControls() {
  const { state, set } = useApp();
  const [open, setOpen] = useState(true);

  return (
    <div className="fixed right-3 bottom-20 z-[58] w-[19rem] font-mono text-[12px] md:bottom-4">
      {open ? (
        <section aria-label="Demo Controls" className="rounded-card border-2 border-dashed border-sky-400/70 bg-[#07121c]/95 p-3 text-sky-100 shadow-2xl backdrop-blur">
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
                  onClick={() => set({ scenario: s.v })}
                  className={cx('block w-full rounded px-2 py-1 text-left', state.scenario === s.v ? 'bg-sky-400/20 text-white' : 'text-sky-200/80 hover:bg-sky-400/10')}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Group>

          <Group label="Featured stream (Main Event FT)">
            <div className="flex gap-1" role="radiogroup" aria-label="Stream state">
              {(['live', 'delayed', 'vod'] as Exclude<StreamStatus, 'upcoming'>[]).map((m) => (
                <button key={m} role="radio" aria-checked={state.streamMode === m} onClick={() => set({ streamMode: m })} className={cx('flex-1 rounded px-2 py-1 uppercase', state.streamMode === m ? 'bg-sky-400/25 text-white' : 'text-sky-200/80 hover:bg-sky-400/10')}>
                  {m}
                </button>
              ))}
            </div>
          </Group>

          <Group label="Region">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={state.regionBlocked} onChange={(e) => set({ regionBlocked: e.target.checked })} className="accent-sky-400" />
              Region restricted
            </label>
          </Group>

          <Group label="Platform">
            <select value={state.platform} onChange={(e) => set({ platform: e.target.value as Platform })} className="w-full rounded border border-sky-400/40 bg-[#0b1a27] px-2 py-1" aria-label="Platform">
              {(['web', 'mobile', 'tv'] as const).map((k) => (
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
