import { useEffect, useState } from 'react';
import { demoStore, useStore } from '../state/stores';

export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
}

/** Runs an async loader; re-runs when deps change or when demo settings change. */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const demo = useStore(demoStore);
  const key = JSON.stringify(deps);
  const [state, setState] = useState<AsyncState<T> & { key: string | null }>({ data: undefined, loading: true, error: null, key: null });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    loader().then(
      (data) => alive && setState({ data, loading: false, error: null, key }),
      (error: Error) => alive && setState({ data: undefined, loading: false, error, key }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, demo]);

  // Data loaded for different deps is never returned as current.
  const fresh = state.key === key;
  return { data: fresh ? state.data : undefined, loading: state.loading || !fresh, error: fresh ? state.error : null };
}
