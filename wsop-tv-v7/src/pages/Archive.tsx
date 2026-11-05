import { archive, events } from '../data/mock';
import { useApp } from '../state/app';
import { ArchiveCard, BroadcastCard } from '../components/cards';
import { Button, Page, SectionHeader } from '../components/ui';

export function Archive() {
  const { signedIn, requireLogin } = useApp();
  const replays = events.flatMap((e) => e.days.filter((d) => d.status === 'vod').map((d) => ({ e, d })));
  // Guests can browse part of the archive; the rest is behind sign-in.
  const visible = signedIn ? replays : replays.slice(0, 6);
  return (
    <Page className="space-y-10">
      <header>
        <p className="label text-gold">On demand</p>
        <h1 className="mt-1 text-title font-black">Archive</h1>
        <p className="mt-1 text-sm text-muted">Full replays of every broadcast day, plus classic final tables from past championships.</p>
      </header>
      <section>
        <SectionHeader title="Classics" />
        <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 [&>div]:w-auto">
          {archive.map((a) => (
            <ArchiveCard key={a.id} item={a} />
          ))}
        </div>
      </section>
      <section>
        <SectionHeader title="2026 Summer Championship replays" />
        <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 [&>*]:w-auto">
          {visible.map(({ e, d }) => (
            <BroadcastCard key={d.id} event={e} day={d} />
          ))}
        </div>
        {!signedIn && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-panel border border-line bg-surface p-6 text-center">
            <p className="font-semibold">{replays.length - visible.length} more replays in the archive</p>
            <Button variant="primary" onClick={() => requireLogin({ reason: 'Sign in to browse the full archive.' })}>
              Continue with GGPASS
            </Button>
          </div>
        )}
      </section>
    </Page>
  );
}
