import type { OverlayLevel, Platform } from './types';

export interface PlatformCaps {
  label: string;
  kind: 'web' | 'mobile' | 'tv';
  /** Max simultaneous tables in multiview (1 = not supported). */
  multiview: 1 | 2 | 4;
  overlayMax: OverlayLevel;
  handMarkers: boolean;
  audioTracks: boolean;
  captions: boolean;
  pip: boolean;
  /** TV sign-in method. */
  signIn: 'ggpass-web' | 'device-code';
}

/** Feature parity matrix (assumed for the demo — to be confirmed per platform SDK). */
export const PLATFORMS: Record<Platform, PlatformCaps> = {
  web: { label: 'Web', kind: 'web', multiview: 4, overlayMax: 'pro', handMarkers: true, audioTracks: true, captions: true, pip: true, signIn: 'ggpass-web' },
  ios: { label: 'iOS', kind: 'mobile', multiview: 2, overlayMax: 'pro', handMarkers: true, audioTracks: true, captions: true, pip: true, signIn: 'ggpass-web' },
  android: { label: 'Android', kind: 'mobile', multiview: 2, overlayMax: 'pro', handMarkers: true, audioTracks: true, captions: true, pip: true, signIn: 'ggpass-web' },
  appletv: { label: 'Apple TV', kind: 'tv', multiview: 4, overlayMax: 'pro', handMarkers: true, audioTracks: true, captions: true, pip: false, signIn: 'device-code' },
  androidtv: { label: 'Android TV', kind: 'tv', multiview: 4, overlayMax: 'pro', handMarkers: true, audioTracks: true, captions: true, pip: false, signIn: 'device-code' },
  firetv: { label: 'Fire TV', kind: 'tv', multiview: 2, overlayMax: 'pro', handMarkers: true, audioTracks: true, captions: true, pip: false, signIn: 'device-code' },
  roku: { label: 'Roku', kind: 'tv', multiview: 1, overlayMax: 'basic', handMarkers: true, audioTracks: true, captions: true, pip: false, signIn: 'device-code' },
  samsung: { label: 'Samsung (Tizen)', kind: 'tv', multiview: 2, overlayMax: 'basic', handMarkers: true, audioTracks: true, captions: true, pip: false, signIn: 'device-code' },
  lg: { label: 'LG (webOS)', kind: 'tv', multiview: 2, overlayMax: 'basic', handMarkers: true, audioTracks: false, captions: true, pip: false, signIn: 'device-code' },
};

export const TV_PLATFORMS: Platform[] = ['appletv', 'androidtv', 'firetv', 'roku', 'samsung', 'lg'];

const ORDER: OverlayLevel[] = ['off', 'basic', 'pro'];
export const overlayAllowed = (p: Platform, level: OverlayLevel) => ORDER.indexOf(level) <= ORDER.indexOf(PLATFORMS[p].overlayMax);
