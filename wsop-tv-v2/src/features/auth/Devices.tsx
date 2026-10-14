import { useLocation, useNavigate } from 'react-router-dom';
import { MAX_STREAMS, useApp, type Device } from '../../state/app';
import { Button, Icon } from '../../components/ui';
import { Page } from '../../components/ui';

/** Device management. Reached from the "too many devices" gate or from Account. */
export function Devices() {
  const loc = useLocation();
  const returnTo = (loc.state as { returnTo?: string } | null)?.returnTo;
  return (
    <Page className="max-w-3xl">
      <p className="label text-gold">Account</p>
      <h1 className="mt-1 text-title font-black">Devices</h1>
      <DeviceList returnTo={returnTo} />
    </Page>
  );
}

export function DeviceList({ returnTo }: { returnTo?: string }) {
  const { state, set, toast } = useApp();
  const nav = useNavigate();
  const streaming = state.devices.filter((d) => d.streaming).length;
  const limit = state.scenario === 'deviceLimit';

  const signOut = (d: Device) => {
    set((s) => ({ devices: s.devices.filter((x) => x.id !== d.id), scenario: s.scenario === 'deviceLimit' && d.streaming ? 'active' : s.scenario }));
    toast(`Signed out of ${d.name}`);
  };

  return (
    <div className="mt-4">
      <p className="text-sm text-muted">
        Streams in use{' '}
        <b className="text-text tnum">
          {limit ? MAX_STREAMS : Math.min(streaming, MAX_STREAMS)} / {MAX_STREAMS}
        </b>{' '}
        · Your plan allows {MAX_STREAMS} streams at the same time.
      </p>
      {limit && (
        <div className="mt-4 rounded-card border border-delayed/50 bg-delayed/10 p-4 text-sm" role="alert">
          You've reached the stream limit. Sign out of a device that's currently streaming to watch here.
        </div>
      )}
      <ul className="mt-4 divide-y divide-line rounded-panel border border-line bg-surface">
        {state.devices.map((d) => (
          <li key={d.id} className="flex items-center gap-4 p-4">
            <Icon name={d.kind === 'tv' ? 'tv' : d.kind === 'mobile' ? 'user' : 'grid1'} className="text-muted" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {d.name} {d.current && <span className="label ml-1 text-[10px] text-gold">This device</span>}
              </p>
              <p className="text-xs text-muted">
                {d.streaming ? <span className="text-live">● Streaming now</span> : d.lastActive}
              </p>
            </div>
            {!d.current && (
              <Button size="sm" variant="outline" onClick={() => signOut(d)}>
                Sign out
              </Button>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            set((s) => ({ devices: s.devices.filter((d) => d.current), scenario: s.scenario === 'deviceLimit' ? 'active' : s.scenario }));
            toast('Signed out of all other devices');
          }}
        >
          Sign out of all other devices
        </Button>
        {returnTo && state.scenario !== 'deviceLimit' && (
          <Button variant="primary" onClick={() => nav(returnTo)}>
            Back to the broadcast
          </Button>
        )}
      </div>
    </div>
  );
}
