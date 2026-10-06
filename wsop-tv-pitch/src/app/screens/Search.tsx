import { useState } from 'react';
import { players, popularSearches, series, vods } from '../../data/mock';
import { store, useStore } from '../../state/store';
import { Icon, Note, useEnv } from '../ui';
import { PlayerAvatar, SeriesCard, VodCard } from './Home';
import { useNow } from '../../state/selectors';

type Tab = 'vod' | 'player' | 'series';

export function Search() {
  const env = useEnv();
  const now = useNow(60_000);
  const recent = useStore((s) => s.recentSearches);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('vod');
  const term = q.trim().toLowerCase();

  const vodHits = term ? vods.filter((v) => `${v.title} ${v.type} ${v.description}`.toLowerCase().includes(term)) : [];
  const playerHits = term ? players.filter((p) => `${p.name} ${p.country}`.toLowerCase().includes(term)) : [];
  const seriesHits = term ? series.filter((s) => `${s.name} ${s.city} ${s.tour}`.toLowerCase().includes(term)) : [];
  const counts = { vod: vodHits.length, player: playerHits.length, series: seriesHits.length };

  const run = (text: string) => {
    setQ(text);
    const t = text.trim();
    if (t) store.set((s) => ({ recentSearches: [t, ...s.recentSearches.filter((x) => x !== t)].slice(0, 6) }));
  };

  return (
    <div>
      <header className="subhead search-head">
        <button className="icon-btn" aria-label="Back" onClick={env.back}>
          <Icon name="back" />
        </button>
        <form
          className="search-box"
          onSubmit={(e) => {
            e.preventDefault();
            run(q);
          }}
        >
          <Icon name="search" size={18} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Videos, players, tournaments" aria-label="Search" />
          {q && (
            <button type="button" aria-label="Clear" onClick={() => setQ('')}>
              <Icon name="close" size={16} />
            </button>
          )}
        </form>
      </header>

      {!term ? (
        <div className="screen-pad">
          {recent.length > 0 && (
            <>
              <h3 className="mini-title">Recent searches</h3>
              <div className="tag-cloud">
                {recent.map((r) => (
                  <button key={r} className="chip" onClick={() => run(r)}>
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}
          <h3 className="mini-title">Popular searches</h3>
          <ol className="popular">
            {popularSearches.map((p, i) => (
              <li key={p}>
                <button onClick={() => run(p)}>
                  <b>{i + 1}</b> {p}
                </button>
              </li>
            ))}
          </ol>
          <Note side="inline">최근 검색어 · 인기 검색어 · VOD/선수/대회 탭별 결과</Note>
        </div>
      ) : (
        <>
          <div className="seg">
            {(['vod', 'player', 'series'] as Tab[]).map((t) => (
              <button key={t} className={t === tab ? 'is-on' : ''} onClick={() => setTab(t)}>
                {t === 'vod' ? 'VOD' : t === 'player' ? 'Players' : 'Tournaments'} {counts[t]}
              </button>
            ))}
          </div>
          {tab === 'vod' && (vodHits.length ? <div className="vod-grid">{vodHits.map((v) => <VodCard key={v.id} v={v} width="lg" />)}</div> : <Empty q={q} />)}
          {tab === 'player' &&
            (playerHits.length ? (
              <ul className="list">
                {playerHits.map((p) => (
                  <li key={p.id}>
                    <button className="player-row" onClick={() => env.push({ name: 'player', playerId: p.id })}>
                      <PlayerAvatar name={p.name} hue={p.hue} size={44} />
                      <span>
                        <b>{p.name}</b>
                        <small>
                          {p.flag} {p.country}
                        </small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty q={q} />
            ))}
          {tab === 'series' && (seriesHits.length ? <div className="stack">{seriesHits.map((s) => <SeriesCard key={s.id} id={s.id} now={now} />)}</div> : <Empty q={q} />)}
        </>
      )}
    </div>
  );
}

const Empty = ({ q }: { q: string }) => <p className="empty-line">No results for “{q}”.</p>;
