import { useState } from 'react';
import type { Schedule } from '../data/types';
import { store, toast, useStore } from '../state/store';
import { seriesById, sourceOf, statusOf, useNow, viewersOf } from '../state/selectors';
import { fmtKo } from '../lib/time';

/** Auto-production pipeline for one final table. */
const STAGES = [
  { key: 'rfid', label: 'RFID 인식', sub: '카드·칩 → EBS' },
  { key: 'ebs', label: 'EBS', sub: '그래픽·데이터' },
  { key: 'cam', label: 'AI 카메라', sub: '샷 자동 전환' },
  { key: 'mic', label: 'AI 마이크', sub: '오디오 믹스' },
  { key: 'ai', label: 'AI 해설', sub: 'EN · ES' },
  { key: 'out', label: '송출', sub: 'WSOP TV 앱' },
  { key: 'vod', label: 'Quick VOD', sub: '종료 즉시' },
] as const;
type StageKey = (typeof STAGES)[number]['key'];
type StageState = 'ok' | 'warn' | 'wait' | 'off' | 'done';

const ROADMAP = [
  { step: '1단계', when: '~6개월', title: 'RFID 업체 연동', body: '파이널 테이블 카드·칩 데이터를 EBS로 자동 수신 → 그래픽 자동 생성' },
  { step: '2단계', when: '~12개월', title: 'AI 카메라 · 마이크', body: '좌석·액션 인식으로 샷 전환과 오디오 믹스를 자동으로 구성' },
  { step: '3단계', when: '~24개월', title: 'AI 해설자', body: 'EBS 데이터와 화면을 바탕으로 다국어 해설 자동 생성 (R&D 담당 지정 필요)' },
];

/**
 * 편성·라이브 › AI 자동 제작 (신규 제안).
 * Goal: one operator covers every bracelet final table (~250 a year) — RFID → EBS, AI camera/mic, AI commentary.
 */
export function AutoProduction() {
  const now = useNow(5000);
  const schedules = useStore((s) => s.schedules);
  const ai = useStore((s) => s.aiCommentary);
  const covered = useStore((s) => s.autoCovered);
  const [resolved, setResolved] = useState<string[]>([]);
  const [manual, setManual] = useState<string[]>([]);

  // One row per final table (EN feed is the master; ES uses the same pipeline with AI commentary in Spanish).
  const tables = schedules
    .filter((s) => s.visible && sourceOf(s) === 'exclusive' && s.lang === 'EN')
    .filter((s) => Math.abs(Date.parse(s.start) - now) < 36 * 3_600_000)
    .sort((a, b) => order(statusOf(a, now)) - order(statusOf(b, now)) || a.start.localeCompare(b.start));
  const liveTables = tables.filter((s) => statusOf(s, now) === 'live');

  const incidents = liveTables
    .map((s) => ({ id: `${s.id}-cam`, table: s, stage: 'cam' as StageKey, text: 'AI 카메라: 7번 좌석 프레이밍 신뢰도 낮음 (62%)' }))
    .filter((i) => !resolved.includes(i.id));

  const stageState = (s: Schedule, k: StageKey): StageState => {
    const st = statusOf(s, now);
    if (k === 'ai' && !ai) return 'off';
    if (st === 'ended') return 'done';
    if (st === 'upcoming') return k === 'vod' ? 'wait' : Date.parse(s.start) - now < 2 * 3_600_000 ? 'ok' : 'wait';
    if (k === 'vod') return 'wait';
    if (k === 'cam' && incidents.some((i) => i.table.id === s.id)) return 'warn';
    return 'ok';
  };

  return (
    <div className="cms-page">
      <div className="cms-page-head">
        <h1>AI 자동 제작</h1>
        <p className="cms-sub">
          WSOP TV에만 있는 모든 Bracelet 파이널 테이블을 자동으로 제작합니다. RFID → EBS → AI 카메라·마이크 → AI 해설 → 송출까지 한 화면에서 관제하고, 문제가 생긴 단계만 운영자가 개입합니다.
        </p>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span className="kpi-label">올해 파이널 테이블</span>
          <span className="kpi-value">
            {covered} / 250
          </span>
          <span className="kpi-sub">자동 제작 커버 {Math.round((covered / 250) * 100)}% · 목표: 전체 커버</span>
        </div>
        <div className={`kpi ${liveTables.length ? 'kpi-live' : ''}`}>
          <span className="kpi-label">지금 자동 제작 중</span>
          <span className="kpi-value">{liveTables.length}개 테이블</span>
          <span className="kpi-sub">예정 {tables.filter((s) => statusOf(s, now) === 'upcoming').length} · 오늘 종료 {tables.filter((s) => statusOf(s, now) === 'ended').length}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">운영 인원</span>
          <span className="kpi-value">1명</span>
          <span className="kpi-sub">목표 Max 1명 · 테이블당 0명 상주</span>
        </div>
        <div className={`kpi ${incidents.length ? 'kpi-warn' : ''}`}>
          <span className="kpi-label">개입 필요</span>
          <span className="kpi-value">{incidents.length}건</span>
          <span className="kpi-sub">수동 전환 {manual.length}건</span>
        </div>
      </div>

      <div className="card-box ap-box">
        <div className="ap-head">
          <h2>파이널 테이블 파이프라인</h2>
          <label className="ap-toggle">
            <button
              className={`cms-switch sm ${ai ? 'is-on' : ''}`}
              role="switch"
              aria-checked={ai}
              onClick={() => {
                store.set({ aiCommentary: !ai });
                toast(ai ? 'AI 해설 OFF · 앱은 현장음으로 전환' : 'AI 해설 ON · 앱 오디오에 AI commentary 노출', 'cms');
              }}
            >
              <i />
              {ai ? 'ON' : 'OFF'}
            </button>
            AI 해설 (앱 오디오 트랙에 반영)
          </label>
        </div>
        <table className="tbl ap-tbl">
          <thead>
            <tr>
              <th>파이널 테이블</th>
              <th>상태</th>
              {STAGES.map((st) => (
                <th key={st.key}>
                  {st.label}
                  <small>{st.sub}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tables.map((s) => {
              const st = statusOf(s, now);
              return (
                <tr key={s.id}>
                  <td>
                    <b>{s.title}</b>
                    <small className="muted-cell ap-sub">
                      {seriesById(s.seriesId).name.replace('2026 WSOP ', '')} · {fmtKo(s.start).replace(/^\d{4}\. /, '')} · EN/ES
                    </small>
                  </td>
                  <td>
                    <span className={`st ${st === 'live' ? 'st-err' : st === 'upcoming' ? 'st-wait' : 'st-ok'}`}>
                      {st === 'live' ? `LIVE · ${viewersOf(s, now).toLocaleString('ko-KR')}명` : st === 'upcoming' ? '예정' : '종료'}
                    </span>
                    {manual.includes(s.id) && <span className="st st-wait ap-manual">수동</span>}
                  </td>
                  {STAGES.map((k) => {
                    const v = stageState(s, k.key);
                    return (
                      <td key={k.key}>
                        <span className={`ap-dot ap-${v}`} title={v}>
                          {v === 'ok' ? '정상' : v === 'warn' ? '확인' : v === 'off' ? 'OFF' : v === 'done' ? '완료' : '대기'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="cms-grid ap-grid">
        <div className="card-box">
          <h2>운영자 알림 (1인 관제)</h2>
          {incidents.length ? (
            <ul className="ap-alerts">
              {incidents.map((i) => (
                <li key={i.id}>
                  <span>
                    <b>{i.table.title}</b>
                    <small>{i.text}</small>
                  </span>
                  <button
                    className="cms-btn cms-btn-sm cms-btn-primary"
                    onClick={() => {
                      setResolved((r) => [...r, i.id]);
                      setManual((m) => [...m, i.table.id]);
                      toast('운영자가 샷을 수동 지정했습니다 · 이후 AI 카메라로 자동 복귀', 'cms');
                    }}
                  >
                    수동 샷 지정
                  </button>
                  <button className="cms-btn cms-btn-sm" onClick={() => setResolved((r) => [...r, i.id])}>
                    무시
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted-cell">개입이 필요한 항목이 없습니다. 모든 파이널 테이블이 자동으로 진행 중입니다.</p>
          )}
          <button className="cms-btn cms-btn-sm" onClick={() => store.set((s) => ({ autoCovered: Math.min(250, s.autoCovered + 1) }))}>
            + 종료된 파이널 테이블 1개 집계 (데모)
          </button>
        </div>

        <div className="card-box">
          <h2>콘텐츠 3분류</h2>
          <ol className="ap-tax">
            <li>
              <b>① ESPN 방송</b>
              <span>ESPN이 제작 · 현재 논외</span>
            </li>
            <li>
              <b>② YouTube 방송</b>
              <span>Feature Table · 이번 여름 방식으로 지속 고도화 · 앱에서는 “Also on YouTube” 표시</span>
            </li>
            <li className="is-key">
              <b>③ WSOP TV 전용</b>
              <span>모든 Bracelet 파이널 테이블 · 자동 제작 대상 · 앱 홈 “Only on WSOP TV”</span>
            </li>
          </ol>
        </div>
      </div>

      <div className="card-box">
        <h2>로드맵 · 1~2년 안에 완성</h2>
        <div className="ap-road">
          {ROADMAP.map((r) => (
            <div key={r.step} className="ap-step">
              <span className="ap-step-n">
                {r.step} <small>{r.when}</small>
              </span>
              <b>{r.title}</b>
              <span>{r.body}</span>
            </div>
          ))}
          <div className="ap-step is-goal">
            <span className="ap-step-n">목표</span>
            <b>운영자 1명 × 연 250개</b>
            <span>모든 Bracelet 파이널 테이블을 사람 없이 자동 제작 · EBS와 WSOP TV 앱 연동 세팅이 전제</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const order = (st: string) => (st === 'live' ? 0 : st === 'upcoming' ? 1 : 2);
