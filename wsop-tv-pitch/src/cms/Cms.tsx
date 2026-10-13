import { useState } from 'react';
import { Dashboard } from './Dashboard';
import { Timeline } from './Timeline';
import { HomeManager } from './HomeManager';
import { Vocabulary } from './Vocabulary';
import { AppVersion } from './AppVersion';

type MenuKey = string;
interface MenuItem {
  key: MenuKey;
  label: string;
  /** Related requirement IDs (CMS 기획안 · 요구사항 v1.0). */
  req: string;
  live?: boolean;
  /** 추가 제안 메뉴 / 제외 메뉴 */
  tag?: '제안' | '제외';
}

/** Menu tree from "CMS 메뉴 구조도" (1depth > 2depth). Five screens work in the demo; the rest show their requirement IDs. */
const MENU: { group: string; items: MenuItem[] }[] = [
  { group: '대시보드', items: [{ key: 'dashboard', label: '운영 현황', req: 'DSH-001', live: true, tag: '제안' }] },
  {
    group: '대회 관리',
    items: [
      { key: 'tour', label: '투어 관리', req: 'TRN-001', tag: '제안' },
      { key: 'series', label: '시리즈(대회) 관리', req: 'TRN-002~003' },
      { key: 'event', label: '이벤트 관리', req: 'TRN-004~007', tag: '제안' },
      { key: 'players', label: '선수 관리', req: 'TRN-008~011' },
    ],
  },
  {
    group: '편성·라이브',
    items: [
      { key: 'channels', label: '송출 채널 관리', req: 'CHN-001~003', tag: '제안' },
      { key: 'schedule', label: '편성표 관리', req: 'SCH-001~010', live: true },
      { key: 'live', label: '실시간 생중계 관리', req: 'LIV-001~006' },
    ],
  },
  {
    group: 'VOD 관리',
    items: [
      { key: 'vod', label: 'VOD 관리', req: 'VOD-001~010 · 013~014' },
      { key: 'playlist', label: '플레이리스트 관리', req: 'VOD-011', tag: '제안' },
      { key: 'tags', label: '메타태그 관리', req: 'VOD-012', tag: '제안' },
      { key: 'mam', label: '포커 MAM', req: 'MAM-001~006 · VOD-010' },
      { key: 'vocab', label: '포커 용어 사전', req: 'VOC-001~004 · VOD-014', live: true },
    ],
  },
  {
    group: '전시 관리',
    items: [
      { key: 'home', label: '메인 화면 관리', req: 'HOM-001~008', live: true, tag: '제안' },
      { key: 'banner', label: '배너 관리', req: 'BNR-001~004' },
      { key: 'popup', label: '팝업 관리', req: 'POP-001~003' },
      { key: 'notice', label: '공지사항 관리', req: 'NTC-001~003' },
    ],
  },
  {
    group: '마케팅',
    items: [
      { key: 'push', label: '앱 푸시 관리', req: 'PSH-001~008' },
      { key: 'ads', label: '광고 설정', req: 'ADV-001~004 (TTN Q&A 1-3 상충 — 범위 확인)', tag: '제외' },
    ],
  },
  {
    group: '통계',
    items: [
      { key: 'stats-live', label: '실시간 LIVE 통계', req: 'STA-001' },
      { key: 'stats-uv', label: 'LIVE / UV·PV', req: 'STA-002' },
      { key: 'stats-rank', label: 'VOD 랭킹', req: 'STA-003' },
      { key: 'stats-svc', label: '서비스 지표', req: 'STA-004', tag: '제안' },
      { key: 'stats-qos', label: '재생 품질(QoS)', req: 'STA-005' },
    ],
  },
  {
    group: '회원·권한 관리',
    items: [
      { key: 'members', label: '회원 관리', req: 'MEM-001~005' },
      { key: 'staff', label: '스탭 관리', req: 'STF-001~003' },
      { key: 'roles', label: '권한 관리', req: 'ROL-001~003' },
      { key: 'logs', label: '작업 이력', req: 'ROL-004', tag: '제안' },
    ],
  },
  {
    group: '시스템 관리',
    items: [
      { key: 'appver', label: '앱 버전 관리', req: 'APP-001~002', live: true },
      { key: 'policy', label: '재생 정책', req: 'POL (미리보기 · 동시 재생 · 지역 제한 · 보존 · DVR)' },
      { key: 'maint', label: '점검 모드', req: 'APP-003', live: true, tag: '제안' },
      { key: 'codes', label: '공통 코드 관리', req: 'COD-001', tag: '제안' },
      { key: 'l10n', label: '번역 관리', req: 'LOC-001~004' },
    ],
  },
];

const LIVE_ITEMS = MENU.flatMap((g) => g.items).filter((i) => i.live && i.key !== 'maint');

export function Cms({ onOpenApp }: { onOpenApp: () => void }) {
  const [active, setActive] = useState<MenuKey>('dashboard');
  const current = MENU.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group }))).find((i) => i.key === active)!;

  return (
    <div className="cms">
      <aside className="cms-nav" aria-label="CMS 메뉴">
        <div className="cms-logo">
          WSOP TV <b>CMS</b>
        </div>
        {MENU.map((g) => (
          <div key={g.group} className="cms-group">
            <p className="cms-group-title">{g.group}</p>
            {g.items.map((i) => (
              <button
                key={i.key}
                className={`cms-item ${active === i.key ? 'is-on' : ''} ${i.live ? '' : 'is-out'} ${i.tag === '제외' ? 'is-excluded' : ''}`}
                onClick={() => setActive(i.key)}
              >
                {i.label}
                {i.tag === '제외' && <span className="cms-tag">제외</span>}
                {i.live && <span className="cms-live-dot" title="데모 동작 화면" />}
              </button>
            ))}
          </div>
        ))}
        <p className="cms-nav-foot">● 데모에서 동작하는 화면 · 메뉴는 CMS 기획안 v1.0 메뉴 구조도 기준</p>
      </aside>

      <section className="cms-main">
        <div className="cms-crumbs">
          {current.group} <span>›</span> <b>{current.label}</b>
          <span className="cms-req">{current.req}</span>
          <button className="cms-btn cms-btn-ghost cms-open-app" onClick={onOpenApp}>
            앱 데모에서 확인 →
          </button>
        </div>
        {active === 'dashboard' ? (
          <Dashboard onGo={setActive} />
        ) : active === 'schedule' ? (
          <Timeline />
        ) : active === 'home' ? (
          <HomeManager />
        ) : active === 'vocab' ? (
          <Vocabulary />
        ) : active === 'appver' || active === 'maint' ? (
          <AppVersion focus={active === 'maint' ? 'maint' : 'version'} />
        ) : (
          <div className="cms-out">
            <p className="cms-out-title">{current.tag === '제외' ? '범위 제외 메뉴' : '데모 범위 외'}</p>
            <p>
              <b>{current.label}</b> · 관련 요구사항 <b>{current.req}</b>
            </p>
            <p>
              {current.tag === '제외'
                ? '광고 설정은 내부 “1단계 광고 제외” 결정과 TTN 질의응답(SCTE-35 · GAM CSAI 출시일 제공)이 상충해 범위 확인 중입니다.'
                : '이 메뉴는 CMS 기획안의 전체 메뉴 구조를 보여주기 위한 항목입니다. 입력 항목과 규칙은 CMS 기획안 · 요구사항 v1.0 엑셀에 정리되어 있습니다.'}
            </p>
            <div className="cms-out-links">
              {LIVE_ITEMS.map((i) => (
                <button key={i.key} className="cms-btn" onClick={() => setActive(i.key)}>
                  {i.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
