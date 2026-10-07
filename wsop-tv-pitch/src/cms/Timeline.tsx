import { useEffect, useMemo, useRef, useState } from 'react';
import type { BroadcastType, Lang, Schedule, Tier } from '../data/types';
import { channels, events, series } from '../data/mock';
import { addSchedule, toast, useStore } from '../state/store';
import { eventLabel, seriesById, statusOf, useNow, vodById } from '../state/selectors';
import { addDays, dateKey, fmtKo, utcToZoned, zonedToUtc } from '../lib/time';

const KST = 'Asia/Seoul';
const HOUR_PX = 64;
const DAY_MS = 86_400_000;

/** 편성표: time × output channel. Blocks are coloured by series. */
export function Timeline() {
  const now = useNow(30_000);
  const schedules = useStore((s) => s.schedules);
  const [view, setView] = useState<'day' | 'week'>('day');
  const [day, setDay] = useState(() => dateKey(Date.now(), KST));
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const dayStart = Date.parse(zonedToUtc(day, '00:00', KST));
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(day, i)), [day]);
  const sel = schedules.find((s) => s.id === selected);

  // Day view opens scrolled to "now" (or 08:00 on other days).
  useEffect(() => {
    if (view !== 'day' || !scroller.current) return;
    const nowH = (now - dayStart) / 3_600_000;
    const h = nowH >= 0 && nowH < 24 ? nowH - 2 : 8;
    scroller.current.scrollLeft = Math.max(0, h * HOUR_PX);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, day]);

  const seriesInUse = series.filter((se) => schedules.some((s) => s.seriesId === se.id));

  return (
    <div className="cms-page">
      <div className="cms-page-head">
        <h1>편성표</h1>
        <p className="cms-sub">방송 1건 = 시간 슬롯 × 송출 채널 · 표시 기준 KST · 저장 시 라이브 자동 생성</p>
        <button className="cms-btn cms-btn-primary head-action" onClick={() => setCreating(true)}>
          + 편성 등록
        </button>
      </div>

      <div className="tl-toolbar">
        <div className="cms-seg">
          <button className={view === 'day' ? 'is-on' : ''} onClick={() => setView('day')}>
            일
          </button>
          <button className={view === 'week' ? 'is-on' : ''} onClick={() => setView('week')}>
            주
          </button>
        </div>
        <div className="tl-nav">
          <button className="cms-btn cms-btn-sm" onClick={() => setDay(addDays(day, view === 'day' ? -1 : -7))} aria-label="이전">
            ‹
          </button>
          <button className="cms-btn cms-btn-sm" onClick={() => setDay(dateKey(Date.now(), KST))}>
            오늘
          </button>
          <button className="cms-btn cms-btn-sm" onClick={() => setDay(addDays(day, view === 'day' ? 1 : 7))} aria-label="다음">
            ›
          </button>
          <b className="tl-date">
            {view === 'day' ? koDate(day) : `${koDate(day)} ~ ${koDate(addDays(day, 6))}`}
          </b>
        </div>
        <div className="tl-legend">
          {seriesInUse.map((se) => (
            <span key={se.id}>
              <i style={{ background: color(se.hue) }} />
              {se.name.replace('2026 WSOP ', '')}
            </span>
          ))}
        </div>
      </div>

      <div className={`tl-wrap ${sel ? 'has-panel' : ''}`}>
        {view === 'day' ? (
          <div className="tl-day" ref={scroller}>
            <div className="tl-grid" style={{ width: 24 * HOUR_PX + 90 }}>
              <div className="tl-hours">
                <span className="tl-corner">채널</span>
                {Array.from({ length: 24 }, (_, h) => (
                  <span key={h} style={{ left: 90 + h * HOUR_PX }}>
                    {String(h).padStart(2, '0')}:00
                  </span>
                ))}
              </div>
              {channels.map((c) => (
                <div key={c.id} className="tl-row">
                  <div className="tl-ch">
                    <b>{c.id}</b>
                    <small>{c.name}</small>
                  </div>
                  <div className="tl-lane">
                    {Array.from({ length: 24 }, (_, h) => (
                      <i key={h} className="tl-hline" style={{ left: h * HOUR_PX }} />
                    ))}
                    {schedules
                      .filter((s) => s.channelId === c.id)
                      .map((s) => {
                        const a = Math.max(Date.parse(s.start), dayStart);
                        const b = Math.min(Date.parse(s.end), dayStart + DAY_MS);
                        if (b <= a) return null;
                        const st = statusOf(s, now);
                        return (
                          <button
                            key={s.id}
                            className={`tl-block is-${st} ${s.id === selected ? 'is-sel' : ''} ${s.visible ? '' : 'is-hidden'}`}
                            style={{ left: ((a - dayStart) / 3_600_000) * HOUR_PX, width: Math.max(18, ((b - a) / 3_600_000) * HOUR_PX - 3), background: color(seriesById(s.seriesId).hue) }}
                            onClick={() => setSelected(s.id)}
                            title={s.title}
                          >
                            <b>{s.title}</b>
                            <small>
                              {fmtKo(s.start).split(' ').pop()}~{fmtKo(s.end).split(' ').pop()} · {s.lang}
                              {st === 'live' ? ' · LIVE' : ''}
                              {s.originalStart ? ' · 변경' : ''}
                            </small>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
              {now >= dayStart && now < dayStart + DAY_MS && <i className="tl-now" style={{ left: 90 + ((now - dayStart) / 3_600_000) * HOUR_PX }} />}
            </div>
          </div>
        ) : (
          <div className="tl-week">
            <table className="tbl tbl-week">
              <thead>
                <tr>
                  <th>채널</th>
                  {weekDays.map((d) => (
                    <th key={d}>{koDate(d)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {channels.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <b>{c.id}</b>
                    </td>
                    {weekDays.map((d) => (
                      <td key={d}>
                        {schedules
                          .filter((s) => s.channelId === c.id && dateKey(s.start, KST) === d)
                          .sort((a, b) => a.start.localeCompare(b.start))
                          .map((s) => (
                            <button key={s.id} className={`wk-chip ${s.id === selected ? 'is-sel' : ''}`} style={{ borderLeftColor: color(seriesById(s.seriesId).hue) }} onClick={() => setSelected(s.id)}>
                              <b>{fmtKo(s.start).split(' ').pop()}</b> {s.title}
                            </button>
                          ))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sel && <DetailPanel s={sel} now={now} onClose={() => setSelected(null)} />}
      </div>

      {creating && (
        <ScheduleModal
          day={day}
          onClose={() => setCreating(false)}
          onSaved={(s) => {
            setCreating(false);
            setDay(dateKey(s.start, KST));
            setView('day');
            setSelected(s.id);
          }}
        />
      )}
    </div>
  );
}

const color = (hue: number) => `hsl(${hue} 62% 46%)`;
const koDate = (key: string) => {
  const d = new Date(`${key}T12:00:00Z`);
  return new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short', timeZone: 'UTC' }).format(d);
};

function DetailPanel({ s, now, onClose }: { s: Schedule; now: number; onClose: () => void }) {
  const se = seriesById(s.seriesId);
  const st = statusOf(s, now);
  const local = (iso: string) => {
    const z = utcToZoned(iso, se.timezone);
    return `${z.date} ${z.time}`;
  };
  return (
    <aside className="tl-panel" aria-label="편성 상세">
      <div className="tl-panel-head">
        <span className={`badge ${st === 'live' ? 'b-live' : st === 'upcoming' ? 'b-info' : 'b-muted'}`}>{st === 'live' ? '진행 중' : st === 'upcoming' ? '예정' : '종료'}</span>
        <button className="cms-x" onClick={onClose} aria-label="닫기">
          ×
        </button>
      </div>
      <h3>{s.title}</h3>
      <dl className="kv">
        <dt>대회 매핑</dt>
        <dd>
          {se.name}
          <br />
          {eventLabel(s)}
        </dd>
        <dt>현지 시각</dt>
        <dd>
          {local(s.start)} ~ {local(s.end).slice(11)} <span className="muted">({se.timezone})</span>
        </dd>
        <dt>KST</dt>
        <dd>
          {fmtKo(s.start)} ~ {fmtKo(s.end).split(' ').pop()}
        </dd>
        {s.originalStart && (
          <>
            <dt>변경 이력</dt>
            <dd>
              기존 {fmtKo(s.originalStart)} → 변경 (앱에 Changed 표시)
            </dd>
          </>
        )}
        <dt>방송 구분</dt>
        <dd>{s.type}</dd>
        <dt>송출 채널</dt>
        <dd>{s.channelId}</dd>
        <dt>제작 언어</dt>
        <dd>{s.lang}</dd>
        <dt>시청 권한</dt>
        <dd>
          <span className={`badge b-tier-${s.tier}`}>{s.tier === 'free' ? 'Free' : s.tier === 'basic' ? 'Basic' : 'Premium'}</span>
        </dd>
        <dt>노출</dt>
        <dd>{s.visible ? '노출' : '숨김'}</dd>
        <dt>연결</dt>
        <dd>
          라이브 LIVE-{s.id.replace(/^sc-n?/, '')}
          {s.vodId && <> · VOD “{vodById(s.vodId)?.title}”</>}
        </dd>
      </dl>
    </aside>
  );
}

// ---- 편성 등록 ------------------------------------------------------------------

function ScheduleModal({ day, onClose, onSaved }: { day: string; onClose: () => void; onSaved: (s: Schedule) => void }) {
  const schedules = useStore((s) => s.schedules);
  const [seriesId, setSeriesId] = useState('ser-paradise');
  const se = seriesById(seriesId);
  const evs = events.filter((e) => e.seriesId === seriesId);
  const [eventId, setEventId] = useState('ev-p13');
  const ev = evs.find((e) => e.id === eventId) ?? evs[0];
  // Default to the flight running today (series-local calendar).
  const [dayId, setDayId] = useState(() => (ev?.days.find((d) => d.date === dateKey(Date.now(), se.timezone)) ?? ev?.days[0])?.id ?? '');

  // Default slot: next full hour, 90 min, in the series' local time zone.
  const defaults = useMemo(() => {
    const startMs = Math.ceil(Date.now() / 3_600_000) * 3_600_000;
    const a = utcToZoned(new Date(startMs).toISOString(), se.timezone);
    const b = utcToZoned(new Date(startMs + 90 * 60_000).toISOString(), se.timezone);
    return { a, b };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);
  const [title, setTitle] = useState('Paradise Daily — Live Update');
  const [startDate, setStartDate] = useState(defaults.a.date);
  const [startTime, setStartTime] = useState(defaults.a.time);
  const [endDate, setEndDate] = useState(defaults.b.date);
  const [endTime, setEndTime] = useState(defaults.b.time);
  const [type, setType] = useState<BroadcastType>('Highlight Show');
  const [channelId, setChannelId] = useState<Schedule['channelId']>('CH-04');
  const [lang, setLang] = useState<Lang>('EN');
  const [tier, setTier] = useState<Tier>('free');
  const [visible, setVisible] = useState(true);
  const [ack, setAck] = useState(false);

  const startIso = safeZoned(startDate, startTime, se.timezone);
  const endIso = safeZoned(endDate, endTime, se.timezone);
  const validTime = startIso && endIso && Date.parse(endIso) > Date.parse(startIso);
  const conflicts =
    validTime ? schedules.filter((s) => s.channelId === channelId && Date.parse(s.start) < Date.parse(endIso!) && Date.parse(startIso!) < Date.parse(s.end)) : [];
  const canSave = !!title.trim() && !!validTime && !!dayId && (!conflicts.length || ack);

  useEffect(() => setAck(false), [channelId, startDate, startTime, endDate, endTime]);

  const save = () => {
    if (!canSave) return;
    const s: Schedule = {
      id: `sc-n${String(schedules.length + 1).padStart(2, '0')}`,
      title: title.trim(),
      seriesId,
      eventId: ev.id,
      dayId,
      type,
      channelId,
      lang,
      tier,
      start: startIso!,
      end: endIso!,
      visible,
      baseViewers: 1800,
    };
    addSchedule(s);
    toast(`편성 저장 완료 · 라이브 자동 생성됨 (LIVE-${s.id.slice(4)})`, 'cms');
    toast(visible ? '앱 편성표 · 홈 “Schedule”에 즉시 반영되었습니다' : '노출 꺼짐: 앱에는 표시되지 않습니다', 'cms');
    onSaved(s);
  };

  return (
    <div className="cms-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cms-modal" role="dialog" aria-modal="true" aria-labelledby="new-sched">
        <div className="cms-modal-head">
          <h2 id="new-sched">편성 등록</h2>
          <button className="cms-x" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>

        <div className="form">
          <label className="f-row">
            <span>방송 제목 *</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <div className="f-row">
            <span>대회 매핑 *</span>
            <div className="f-inline">
              <select
                value={seriesId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSeriesId(id);
                  const first = events.find((x) => x.seriesId === id);
                  setEventId(first?.id ?? '');
                  setDayId(first?.days[0]?.id ?? '');
                }}
                aria-label="시리즈"
              >
                {series.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
              <select
                value={ev?.id}
                onChange={(e) => {
                  setEventId(e.target.value);
                  setDayId(events.find((x) => x.id === e.target.value)?.days[0]?.id ?? '');
                }}
                aria-label="이벤트"
              >
                {evs.map((x) => (
                  <option key={x.id} value={x.id}>
                    #{x.number} {x.name}
                  </option>
                ))}
              </select>
              <select value={dayId} onChange={(e) => setDayId(e.target.value)} aria-label="데이">
                {ev?.days.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="f-row">
            <span>
              시작 / 종료 *<small>대회 현지 타임존 입력 ({se.timezone})</small>
            </span>
            <div className="f-time">
              <div>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} aria-label="시작일" />
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} aria-label="시작 시각" />
                <small className="kst">{startIso ? `KST ${fmtKo(startIso)}` : '—'}</small>
              </div>
              <span className="f-tilde">~</span>
              <div>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} aria-label="종료일" />
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} aria-label="종료 시각" />
                <small className="kst">{endIso ? `KST ${fmtKo(endIso)}` : '—'}</small>
              </div>
            </div>
            {!validTime && <p className="f-err">종료 시각이 시작 시각보다 늦어야 합니다.</p>}
          </div>

          <div className="f-row">
            <span>방송 구분</span>
            <div className="cms-seg">
              {(['Feature Table', 'Final Table', 'Highlight Show'] as BroadcastType[]).map((t) => (
                <button key={t} type="button" className={type === t ? 'is-on' : ''} onClick={() => setType(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="f-grid">
            <label className="f-row">
              <span>송출 채널</span>
              <select value={channelId} onChange={(e) => setChannelId(e.target.value as Schedule['channelId'])}>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} · {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="f-row">
              <span>제작 언어</span>
              <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
                {['EN', 'ES', 'PT'].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
            <div className="f-row">
              <span>시청 권한</span>
              <div className="cms-seg">
                {(['free', 'basic', 'premium'] as Tier[]).map((t) => (
                  <button key={t} type="button" className={tier === t ? 'is-on' : ''} onClick={() => setTier(t)}>
                    {t === 'free' ? 'Free' : t === 'basic' ? 'Basic' : 'Premium'}
                  </button>
                ))}
              </div>
            </div>
            <div className="f-row">
              <span>노출 여부</span>
              <button type="button" className={`cms-switch ${visible ? 'is-on' : ''}`} role="switch" aria-checked={visible} onClick={() => setVisible(!visible)}>
                <i />
                {visible ? '노출' : '숨김'}
              </button>
            </div>
          </div>

          {conflicts.length > 0 && (
            <div className="f-warn" role="alert">
              <b>⚠ 같은 채널({channelId})에 시간이 겹치는 편성이 있습니다</b>
              <ul>
                {conflicts.map((c) => (
                  <li key={c.id}>
                    {c.title} · {fmtKo(c.start)} ~ {fmtKo(c.end).split(' ').pop()}
                  </li>
                ))}
              </ul>
              <label>
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> 겹침을 확인했고 그대로 저장합니다
              </label>
            </div>
          )}
        </div>

        <div className="cms-modal-foot">
          <button className="cms-btn" onClick={onClose}>
            취소
          </button>
          <button className="cms-btn cms-btn-primary" disabled={!canSave} onClick={save}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function safeZoned(date: string, time: string, tz: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  return zonedToUtc(date, time, tz);
}
