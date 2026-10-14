import { useState } from 'react';
import type { StreamStatus, TableFeed } from '../../data/types';
import { playerById } from '../../data/mock';
import { chips } from '../../lib/format';
import { fmtTime } from '../../lib/time';
import { tableDelay, tableStatus } from '../../lib/broadcast';
import { useApp } from '../../state/app';
import { Avatar, CountryCode, ErrorState, Icon, Skeleton, Spoiler, StatusBadge, Tabs, cx } from '../../components/ui';
import type { SeatStack } from '../../state/stacks';
import { EQUITY } from '../../state/stacks';
import { CURRENT_HAND } from './Stage';

type Tab = 'chips' | 'hand' | 'tables';

export function SidePanel({
  stacks,
  phase,
  tables,
  dayStatus,
  mainTable,
  onSelectTable,
  spoilerKey,
  bb,
}: {
  stacks: SeatStack[];
  phase: number;
  tables: TableFeed[];
  dayStatus: StreamStatus;
  mainTable: string;
  onSelectTable: (id: string) => void;
  spoilerKey: string;
  /** Current big blind, to show stacks in big blinds. */
  bb?: number;
}) {
  const [tab, setTab] = useState<Tab>('chips');
  return (
    <section aria-label="Broadcast panel" className="flex h-full flex-col rounded-panel border border-line bg-surface">
      <div className="px-3 pt-1">
        <Tabs<Tab>
          label="Panel"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'chips', label: 'Chip Counts' },
            { value: 'hand', label: 'Current Hand' },
            { value: 'tables', label: 'Tables' },
          ]}
        />
      </div>
      <div className="flex-1 overflow-y-auto p-3" role="tabpanel">
        {tab === 'chips' && <ChipCounts stacks={stacks} spoilerKey={spoilerKey} bb={bb} />}
        {tab === 'hand' && <CurrentHand phase={phase} />}
        {tab === 'tables' && <Tables tables={tables} dayStatus={dayStatus} mainTable={mainTable} onSelect={onSelectTable} />}
      </div>
    </section>
  );
}

function ChipCounts({ stacks, spoilerKey, bb }: { stacks: SeatStack[]; spoilerKey: string; bb?: number }) {
  const max = stacks[0]?.stack ?? 1;
  return (
    <div>
      <p className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>{stacks.length} players remaining</span>
        <span className="inline-flex items-center gap-1">
          <i className="live-dot size-1.5 rounded-full bg-live" aria-hidden /> Updating
        </span>
      </p>
      <Spoiler k={`${spoilerKey}-chips`} label="Chip standings hidden">
        <ol className="space-y-1.5">
          {stacks.map((s, i) => {
            const p = playerById(s.playerId);
            return (
              <li key={s.playerId} className="relative overflow-hidden rounded-chip bg-surface-2 px-2.5 py-2">
                <i className="absolute inset-y-0 left-0 bg-gold/10 transition-[width] duration-500" style={{ width: `${(s.stack / max) * 100}%` }} aria-hidden />
                <div className="relative flex items-center gap-2.5">
                  <span className="w-4 text-xs font-bold text-subtle tnum">{i + 1}</span>
                  <Avatar name={p.name} hue={p.hue} size={26} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{p.name}</span>
                    <CountryCode cc={p.cc} />
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-bold tnum">
                      {chips(s.stack)}
                      {bb && <span className="ml-1.5 text-xs font-semibold text-muted">{Math.round(s.stack / bb)} bb</span>}
                    </span>
                    {s.delta !== 0 && <span className={cx('block text-[11px] tnum', s.delta > 0 ? 'text-ok' : 'text-muted')}>{s.delta > 0 ? '▲' : '▼'} {chips(Math.abs(s.delta))}</span>}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </Spoiler>
    </div>
  );
}

function CurrentHand({ phase }: { phase: number }) {
  const h = CURRENT_HAND;
  const eq = EQUITY[phase];
  const a = playerById(h.a);
  const b = playerById(h.b);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="label text-gold">Hand #{h.number}</p>
        <p className="text-xs text-muted">{eq.phase}</p>
      </div>
      {[
        { p: a, cards: h.aCards, eq: eq.a },
        { p: b, cards: h.bCards, eq: eq.b },
      ].map((x) => (
        <div key={x.p.id} className="flex items-center gap-3 rounded-chip bg-surface-2 p-2.5">
          <Avatar name={x.p.name} hue={x.p.hue} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{x.p.name}</p>
            <p className="text-xs text-gold-strong tnum">{x.cards}</p>
          </div>
          <p className="text-lg font-black tnum">{x.eq}%</p>
        </div>
      ))}
      <div>
        <p className="label mb-1.5 text-subtle">Board</p>
        <p className="flex gap-1.5 tnum">
          {h.board.map((c, i) => (
            <span key={c} className={cx('rounded-[4px] px-1.5 py-1 text-sm font-bold', i < (phase === 0 ? 3 : phase === 1 ? 4 : 5) ? 'bg-white text-ink' : 'border border-dashed border-line-strong text-transparent')}>
              {c}
            </span>
          ))}
        </p>
      </div>
      <div>
        <p className="label mb-1.5 text-subtle">
          Pot <span className="ml-1 text-text tnum">{chips(h.pots[phase])}</span>
        </p>
        <ol className="space-y-1 border-l border-line pl-3 text-[13px] text-muted">
          {h.actions.slice(0, 3 + phase).map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Tables({ tables, dayStatus, mainTable, onSelect }: { tables: TableFeed[]; dayStatus: StreamStatus; mainTable: string; onSelect: (id: string) => void }) {
  const { state } = useApp();
  const [retrying, setRetrying] = useState<string | null>(null);
  const [recovered, setRecovered] = useState<string[]>([]);
  return (
    <ul className="space-y-2">
      {tables.map((t) => {
        const failing = t.failing && !recovered.includes(t.id);
        return (
          <li key={t.id}>
            {retrying === t.id ? (
              <Skeleton className="h-16" />
            ) : failing ? (
              <ErrorState
                title={`${t.name}: feed unavailable`}
                body="The outer-table feed dropped. Other tables are unaffected."
                onRetry={() => {
                  setRetrying(t.id);
                  window.setTimeout(() => (setRetrying(null), setRecovered((r) => [...r, t.id])), 1200);
                }}
              />
            ) : (
              <button
                onClick={() => onSelect(t.id)}
                aria-pressed={t.id === mainTable}
                className={cx('flex w-full items-center gap-3 rounded-chip border p-3 text-left transition-colors duration-150', t.id === mainTable ? 'border-gold bg-gold-dim' : 'border-line hover:border-line-strong')}
              >
                <Icon name="tv" size={18} className="text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{t.name}</span>
                  <span className="block text-xs text-muted">
                    {tableStatus(t, dayStatus) === 'late'
                      ? `Late start${t.expected ? ` · expected ${fmtTime(t.expected, state.tz)}` : ''}`
                      : tableStatus(t, dayStatus) === 'interrupted'
                        ? 'Temporarily off air'
                        : t.main
                          ? 'Commentary · English / Spanish'
                          : 'Natural sound'}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <StatusBadge status={tableStatus(t, dayStatus)} delayMin={tableDelay(t, dayStatus) || 30} size="sm" />
                  {t.id === mainTable && <span className="label text-[10px] text-gold">Main</span>}
                </span>
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
