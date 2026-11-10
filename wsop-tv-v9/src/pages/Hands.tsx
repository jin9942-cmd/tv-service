import { Link, Navigate, useParams } from 'react-router-dom';
import { broadcastById, clipById, CLIPS, nas, PLAYERS } from '../data/demo';
import { useSession } from '../lib/state';
import { Avatar, ClipCard, Page, PlayerLink, Section, StatusChip, VideoPlayer } from '../components/ui';

/** [R] Hand replay — key moments. Open to every viewer, subscribed or not. */
export function HandsHub() {
  // The hub opens on the trending clip: the biggest pot from the live final table.
  return <ClipView id={CLIPS[0].id} hub />;
}

export function HandPage() {
  const { id } = useParams();
  if (!clipById(id)) return <Navigate to="/hands" replace />;
  return <ClipView id={id!} />;
}

function ClipView({ id, hub }: { id: string; hub?: boolean }) {
  const c = clipById(id)!;
  const b = broadcastById(c.broadcastId)!;
  const { ticker } = useSession();
  const liveNow = ticker.find((x) => x.id === b.id)?.status === 'live';
  const more = CLIPS.filter((x) => x.broadcastId === c.broadcastId || x.players.some((p) => c.players.includes(p)));
  const rest = CLIPS.filter((x) => !more.includes(x));
  const eventName = b.title.split(' · ')[0];

  return (
    <Page>
      <VideoPlayer
        key={c.id}
        src={b.video}
        poster={c.still}
        offset={c.offset}
        mode="clip"
        className="md:max-h-[68vh]"
        topLeft={
          <>
            {hub && <span className="chip bg-black/70 text-white">🔥 Trending</span>}
            <span className="chip bg-black/70 text-white">Free clip</span>
          </>
        }
      />
      <div className="border-b border-line bg-surface px-4 py-4 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start">
          <div className="min-w-0 flex-1">
            <h1 className="display text-[20px] md:text-[24px]">{c.title}</h1>
            <div className="mt-1 text-[12px] text-muted">
              {b.series} {b.title} {c.hand > 0 && `· Hand #${c.hand}`} · {c.views} views · {c.when}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.tags.map((t) => (
                <span key={t} className="rounded border border-line-strong px-2 py-0.5 text-[11px] text-muted">{t}</span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/watch/${b.id}`} className="btn btn-white">
              {liveNow ? <><span className="live-dot text-red" /> Back to the live broadcast</> : 'Watch full event'}
            </Link>
            <button className="btn" onClick={() => navigator.clipboard?.writeText(location.href).catch(() => {})}>Share</button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_340px]">
        <Section title="The hand" icon="🃏">
          <p className="text-[14px] leading-relaxed text-white/90">{c.summary}</p>
          {c.actions.length > 0 && (
            <ol className="mt-3 space-y-2 border-l border-line-strong pl-4 text-[13px]">
              {c.actions.map((a) => (
                <li key={a.street}>
                  <div className="text-[11px] font-bold tracking-wider text-subtle uppercase">{a.street}</div>
                  <div className="text-muted">{a.text}</div>
                </li>
              ))}
            </ol>
          )}
        </Section>
        <Section title="In this hand" icon="👤" className="md:border-l md:border-line">
          <ul className="space-y-2">
            {c.players.map((p) => (
              <li key={p}>
                <Link to={`/players/${p}`} className="flex items-center gap-3 rounded border border-line p-2.5 hover:border-line-strong">
                  <Avatar pid={p} size={40} />
                  <div className="min-w-0">
                    <div className="text-[14px] font-bold">{PLAYERS[p].name}</div>
                    <div className="text-[11px] text-muted">{PLAYERS[p].country} · {PLAYERS[p].bracelets} bracelets</div>
                  </div>
                  <span className="ml-auto text-[12px] text-muted">Profile →</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link to={`/watch/${b.id}`} className="mt-3 flex items-center gap-3 rounded border border-line p-2.5 hover:border-line-strong">
            <img src={nas(b.still)} alt="" className="h-10 w-16 rounded-sm object-cover" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-subtle">From the broadcast</div>
              <div className="truncate text-[13px] font-semibold">{b.title}</div>
            </div>
            <StatusChip b={ticker.find((x) => x.id === b.id) ?? b} small />
          </Link>
        </Section>
      </div>

      <Section title={`More from ${eventName}`} icon="🔥">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {more.map((x) => <ClipCard key={x.id} c={x} active={x.id === c.id} />)}
        </div>
      </Section>
      {rest.length > 0 && (
        <Section title="More highlights" icon="🎞">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {rest.map((x) => <ClipCard key={x.id} c={x} />)}
          </div>
        </Section>
      )}
      <p className="px-6 pb-4 text-[12px] text-subtle">
        Clips are free for everyone. <PlayerLink pid={c.players[0]} full className="!font-normal underline" /> and every player in a hand link to their profile.
      </p>
    </Page>
  );
}
