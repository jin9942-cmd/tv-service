// TV shells and focus tokens — the single place that defines how each TV platform looks and highlights focus.
// Colours/typography still come from the design tokens (styles/theme.css); data and screens are shared.
import type { Platform } from '../../data/types';

export type ShellFamily = 'apple' | 'roku' | 'android' | 'smarttv';

export const SHELL_OF: Record<Platform, ShellFamily> = {
  web: 'apple',
  ios: 'apple',
  android: 'android',
  appletv: 'apple',
  androidtv: 'android',
  firetv: 'android',
  roku: 'roku',
  samsung: 'smarttv',
  lg: 'smarttv',
};

export interface ShellSpec {
  /** Navigation chrome. */
  nav: 'top-tabs' | 'side-fixed' | 'side-rail';
  /** Card geometry for content rows. */
  card: { w: number; aspect: string; radius: string; titleSize: string };
  /** Player timeline style. */
  timeline: 'markers' | 'trickplay';
  /** Extra chrome for Samsung / LG. */
  systemBar?: boolean;
  colorKeys?: boolean;
  /** Content left padding (side menus take space). */
  contentPad: string;
}

export const SHELLS: Record<ShellFamily, ShellSpec> = {
  // Apple TV: top tab bar, big poster cards, lift + soft shadow on focus.
  apple: { nav: 'top-tabs', card: { w: 300, aspect: '2 / 3', radius: '22px', titleSize: '24px' }, timeline: 'markers', contentPad: '96px' },
  // Roku: fixed left menu, uniform grid, thick square border on focus, almost no scaling.
  roku: { nav: 'side-fixed', card: { w: 336, aspect: '16 / 9', radius: '4px', titleSize: '22px' }, timeline: 'trickplay', contentPad: '72px' },
  // Android TV / Fire TV: collapsible left rail + rows, scale + bright border on focus.
  android: { nav: 'side-rail', card: { w: 400, aspect: '16 / 9', radius: '12px', titleSize: '24px' }, timeline: 'markers', contentPad: '72px' },
  // Samsung (Tizen) / LG (webOS): Android TV shell + system bar + colour-key hints.
  smarttv: { nav: 'side-rail', card: { w: 400, aspect: '16 / 9', radius: '12px', titleSize: '24px' }, timeline: 'markers', systemBar: true, colorKeys: true, contentPad: '72px' },
};

/**
 * TV focus tokens. `focused` / `idle` are applied to every focusable element of the shell.
 * Kept here (not in components) so each platform's focus language is defined once.
 */
export const TV_FOCUS: Record<ShellFamily, { base: string; focused: string; idle: string; disabled: string }> = {
  apple: {
    base: 'transition-[transform,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]',
    focused: 'z-10 scale-[1.09] -translate-y-2 shadow-[0_28px_60px_-12px_rgb(0_0_0/0.85),0_0_0_1px_rgb(255_255_255/0.18)] brightness-110',
    idle: 'scale-100 shadow-none',
    disabled: 'opacity-45',
  },
  roku: {
    base: 'transition-[box-shadow,background-color] duration-150',
    focused: 'z-10 scale-[1.01] shadow-[0_0_0_6px_#ffffff] rounded-[4px]',
    idle: 'shadow-none',
    disabled: 'opacity-45',
  },
  android: {
    base: 'transition-[transform,box-shadow] duration-200 ease-out',
    focused: 'z-10 scale-[1.06] shadow-[0_0_0_4px_rgb(255_255_255/0.95),0_14px_34px_rgb(0_0_0/0.6)]',
    idle: 'scale-100 shadow-none',
    disabled: 'opacity-45',
  },
  smarttv: {
    base: 'transition-[transform,box-shadow] duration-200 ease-out',
    focused: 'z-10 scale-[1.06] shadow-[0_0_0_4px_rgb(255_255_255/0.95),0_14px_34px_rgb(0_0_0/0.6)]',
    idle: 'scale-100 shadow-none',
    disabled: 'opacity-45',
  },
};

export const notAvailable = (label: string) => `Not available on ${label}`;
