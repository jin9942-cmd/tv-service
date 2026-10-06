import { useState } from 'react';
import { channels, series } from '../../data/mock';
import { useStore } from '../../state/store';
import { schedulesOnDay, useNow } from '../../state/selectors';
import { addDays, dateKey, fmtDate, tzAbbr } from '../../lib/time';
import { Note, useEnv } from '../ui';
import { AppHeader, ScheduleRow } from './Home';

export function ScheduleTab() {
  const env = useEnv();
  const now = useNow(1000);
  const schedules = useStore((s) => s.schedules);
  const today = dateKey(now, env.tz);
  const days = [-1, 0, 1, 2, 3].map((n) => addDays(today, n));
  const [day, setDay] = useState(today);
  const [seriesId, setSeriesId] = useState('');
  const [channel, setChannel] = useState('');
  const [lang, setLang] = useState('');

  const list = schedulesOnDay(schedules, day, env.tz).filter(
    (s) => (!seriesId || s.seriesId === seriesId) && (!channel || s.channelId === channel) && (!lang || s.lang === lang),
  );
  const label = (k: string) => (k === today ? 'Today' : k === addDays(today, 1) ? 'Tomorrow' : k === addDays(today, -1) ? 'Yesterday' : fmtDate(`${k}T12:00:00Z`, 'UTC'));

  return (
    <div>
      <AppHeader title="Schedule" />
      <div className="seg">
        {days.map((k) => (
          <button key={k} className={k === day ? 'is-on' : ''} onClick={() => setDay(k)}>
            {label(k)}
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
        <select value={channel} onChange={(e) => setChannel(e.target.value)} aria-label="Channel">
          <option value="">All channels</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id}
            </option>
          ))}
        </select>
        <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
          <option value="">All languages</option>
          {['EN', 'ES', 'PT'].map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </div>
      <p className="tz-line">
        Times in {env.tz.split('/')[1].replace('_', ' ')} ({tzAbbr(env.tz)})
        <Note>모든 시각은 데모 설정 시간대로 변환 · Upcoming=알림, LIVE=플레이어, Ended=다시보기</Note>
      </p>
      {list.length ? (
        <ul className="sched-list">
          {list.map((s) => (
            <ScheduleRow key={s.id} s={s} now={now} />
          ))}
        </ul>
      ) : (
        <p className="empty-line">No broadcasts match these filters.</p>
      )}
    </div>
  );
}
