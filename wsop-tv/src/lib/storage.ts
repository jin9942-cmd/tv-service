// localStorage wrapper. Every access is guarded: private mode or blocked storage must not break the app.
const PREFIX = 'wsoptv.demo.';

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable — keep working in memory */
  }
}

export function clearAll(): void {
  try {
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => window.localStorage.removeItem(k));
    window.sessionStorage.clear();
  } catch {
    /* ignore */
  }
}

function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

/**
 * Minimal observable value backed by localStorage, usable with useSyncExternalStore.
 * Stays in sync across tabs (storage event), and functional updates re-read storage first so
 * two tabs updating the same record don't overwrite each other.
 */
export function createStore<T>(key: string, initial: T) {
  let value = readJSON<T>(key, initial);
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  try {
    window.addEventListener('storage', (e) => {
      if (e.key !== PREFIX + key && e.key !== null) return;
      value = readJSON<T>(key, initial);
      notify();
    });
  } catch {
    /* non-browser */
  }
  return {
    get: () => value,
    set(next: T | ((prev: T) => T)) {
      value = typeof next === 'function' ? (next as (p: T) => T)(readJSON<T>(key, value)) : next;
      writeJSON(key, value);
      notify();
    },
    reset() {
      value = initial;
      removeKey(key);
      notify();
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
