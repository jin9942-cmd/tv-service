import { useEffect, useRef } from 'react';
import { APP_VERSION, store, toast, useStore, type LaunchConfig } from '../state/store';

const lt = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }) < 0;

const PLATFORMS: { name: string; store: string; os: string }[] = [
  { name: 'iOS (iPhone)', store: 'App Store', os: 'iOS 16+' },
  { name: 'iPadOS', store: 'App Store', os: 'iPadOS 16+' },
  { name: 'Android Mobile', store: 'Google Play', os: 'Android 10+' },
  { name: 'Android Tablet', store: 'Google Play', os: 'Android 10+' },
  { name: 'Android TV', store: 'Google Play', os: 'Android TV 10+' },
  { name: 'Apple TV (tvOS)', store: 'App Store', os: 'tvOS 16+' },
  { name: 'Samsung Tizen', store: 'Seller Office', os: 'Tizen 6.5+ (2022~)' },
  { name: 'LG webOS', store: 'Seller Lounge', os: 'webOS 6.0+ (2022~)' },
  { name: 'Roku TV', store: 'Roku Channel Store', os: 'Roku OS 11+' },
  { name: 'PC Web', store: '— (스토어 없음)', os: 'Chrome · Firefox · Safari 최신 2개' },
];

/** 시스템 관리 › 앱 버전 관리 (APP-001~002) · 점검 모드 (APP-003). Relaunch the demo app to see the launch order (HOME-R3). */
export function AppVersion({ focus }: { focus: 'version' | 'maint' }) {
  const cfg = useStore((s) => s.launch);
  const seen = useStore((s) => s.seenPopups);
  const maintRef = useRef<HTMLDivElement>(null);
  const set = (p: Partial<LaunchConfig>) => store.set((s) => ({ launch: { ...s.launch, ...p } }));

  useEffect(() => {
    if (focus === 'maint') maintRef.current?.scrollIntoView({ block: 'start' });
  }, [focus]);

  const relaunch = () => {
    store.set((s) => ({ launchKey: s.launchKey + 1 }));
    toast('앱 데모를 재실행했습니다 · 앱 데모 탭에서 확인', 'cms');
  };

  return (
    <div className="cms-page">
      <div className="cms-page-head">
        <h1>앱 버전 · 점검 모드</h1>
        <p className="cms-sub">
          플랫폼별 최신 · 최소 지원 버전과 점검 모드를 관리합니다. 최소 버전 미만은 강제 업데이트(닫기 불가), 최신 버전 미만은 권장 업데이트(닫기 가능)입니다. 데모 앱 버전은 <b>{APP_VERSION}</b>입니다.
        </p>
        <button className="cms-btn cms-btn-primary head-action" onClick={relaunch}>
          앱 재실행해서 확인
        </button>
      </div>

      <div className="card-box">
        <h2>플랫폼별 버전 (APP-001 · Phase 1 10개)</h2>
        <table className="tbl">
          <thead>
            <tr>
              <th>플랫폼</th>
              <th>최소 지원 OS</th>
              <th>최신 버전</th>
              <th>최소 지원 버전</th>
              <th>스토어</th>
              <th>데모 앱 결과</th>
            </tr>
          </thead>
          <tbody>
            {PLATFORMS.map((p, i) => (
              <tr key={p.name}>
                <td>
                  <b>{p.name}</b>
                  {i === 0 && <span className="st st-ok av-demo">데모 앱</span>}
                </td>
                <td className="muted-cell">{p.os}</td>
                <td>{i === 0 ? <input className="av-input" value={cfg.latestVersion} onChange={(e) => set({ latestVersion: e.target.value })} /> : cfg.latestVersion}</td>
                <td>{i === 0 ? <input className="av-input" value={cfg.minVersion} onChange={(e) => set({ minVersion: e.target.value })} /> : cfg.minVersion}</td>
                <td className="muted-cell">{p.store}</td>
                <td>{i === 0 ? <Result cfg={cfg} /> : <span className="muted-cell">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="av-presets">
          <span className="muted-cell">빠른 설정:</span>
          <button className="cms-btn cms-btn-sm" onClick={() => set({ minVersion: '1.8.0', latestVersion: '2.1.0' })}>
            권장 업데이트 (최신 2.1.0)
          </button>
          <button className="cms-btn cms-btn-sm" onClick={() => set({ minVersion: '2.1.0', latestVersion: '2.1.0' })}>
            강제 업데이트 (최소 2.1.0)
          </button>
          <button className="cms-btn cms-btn-sm" onClick={() => set({ minVersion: '1.8.0', latestVersion: APP_VERSION })}>
            업데이트 없음
          </button>
        </div>
      </div>

      <div className="cms-grid av-grid" ref={maintRef}>
        <div className="card-box">
          <h2>점검 모드 (APP-003)</h2>
          <label className="av-row">
            <button className={`cms-switch sm ${cfg.maintenance ? 'is-on' : ''}`} role="switch" aria-checked={cfg.maintenance} onClick={() => set({ maintenance: !cfg.maintenance })}>
              <i />
              {cfg.maintenance ? '사용' : '미사용'}
            </button>
            점검 중에는 앱 진입 시 점검 안내만 노출
          </label>
          <label className="av-field">
            안내 문구 (다국어)
            <textarea rows={3} value={cfg.maintenanceText} onChange={(e) => set({ maintenanceText: e.target.value })} />
          </label>
          <p className="muted-cell">화이트리스트: qa01@wsop.test, qa02@wsop.test (테스트 계정은 진입 허용) · 대상 플랫폼: 전체</p>
        </div>

        <div className="card-box">
          <h2>앱 실행 시 노출 순서 (HOME-R3)</h2>
          <ol className="av-order">
            <li className={lt(APP_VERSION, cfg.minVersion) ? 'is-on' : ''}>강제 업데이트</li>
            <li className={cfg.maintenance ? 'is-on' : ''}>점검 모드</li>
            <li className={cfg.systemPopup || lt(APP_VERSION, cfg.latestVersion) ? 'is-on' : ''}>시스템 팝업 (권장 업데이트 포함)</li>
            <li className={cfg.imagePopup ? 'is-on' : ''}>이미지 팝업</li>
          </ol>
          <p className="muted-cell">상위 항목이 뜨면 하위 팝업은 다음 진입 시 노출합니다. 팝업은 전시 관리 › 팝업 관리(POP-001~003)에서 등록합니다.</p>
          <label className="av-check">
            <input type="checkbox" checked={cfg.systemPopup} onChange={(e) => set({ systemPopup: e.target.checked })} /> 시스템 팝업 “Service notice” 게시 중
          </label>
          <label className="av-check">
            <input type="checkbox" checked={cfg.imagePopup} onChange={(e) => set({ imagePopup: e.target.checked })} /> 이미지 팝업 “Main Event Final Table” 게시 중
          </label>
          <button className="cms-btn cms-btn-sm" disabled={!seen.length} onClick={() => store.set({ seenPopups: [] })}>
            팝업 노출 이력 초기화 ({seen.length})
          </button>
        </div>
      </div>
    </div>
  );
}

function Result({ cfg }: { cfg: LaunchConfig }) {
  if (lt(APP_VERSION, cfg.minVersion)) return <span className="st st-err">강제 업데이트</span>;
  if (lt(APP_VERSION, cfg.latestVersion)) return <span className="st st-wait">권장 업데이트</span>;
  return <span className="st st-ok">최신</span>;
}
