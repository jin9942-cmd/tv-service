/** Tournament times are defined in Las Vegas time (event venue). */
export const EVENT_TZ = 'America/Los_Angeles';

function tzOffsetMs(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const m: Record<string, string> = {};
  for (const p of parts) m[p.type] = p.value;
  const asUTC = Date.UTC(+m.year, +m.month - 1, +m.day, +m.hour, +m.minute, +m.second);
  return asUTC - date.getTime();
}

function zonedToDate(y: number, mo: number, d: number, h: number, mi: number, tz = EVENT_TZ): Date {
  const guess = Date.UTC(y, mo, d, h, mi);
  return new Date(guess - tzOffsetMs(new Date(guess), tz));
}

/** YYYY-MM-DD of a moment in event time. */
export function eventDateKey(date: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(typeof date === 'string' ? new Date(date) : date);
}

export function todayKey(): string {
  return eventDateKey(new Date());
}

export function addDaysKey(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** ISO string for "today (event time) + dayOffset at hh:mm event time". */
export function atEventTime(dayOffset: number, h: number, mi = 0): string {
  const [y, m, d] = todayKey().split('-').map(Number);
  return zonedToDate(y, m - 1, d + dayOffset, h, mi).toISOString();
}

/** ISO string for now minus N minutes, rounded down to 15 minutes. */
export function minutesAgo(min: number): string {
  const t = Date.now() - min * 60_000;
  return new Date(t - (t % (15 * 60_000))).toISOString();
}

export function formatEventTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TZ,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(iso));
}

export function formatLocalTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(iso));
}

export function formatEventDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

export function formatKeyLabel(key: string): { weekday: string; day: string; month: string } {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return {
    weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(dt),
    day: String(d),
    month: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(dt),
  };
}

export function localTimeZoneName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'local time';
  }
}

export function relativeFromNow(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const span = h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  return diff >= 0 ? `in ${span}` : `${span} ago`;
}

export function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const s = Math.floor(sec % 60);
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor(sec / 3600);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
