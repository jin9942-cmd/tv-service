import { channels, opsToday, vods } from '../data/mock';
import { toast, useStore } from '../state/store';
import { liveNow, schedulesOnDay, seriesById, statusOf, useNow, viewersOf } from '../state/selectors';
import { dateKey, fmtKo } from '../lib/time';

const KST = 'Asia/Seoul';

export function Dashboard({ onGo }: { onGo: (k: string) => void }) {
  const now = useNow(5000);
  const schedules = useStore((s) => s.schedules);
  const today = schedulesOnDay(schedules, dateKey(now, KST), KST);
  const live = liveNow(schedules, now);
  const totalViewers = live.reduce((n, s) => n + viewersOf(s, now), 0);
  const recent = [...vods].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 6);
  const failedIds = new Set(opsToday.transcodeFailures.map((f) => f.vodId));

  const signalOf = (chId: string) => {
    const ch = channels.find((c) => c.id === chId)!;
    const onAir = live.find((s) => s.channelId === chId);
    if (ch.signal === 'error') return { cls: 'err', text: '오류', onAir };
    if (onAir) return { cls: 'ok', text: '정상', onAir };
    return ch.signal === 'no-signal' ? { cls: 'idle', text: '신호 없음', onAir } : { cls: 'ok', text: '정상 (대기)', onAir };
  };
  const signalIssues = channels.filter((c) => signalOf(c.id).cls !== 'ok').length;

  return (
    <div className="cms-page">
      <div className="cms-page-head">
        <h1>운영 현황</h1>
        <p className="cms-sub">기준 시각 {fmtKo(new Date(now).toISOString())} (KST)</p>
      </div>

      <div className="kpis">
        <Kpi label="오늘 편성" value={`${today.length}건`} sub={`예정 ${today.filter((s) => statusOf(s, now) === 'upcoming').length} · 종료 ${today.filter((s) => statusOf(s, now) === 'ended').length}`} onClick={() => onGo('schedule')} />
        <Kpi label="진행 중 라이브" value={`${live.length}건`} sub={`동시접속 ${totalViewers.toLocaleString('ko-KR')}명`} tone={live.length ? 'live' : undefined} />
        <Kpi label="송출 채널 이상" value={`${signalIssues}채널`} sub="신호 없음 / 오류" tone={signalIssues ? 'warn' : undefined} />
        <Kpi label="트랜스코딩 실패" value={`${opsToday.transcodeFailures.length}건`} sub="재시도 필요" tone={opsToday.transcodeFailures.length ? 'err' : undefined} />
      </div>

      <div className="cms-grid">
        <div className="card-box">
          <h2>송출 채널 신호 상태</h2>
          <table className="tbl">
            <thead>
              <tr>
                <th>채널</th>
                <th>현재 송출</th>
                <th>동접</th>
                <th>신호</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => {
                const sg = signalOf(c.id);
                return (
                  <tr key={c.id}>
                    <td>
                      <b>{c.id}</b> <span className="muted">{c.name}</span>
                    </td>
                    <td>{sg.onAir ? sg.onAir.title : <span className="muted">—</span>}</td>
                    <td>{sg.onAir ? viewersOf(sg.onAir, now).toLocaleString('ko-KR') : '—'}</td>
                    <td>
                      <span className={`badge b-${sg.cls}`}>{sg.text}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card-box">
          <h2>오늘 예약 (푸시 / 배너 / 팝업)</h2>
          <table className="tbl">
            <thead>
              <tr>
                <th>구분</th>
                <th>시각</th>
                <th>내용</th>
                <th>대상</th>
              </tr>
            </thead>
            <tbody>
              {[
                ...opsToday.pushes.map((x) => ({ ...x, kind: '푸시' })),
                ...opsToday.banners.map((x) => ({ ...x, kind: '배너' })),
                ...opsToday.popups.map((x) => ({ ...x, kind: '팝업' })),
              ]
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((x, i) => (
                  <tr key={i}>
                    <td>
                      <span className="badge b-info">{x.kind}</span>
                    </td>
                    <td>{fmtKo(x.time)}</td>
                    <td>{x.title}</td>
                    <td className="muted">{x.target}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="card-box">
          <h2>최근 등록 VOD</h2>
          <table className="tbl">
            <thead>
              <tr>
                <th>제목</th>
                <th>대회</th>
                <th>등급</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((v) => (
                <tr key={v.id}>
                  <td>{v.title}</td>
                  <td className="muted">{seriesById(v.seriesId).name.replace('2026 WSOP ', '')}</td>
                  <td>
                    <span className={`badge b-tier-${v.tier}`}>{v.tier === 'free' ? 'Free' : v.tier === 'basic' ? 'Basic' : 'Premium'}</span>
                  </td>
                  <td>{failedIds.has(v.id) ? <span className="badge b-err">일부 실패</span> : <span className="badge b-ok">게시</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card-box">
          <h2>트랜스코딩 실패</h2>
          {opsToday.transcodeFailures.length ? (
            <table className="tbl">
              <thead>
                <tr>
                  <th>대상</th>
                  <th>사유</th>
                  <th>발생</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {opsToday.transcodeFailures.map((f) => (
                  <tr key={f.vodId}>
                    <td>{f.title}</td>
                    <td className="muted">{f.reason}</td>
                    <td>{fmtKo(f.at)}</td>
                    <td>
                      <button className="cms-btn cms-btn-sm" onClick={() => toast('트랜스코딩 재시도 요청됨 (데모)', 'cms')}>
                        재시도
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">실패 건 없음</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, tone, onClick }: { label: string; value: string; sub: string; tone?: 'live' | 'warn' | 'err'; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`kpi ${tone ? `kpi-${tone}` : ''}`} onClick={onClick}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      <span className="kpi-sub">{sub}</span>
    </Tag>
  );
}
