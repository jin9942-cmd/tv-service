// Time helpers. All stored times are UTC ISO strings; everything is converted for display.

export const DISPLAY_TZ = ['Asia/Seoul', 'America/Los_Angeles'] as const;
export type DisplayTz = (typeof DISPLAY_TZ)[number];

const HOUR = 3_600_000;

export const hoursFrom = (base: number, h: number) => new Date(base + h * HOUR).toISOString();

function parts(date: Date, tz: string) {
  const p = new Intl.DateTimeFormat('en-US', {
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
  for (const x of p) m[x.type] = x.value;
  return m;
}

function offsetMs(date: Date, tz: string) {
  const m = parts(date, tz);
  return Date.UTC(+m.year, +m.month - 1, +m.day, +m.hour, +m.minute, +m.second) - date.getTime();
}

/** "2026-10-06" + "19:30" in a time zone → UTC ISO. */
export function zonedToUtc(date: string, time: string, tz: string): string {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const first = guess - offsetMs(new Date(guess), tz);
  return new Date(guess - offsetMs(new Date(first), tz)).toISOString();
}

/** UTC ISO → { date: YYYY-MM-DD, time: HH:mm } in a time zone (for form inputs). */
export function utcToZoned(iso: string, tz: string) {
  const m = parts(new Date(iso), tz);
  return { date: `${m.year}-${m.month}-${m.day}`, time: `${m.hour}:${m.minute}` };
}

export const dateKey = (iso: string | number, tz: string) => utcToZoned(new Date(iso).toISOString(), tz).date;

export function addDays(key: string, n: number) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export const fmtTime = (iso: string, tz: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

export const fmtDate = (iso: string, tz: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'short', day: 'numeric', weekday: 'short' }).format(new Date(iso));

export const fmtDateTime = (iso: string, tz: string) => `${fmtDate(iso, tz)} · ${fmtTime(iso, tz)}`;

export const tzAbbr = (tz: string, iso = new Date().toISOString()) =>
  new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
    .formatToParts(new Date(iso))
    .find((p) => p.type === 'timeZoneName')?.value ?? tz;

/** Korean admin formatting (CMS). */
export const fmtKo = (iso: string, tz = 'Asia/Seoul') =>
  new Intl.DateTimeFormat('ko-KR', { timeZone: tz, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    new Date(iso),
  );

export function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtCountdown(ms: number) {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

export const fmtCount = (n: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
export const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

/** Series dates: YYYY-MM-DD relative to today (series-local calendar). */
export function dayRel(n: number, tz: string) {
  return addDays(dateKey(Date.now(), tz), n);
}
