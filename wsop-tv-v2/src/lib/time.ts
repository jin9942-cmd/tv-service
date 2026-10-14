// Time zone helpers. Every time in the UI goes through these, so changing the zone converts everything at once.

export const VENUE_TZ = 'America/Los_Angeles';

export const browserTz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

export const TZ_OPTIONS: { tz: string; label: string }[] = [
  { tz: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { tz: 'America/Denver', label: 'Mountain (MT)' },
  { tz: 'America/Chicago', label: 'Central (CT)' },
  { tz: 'America/New_York', label: 'Eastern (ET)' },
  { tz: 'UTC', label: 'UTC' },
  { tz: 'Europe/London', label: 'London' },
  { tz: 'Europe/Prague', label: 'Central Europe' },
  { tz: 'Asia/Seoul', label: 'Seoul' },
];

export const tzAbbr = (tz: string, at: Date | string = new Date()) => {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
      .formatToParts(new Date(at))
      .find((p) => p.type === 'timeZoneName');
    return part?.value ?? tz;
  } catch {
    return tz;
  }
};

export const fmtTime = (at: string | number, tz: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(at));

export const fmtDate = (at: string | number, tz: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(at));

export const fmtDateTime = (at: string | number, tz: string) => `${fmtDate(at, tz)} · ${fmtTime(at, tz)}`;

/** YYYY-MM-DD in a zone (for grouping by day). */
export const dayKey = (at: string | number, tz: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(at));

export const countdown = (ms: number) => {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
