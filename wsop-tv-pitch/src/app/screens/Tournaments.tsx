import { useState } from 'react';
import type { SeriesPhase, TourId } from '../../data/types';
import { events, series, tours, vods } from '../../data/mock';
import { useStore } from '../../state/store';
import { phaseOf, seriesById, statusOf, useNow } from '../../state/selectors';
import { Art, Note } from '../ui';
import { AppHeader, LiveCard, ScheduleRow, SeriesCard, VodCard, fmtSeriesDates } from './Home';
import { SubHead } from './LivePlayer';

const GROUPS: { phase: SeriesPhase; label: string }[] = [
  { phase: 'ongoing', label: 'On now' },
  { phase: 'upcoming', label: 'Upcoming' },
  { phase: 'ended', label: 'Completed' },
];

export function TournamentsTab() {
  const now = useNow(60_000);
  const [tour, setTour] = useState<TourId | ''>('');
  const list = series.filter((x) => !tour || x.tour === tour);
  return (
    <div>
      <AppHeader title="Tournaments" />
      <div className="chip-row">
        <button className={`chip ${!tour ? 'is-on' : ''}`} onClick={() => setTour('')}>
          All
        </button>
        {tours.map((t) => (
          <button key={t} className={`chip ${tour === t ? 'is-on' : ''}`} onClick={() => setTour(t)}>
            {t}
          </button>
        ))}
      </div>
      {GROUPS.map((g) => {
        const items = list.filter((x) => phaseOf(x, now) === g.phase);
        if (!items.length) return null;
        return (
          <section className="sec" key={g.phase}>
            <div className="sec-head">
              <h2>{g.label}</h2>
            </div>
            <div className="stack">
              {items.map((x) => (
                <SeriesCard key={x.id} id={x.id} now={now} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function SeriesDetail({ seriesId }: { seriesId: string }) {
  const now = useNow(5000);
  const schedules = useStore((s) => s.schedules);
  const se = seriesById(seriesId);
  const evs = events.filter((e) => e.seriesId === seriesId).sort((a, b) => a.number - b.number);
  const slots = schedules.filter((s) => s.visible && s.seriesId === seriesId);
  const live = slots.filter((s) => statusOf(s, now) === 'live');
  const upcoming = slots.filter((s) => statusOf(s, now) === 'upcoming').sort((a, b) => a.start.localeCompare(b.start)).slice(0, 5);
  const seriesVods = vods.filter((v) => v.seriesId === seriesId).slice(0, 8);
  const phase = phaseOf(se, now);

  return (
    <div>
      <SubHead title={se.name} />
      <Art hue={se.hue} title={se.name} sub={`${se.venue} · ${se.city}`} ratio="16/8" className="hero-art">
        <span className="art-tl tour">{se.tour}</span>
        {phase === 'ongoing' && <span className="art-tr phase">ON NOW</span>}
      </Art>
      <div className="detail">
        <h2 className="detail-title">{se.name}</h2>
        <p className="detail-meta">
          {fmtSeriesDates(se.start, se.end)} · {se.venue}, {se.city}
        </p>
        <p className="detail-meta">Local time zone: {se.timezone}</p>
      </div>

      {live.length > 0 && (
        <section className="sec">
          <div className="sec-head">
            <h2>Live now</h2>
          </div>
          <div className="hscroll">
            {live.map((s) => (
              <LiveCard key={s.id} s={s} now={now} />
            ))}
          </div>
        </section>
      )}

      <section className="sec">
        <div className="sec-head">
          <h2>Events</h2>
          <Note>시리즈 › 이벤트 › 데이(Flight)</Note>
        </div>
        <ul className="list event-list">
          {evs.map((e) => (
            <li key={e.id} className="event-row">
              <span className="event-no">#{e.number}</span>
              <span className="event-body">
                <b>
                  {e.buyIn} {e.name}
                </b>
                <small>{e.days.map((d) => `${d.label} ${shortDate(d.date)}`).join(' · ')}</small>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {upcoming.length > 0 && (
        <section className="sec">
          <div className="sec-head">
            <h2>Broadcast schedule</h2>
          </div>
          <ul className="sched-list">
            {upcoming.map((s) => (
              <ScheduleRow key={s.id} s={s} now={now} />
            ))}
          </ul>
        </section>
      )}

      {seriesVods.length > 0 && (
        <section className="sec">
          <div className="sec-head">
            <h2>Videos</h2>
          </div>
          <div className="hscroll">
            {seriesVods.map((v) => (
              <VodCard key={v.id} v={v} />
            ))}
          </div>
        </section>
      )}
      {!live.length && !upcoming.length && !seriesVods.length && <p className="empty-line">Broadcast details coming soon.</p>}
      <div style={{ height: 24 }} />
    </div>
  );
}

const shortDate = (d: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`));
