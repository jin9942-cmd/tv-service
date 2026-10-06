import { vods } from '../../data/mock';
import { playerById } from '../../state/selectors';
import { fmtMoney } from '../../lib/time';
import { Note } from '../ui';
import { PlayerAvatar, VodCard } from './Home';
import { Missing, SubHead } from './LivePlayer';

export function PlayerDetail({ playerId }: { playerId: string }) {
  const p = playerById(playerId);
  if (!p) return <Missing />;
  const related = vods.filter((v) => v.playerIds.includes(p.id));
  return (
    <div>
      <SubHead title={p.name} />
      <div className="profile">
        <PlayerAvatar name={p.name} hue={p.hue} size={96} />
        <h2 className="detail-title">{p.name}</h2>
        <p className="detail-meta">
          {p.flag} {p.country}
        </p>
        <p className="fictional">Fictional demo player</p>
      </div>
      <dl className="stats">
        <div>
          <dt>Bracelets</dt>
          <dd>{p.bracelets}</dd>
        </div>
        <div>
          <dt>Rings</dt>
          <dd>{p.rings}</dd>
        </div>
        <div>
          <dt>Earnings</dt>
          <dd>{fmtMoney(p.earnings)}</dd>
        </div>
      </dl>
      <section className="sec">
        <div className="sec-head">
          <h2>Videos</h2>
          <Note>선수 ↔ VOD N:M 매핑으로 관련 영상 자동 노출</Note>
        </div>
        {related.length ? (
          <div className="vod-grid">
            {related.map((v) => (
              <VodCard key={v.id} v={v} width="lg" />
            ))}
          </div>
        ) : (
          <p className="empty-line">No videos yet.</p>
        )}
      </section>
    </div>
  );
}
