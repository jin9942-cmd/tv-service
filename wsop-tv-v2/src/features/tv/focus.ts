// Remote-control focus engine for the TV preview.
// Keyboard → remote: Arrow keys = D-pad, Enter = OK, Backspace = Back.
// The screen is described as a side menu (vertical) plus content rows (each a horizontal list).
// Focus moves predictably: up/down change row (keeping the column when possible), left/right move within a row,
// left from the first item enters the menu, right from the menu returns to the last content position.
import { useCallback, useEffect, useRef, useState } from 'react';

export interface FocusItem {
  id: string;
  onSelect?: () => void;
  disabled?: boolean;
}
export interface FocusRow {
  id: string;
  items: FocusItem[];
}
export interface FocusModel {
  menu?: FocusItem[];
  rows: FocusRow[];
  onBack?: () => void;
}

export type FocusPos = { zone: 'menu'; index: number } | { zone: 'content'; row: number; col: number };

export function useRemoteFocus(model: FocusModel, screenKey: string) {
  const [pos, setPos] = useState<FocusPos>({ zone: 'content', row: 0, col: 0 });
  const lastContent = useRef({ row: 0, col: 0 });
  const colMemory = useRef<Record<number, number>>({});
  const modelRef = useRef(model);
  modelRef.current = model;
  const posRef = useRef(pos);
  posRef.current = pos;

  // New screen → focus its first content item.
  useEffect(() => {
    setPos({ zone: 'content', row: 0, col: 0 });
    lastContent.current = { row: 0, col: 0 };
    colMemory.current = {};
  }, [screenKey]);

  const clamp = useCallback((p: FocusPos): FocusPos => {
    const m = modelRef.current;
    if (p.zone === 'menu') return m.menu?.length ? { zone: 'menu', index: Math.max(0, Math.min(m.menu.length - 1, p.index)) } : { zone: 'content', row: 0, col: 0 };
    const row = Math.max(0, Math.min(m.rows.length - 1, p.row));
    const len = m.rows[row]?.items.length ?? 1;
    return { zone: 'content', row, col: Math.max(0, Math.min(len - 1, p.col)) };
  }, []);

  const move = useCallback(
    (dir: 'up' | 'down' | 'left' | 'right') => {
      setPos((p) => {
        const m = modelRef.current;
        if (p.zone === 'menu') {
          if (dir === 'up') return clamp({ zone: 'menu', index: p.index - 1 });
          if (dir === 'down') return clamp({ zone: 'menu', index: p.index + 1 });
          if (dir === 'right') return clamp({ zone: 'content', ...lastContent.current });
          return p;
        }
        let next: FocusPos = p;
        if (dir === 'left') next = p.col === 0 && m.menu?.length ? { zone: 'menu', index: 0 } : { ...p, col: p.col - 1 };
        if (dir === 'right') next = { ...p, col: p.col + 1 };
        if (dir === 'up' || dir === 'down') {
          colMemory.current[p.row] = p.col;
          const row = p.row + (dir === 'up' ? -1 : 1);
          next = { zone: 'content', row, col: colMemory.current[row] ?? Math.min(p.col, (m.rows[row]?.items.length ?? 1) - 1) };
        }
        const c = clamp(next);
        if (c.zone === 'content') lastContent.current = { row: c.row, col: c.col };
        return c;
      });
    },
    [clamp],
  );

  // Read the position from a ref: running the action inside a state updater would fire it twice under StrictMode.
  const select = useCallback(() => {
    const m = modelRef.current;
    const p = posRef.current;
    const item = p.zone === 'menu' ? m.menu?.[p.index] : m.rows[p.row]?.items[p.col];
    if (item && !item.disabled) item.onSelect?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, 'up' | 'down' | 'left' | 'right'> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
      if ((e.target as HTMLElement)?.closest?.('select, input, [data-tv-ignore]')) return;
      if (map[e.key]) {
        e.preventDefault();
        move(map[e.key]);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        select();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        modelRef.current.onBack?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, select]);

  const isFocused = (id: string) => {
    const m = model;
    if (pos.zone === 'menu') return m.menu?.[pos.index]?.id === id;
    return m.rows[pos.row]?.items[pos.col]?.id === id;
  };
  const focusedRow = pos.zone === 'content' ? pos.row : -1;
  return { pos, isFocused, focusedRow, setPos };
}
