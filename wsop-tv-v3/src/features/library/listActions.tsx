// Shared My List actions (hook, button, card overflow menu). No card imports here, so cards can use it.
import { useEffect, useRef, useState } from 'react';
import { useApp, type ListKind } from '../../state/app';
import { Button, Icon, cx } from '../../components/ui';

export function useMyList() {
  const { state, set, toast, signedIn, requireLogin } = useApp();
  const has = (kind: ListKind, id: string) => state.myList.some((x) => x.kind === kind && x.id === id);
  const toggle = (kind: ListKind, id: string) => {
    if (!signedIn) {
      set({ pendingListAdd: { kind, id } });
      return requireLogin({ reason: 'Sign in to save this to My List. We’ll add it as soon as you’re back.' });
    }
    const on = has(kind, id);
    set((s) => ({ myList: on ? s.myList.filter((x) => !(x.kind === kind && x.id === id)) : [{ kind, id, addedAt: Date.now() }, ...s.myList] }));
    toast(on ? 'Removed from My List' : 'Added to My List');
  };
  return { has, toggle, items: state.myList };
}

/** Add to My List / Remove toggle used on the watch screen, event detail and TV-like contexts. */
export function MyListButton({ kind, id, size = 'sm', className }: { kind: ListKind; id: string; size?: 'sm' | 'md'; className?: string }) {
  const list = useMyList();
  const on = list.has(kind, id);
  return (
    <Button size={size} variant={on ? 'secondary' : 'outline'} aria-pressed={on} aria-label={on ? 'Remove from My List' : 'Add to My List'} onClick={() => list.toggle(kind, id)} className={className}>
      <Icon name={on ? 'check' : 'plus'} size={16} /> {on ? 'In My List' : 'My List'}
    </Button>
  );
}

export interface MenuAction {
  label: string;
  icon: string;
  onSelect: () => void;
}

/**
 * Card overflow menu (⋯). Shows on hover / keyboard focus, always on touch screens; a long press (or right-click)
 * on the card opens it too — pass `bindLongPress` to the card root.
 */
export function CardMenu({ actions, className, openSignal }: { actions: MenuAction[]; className?: string; openSignal?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (openSignal) setOpen(true);
  }, [openSignal]);
  useEffect(() => {
    if (!open) return;
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => (document.removeEventListener('keydown', onKey), document.removeEventListener('pointerdown', onDown));
  }, [open]);
  return (
    <div ref={ref} className={cx('absolute z-20', className)}>
      <button
        type="button"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => (e.preventDefault(), e.stopPropagation(), setOpen((o) => !o))}
        className={cx(
          'flex size-8 items-center justify-center rounded-full bg-black/70 text-white transition-opacity duration-150 hover:bg-black/90 focus-visible:opacity-100',
          open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100',
        )}
      >
        <Icon name="more" size={18} />
      </button>
      {open && (
        <div role="menu" className="absolute top-9 right-0 w-60 rounded-card border border-line-strong bg-surface py-1.5 shadow-2xl">
          {actions.map((a) => (
            <button
              key={a.label}
              role="menuitem"
              onClick={(e) => (e.preventDefault(), e.stopPropagation(), setOpen(false), a.onSelect())}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
            >
              <Icon name={a.icon} size={16} className="text-muted" /> {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Long press (touch) / right-click on a card root opens its menu. Returns handlers + a signal for CardMenu. */
export function useLongPress() {
  const [signal, setSignal] = useState(0);
  const timer = useRef<number | null>(null);
  const clear = () => timer.current && (window.clearTimeout(timer.current), (timer.current = null));
  return {
    signal,
    bind: {
      onPointerDown: (e: React.PointerEvent) => {
        if (e.pointerType !== 'touch') return;
        clear();
        timer.current = window.setTimeout(() => setSignal((n) => n + 1), 500);
      },
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
      onContextMenu: (e: React.MouseEvent) => (e.preventDefault(), setSignal((n) => n + 1)),
    },
  };
}

/** The standard My List action for a card's menu. */
export function useListAction(kind: ListKind, id: string): MenuAction {
  const list = useMyList();
  const on = list.has(kind, id);
  return { label: on ? 'Remove from My List' : 'Add to My List', icon: on ? 'close' : 'plus', onSelect: () => list.toggle(kind, id) };
}

