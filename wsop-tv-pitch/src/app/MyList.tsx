// My List (favourites): save videos, players and tournaments, then find them again in MY.
import { useState } from 'react';
import type { MyListItem, MyListKind } from '../data/types';
import { toast, toggleMyList, useStore } from '../state/store';
import { playerById, seriesById, vodById } from '../state/selectors';
import { fmtDuration } from '../lib/time';
import { Art, Icon, Note, TierBadge, useEnv } from './ui';
import { PlayerAvatar, fmtSeriesDates } from './screens/Home';
import { SubHead } from './screens/LivePlayer';

const LABEL: Record<MyListKind, { add: string; saved: string }> = {
  vod: { add: '+ My List', saved: '✓ In My List' },
  player: { add: '☆ Favorite', saved: '★ Favorited' },
  series: { add: '☆ Save', saved: '★ Saved' },
};

export function useInMyList(kind: MyListKind, id: string) {
  return useStore((s) => s.myList.some((x) => x.kind === kind && x.id === id));
}

/** Add/remove toggle used on detail screens. Guests are asked to log in, then the item is saved. */
export function MyListButton({ kind, id }: { kind: MyListKind; id: string }) {
  const env = useEnv();
  const saved = useInMyList(kind, id);
  const toggle = () => {
    if (env.member === 'guest') {
      return env.sheet({
        kind: 'login',
        reason: 'Log in to save videos, players and tournaments to My List.',
        then: () => {
          toggleMyList(kind, id);
          toast('Added to My List');
        },
      });
    }
    toast(toggleMyList(kind, id) ? 'Added to My List' : 'Removed from My List');
  };
  return (
    <button className={`mylist-btn ${saved ? 'is-on' : ''}`} aria-pressed={saved} onClick={toggle}>
      {saved ? LABEL[kind].saved : LABEL[kind].add}
    </button>
  );
}

/** One saved item, rendered by type. */
function ItemRow({ item, removable }: { item: MyListItem; removable?: boolean }) {
  const env = useEnv();
  let body = null;
  let open: () => void = () => {};
  if (item.kind === 'vod') {
    const v = vodById(item.id);
    if (!v) return null;
    const se = seriesById(v.seriesId);
    open = () => env.push({ name: 'vod', vodId: v.id });
    body = (
      <>
        <Art hue={se.hue + 20} title={v.type} className="ml-thumb" />
        <span className="ml-text">
          <b>{v.title}</b>
          <small>
            Video · {fmtDuration(v.durationSec)} · <TierBadge tier={v.tier} />
          </small>
        </span>
      </>
    );
  } else if (item.kind === 'player') {
    const p = playerById(item.id);
    if (!p) return null;
    open = () => env.push({ name: 'player', playerId: p.id });
    body = (
      <>
        <span className="ml-thumb ml-avatar">
          <PlayerAvatar name={p.name} hue={p.hue} size={44} />
        </span>
        <span className="ml-text">
          <b>{p.name}</b>
          <small>
            Player · {p.flag} {p.country}
          </small>
        </span>
      </>
    );
  } else {
    const se = seriesById(item.id);
    if (!se) return null;
    open = () => env.push({ name: 'series', seriesId: se.id });
    body = (
      <>
        <Art hue={se.hue} title={se.tour} className="ml-thumb" />
        <span className="ml-text">
          <b>{se.name}</b>
          <small>Tournament · {fmtSeriesDates(se.start, se.end)}</small>
        </span>
      </>
    );
  }
  return (
    <li className="ml-row">
      <button className="ml-open" onClick={open}>
        {body}
      </button>
      {removable && (
        <button
          className="ml-remove"
          aria-label="Remove from My List"
          onClick={() => {
            toggleMyList(item.kind, item.id);
            toast('Removed from My List');
          }}
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </li>
  );
}

/** MY tab block: latest four items + "See all". */
export function MyListPreview() {
  const env = useEnv();
  const list = useStore((s) => s.myList);
  if (env.member === 'guest') {
    return (
      <section className="sec">
        <div className="sec-head">
          <h2>My List</h2>
        </div>
        <div className="screen-pad">
          <button className="ml-empty" onClick={() => env.sheet({ kind: 'login', reason: 'Log in to keep your favourite videos, players and tournaments in one place.' })}>
            <b>Save what you love</b>
            <span>Log in to build your list of videos, players and tournaments.</span>
          </button>
        </div>
      </section>
    );
  }
  return (
    <section className="sec">
      <div className="sec-head">
        <h2>
          My List <span className="ml-count">{list.length}</span>
        </h2>
        {list.length > 0 && (
          <button className="sec-more" onClick={() => env.push({ name: 'mylist' })}>
            See all <Icon name="chevron" size={14} />
          </button>
        )}
      </div>
      <Note>즐겨찾기(My List): VOD · 선수 · 대회 상세에서 저장 → MY에서 모아보기</Note>
      {list.length ? (
        <ul className="list">
          {list.slice(0, 4).map((it) => (
            <ItemRow key={`${it.kind}-${it.id}`} item={it} />
          ))}
        </ul>
      ) : (
        <div className="screen-pad">
          <button className="ml-empty" onClick={() => env.goTab('vod')}>
            <b>Your list is empty</b>
            <span>Tap “+ My List” on any video, or favourite a player or tournament.</span>
          </button>
        </div>
      )}
    </section>
  );
}

type Filter = 'all' | MyListKind;
const FILTERS: { f: Filter; label: string }[] = [
  { f: 'all', label: 'All' },
  { f: 'vod', label: 'Videos' },
  { f: 'player', label: 'Players' },
  { f: 'series', label: 'Tournaments' },
];

/** Full My List screen with type filter and remove buttons. */
export function MyListScreen() {
  const env = useEnv();
  const list = useStore((s) => s.myList);
  const [filter, setFilter] = useState<Filter>('all');
  const shown = list.filter((x) => filter === 'all' || x.kind === filter);
  const count = (f: Filter) => (f === 'all' ? list.length : list.filter((x) => x.kind === f).length);

  return (
    <div>
      <SubHead title="My List" />
      <div className="seg">
        {FILTERS.map(({ f, label }) => (
          <button key={f} className={filter === f ? 'is-on' : ''} onClick={() => setFilter(f)}>
            {label} {count(f)}
          </button>
        ))}
      </div>
      {shown.length ? (
        <ul className="list">
          {shown.map((it) => (
            <ItemRow key={`${it.kind}-${it.id}`} item={it} removable />
          ))}
        </ul>
      ) : (
        <div className="screen-pad">
          <button className="ml-empty" onClick={() => env.goTab(filter === 'player' ? 'home' : filter === 'series' ? 'tournaments' : 'vod')}>
            <b>Nothing here yet</b>
            <span>{filter === 'player' ? 'Open a player and tap ☆ Favorite.' : filter === 'series' ? 'Open a tournament and tap ☆ Save.' : 'Tap “+ My List” on any video.'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
