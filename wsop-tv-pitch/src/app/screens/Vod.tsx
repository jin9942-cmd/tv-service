import { useState } from 'react';
import type { VodType } from '../../data/types';
import { continueWatching, series, vods } from '../../data/mock';
import { eventLabel, playerById, seriesById, vodById } from '../../state/selectors';
import { fmtCount, fmtDate, fmtDuration } from '../../lib/time';
import { MockPlayer } from '../Player';
import { Note, TierBadge, useEnv } from '../ui';
import { AppHeader, PlayerAvatar, VodCard } from './Home';
import { Missing, SubHead } from './LivePlayer';
import { MyListButton } from '../MyList';

const TYPES: VodType[] = ['Full Replay', 'Highlight', 'Clip', 'Hand', 'Interview', 'Shorts'];

export function VodTab() {
  const [seriesId, setSeriesId] = useState('');
  const [type, setType] = useState<VodType | ''>('');
  const [sort, setSort] = useState<'latest' | 'popular'>('latest');
  const list = vods
    .filter((v) => (!seriesId || v.seriesId === seriesId) && (!type || v.type === type))
    .sort((a, b) => (sort === 'latest' ? b.publishedAt.localeCompare(a.publishedAt) : b.views - a.views));

  return (
    <div>
      <AppHeader title="VOD" />
      <div className="chip-row">
        <button className={`chip ${!type ? 'is-on' : ''}`} onClick={() => setType('')}>
          All
        </button>
        {TYPES.map((t) => (
          <button key={t} className={`chip ${type === t ? 'is-on' : ''}`} onClick={() => setType(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="select-row">
        <select value={seriesId} onChange={(e) => setSeriesId(e.target.value)} aria-label="Tournament">
          <option value="">All tournaments</option>
          {series.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name.replace('2026 ', '')}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as 'latest' | 'popular')} aria-label="Sort">
          <option value="latest">Latest</option>
          <option value="popular">Most popular</option>
        </select>
      </div>
      <div className="vod-grid">
        {list.map((v) => (
          <VodCard key={v.id} v={v} width="lg" />
        ))}
      </div>
      {!list.length && <p className="empty-line">No videos match these filters.</p>}
    </div>
  );
}

export function VodDetail({ vodId }: { vodId: string }) {
  const env = useEnv();
  const v = vodById(vodId);
  if (!v) return <Missing />;
  const se = seriesById(v.seriesId);
  const resume = env.member !== 'guest' ? continueWatching.find((c) => c.vodId === v.id) : undefined;
  const sameEvent = vods.filter((x) => x.id !== v.id && v.eventId && x.eventId === v.eventId).slice(0, 6);
  const samePlayer = vods.filter((x) => x.id !== v.id && !sameEvent.includes(x) && x.playerIds.some((p) => v.playerIds.includes(p))).slice(0, 6);

  return (
    <div className="vod-screen">
      <SubHead title={v.title} />
      <MockPlayer
        hue={se.hue + 20}
        title={v.type}
        sub={se.name}
        tier={v.tier}
        contentTitle={v.title}
        durationSec={v.durationSec}
        resumeAt={resume ? Math.round(v.durationSec * resume.progress) : 0}
      />
      <div className="detail">
        <div className="detail-badges">
          <TierBadge tier={v.tier} />
          <span className="tag">{v.type}</span>
          <span className="tag">{fmtDuration(v.durationSec)}</span>
          <span className="tag">{fmtCount(v.views)} views</span>
        </div>
        <h2 className="detail-title">{v.title}</h2>
        <div className="detail-actions">
          <MyListButton kind="vod" id={v.id} />
        </div>
        {resume && (
          <p className="resume-line">
            Resume from {fmtDuration(Math.round(v.durationSec * resume.progress))}
            <Note side="inline">이어보기 위치에서 재생</Note>
          </p>
        )}
        {v.description && <p className="detail-desc">{v.description}</p>}
        <button className="info-row" onClick={() => env.push({ name: 'series', seriesId: se.id })}>
          <span className="tour">{se.tour}</span>
          <span>
            <b>{se.name}</b>
            <small>
              {eventLabel(v)} · {fmtDate(v.publishedAt, env.tz)}
            </small>
          </span>
        </button>
      </div>

      {v.playerIds.length > 0 && (
        <section className="sec">
          <div className="sec-head">
            <h2>Players</h2>
            <Note>출연 선수 (선수 ↔ VOD N:M)</Note>
          </div>
          <div className="hscroll">
            {v.playerIds.map((id) => {
              const p = playerById(id)!;
              return (
                <button key={id} className="player-chip" onClick={() => env.push({ name: 'player', playerId: id })}>
                  <PlayerAvatar name={p.name} hue={p.hue} size={56} />
                  <span className="player-name">{p.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <Related title="More from this event" list={sameEvent} />
      <Related title="More with these players" list={samePlayer} />
    </div>
  );
}

function Related({ title, list }: { title: string; list: typeof vods }) {
  if (!list.length) return null;
  return (
    <section className="sec">
      <div className="sec-head">
        <h2>{title}</h2>
      </div>
      <div className="hscroll">
        {list.map((x) => (
          <VodCard key={x.id} v={x} />
        ))}
      </div>
    </section>
  );
}
