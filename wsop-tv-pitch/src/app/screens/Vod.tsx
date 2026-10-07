import { useState } from 'react';
import type { Vod, VodType } from '../../data/types';
import { series, vods } from '../../data/mock';
import { useStore } from '../../state/store';
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
  const continueList = useStore((s) => s.continueList);
  const [seek, setSeek] = useState<{ t: number; n: number }>();
  if (!v) return <Missing />;
  const moments = keyMoments(v);
  const resume = env.member !== 'guest' ? continueList.find((c) => c.vodId === v.id) : undefined;
  const se = seriesById(v.seriesId);
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
        seek={seek}
        markers={moments.map((m) => m.t)}
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

      {moments.length > 0 && (
        <section className="sec">
          <div className="sec-head">
            <h2>Key moments</h2>
          </div>
          <Note>콘텐츠 메타데이터: 대회 · 테이블 · 핸드 · 선수 · 주요 장면 태깅 → 탭하면 해당 위치로 이동</Note>
          <ul className="moments">
            {moments.map((m) => (
              <li key={m.t}>
                <button onClick={() => setSeek({ t: m.t, n: Date.now() })}>
                  <span className="moment-t">{fmtDuration(m.t)}</span>
                  <span className="moment-label">{m.label}</span>
                  <span className="tag">{m.tag}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

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

/** Mock key-moment metadata for long-form videos (tagged in the CMS). */
function keyMoments(v: Vod): { t: number; label: string; tag: string }[] {
  if (v.type !== 'Full Replay' && v.type !== 'Highlight') return [];
  const names = v.playerIds.map((id) => playerById(id)?.name).filter(Boolean) as string[];
  const at = (f: number) => Math.round(v.durationSec * f);
  return [
    { t: at(0.03), label: 'Broadcast opens · table introductions', tag: 'Table' },
    { t: at(0.21), label: names[0] ? `Player spotlight · ${names[0]}` : 'Player spotlight', tag: 'Player' },
    { t: at(0.47), label: 'Key hand of the day', tag: 'Hand' },
    { t: at(0.7), label: names[1] ? `Turning point · ${names[1]}` : 'Turning point', tag: 'Key moment' },
    { t: at(0.92), label: 'Closing moments & interview', tag: 'Interview' },
  ];
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
