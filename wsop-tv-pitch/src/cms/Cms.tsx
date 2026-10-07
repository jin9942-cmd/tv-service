import { useState } from 'react';
import { Dashboard } from './Dashboard';
import { Timeline } from './Timeline';
import { HomeManager } from './HomeManager';
import { Vocabulary } from './Vocabulary';

type MenuKey = string;

/** Full menu tree. Only three screens are implemented for the demo; the rest show an "out of scope" page. */
const MENU: { group: string; items: { key: MenuKey; label: string; live?: boolean }[] }[] = [
  { group: '대시보드', items: [{ key: 'dashboard', label: '운영 현황', live: true }] },
  { group: '대회 관리', items: [{ key: 'tour', label: '투어 / 시리즈' }, { key: 'event', label: '이벤트 / 데이' }, { key: 'players', label: '선수' }] },
  { group: '편성/라이브', items: [{ key: 'schedule', label: '편성표', live: true }, { key: 'live-monitor', label: '라이브 모니터링' }, { key: 'channels', label: '송출 채널' }, { key: 'rights', label: '지역 제한 · 블랙아웃' }] },
  { group: 'VOD 관리', items: [{ key: 'vod', label: 'VOD 목록' }, { key: 'transcode', label: '트랜스코딩' }, { key: 'curation', label: '큐레이션' }, { key: 'meta', label: '핸드 · 주요 장면 태깅' }] },
  { group: '자막/AI', items: [{ key: 'vocab', label: '포커 용어 사전', live: true }, { key: 'subtitle', label: '자막 · 오디오 트랙' }] },
  { group: '전시 관리', items: [{ key: 'home', label: '메인 화면 관리', live: true }, { key: 'banner', label: '배너' }, { key: 'notice', label: '공지' }] },
  { group: '마케팅/광고', items: [{ key: 'push', label: '푸시' }, { key: 'popup', label: '팝업' }, { key: 'ads', label: '광고' }] },
  { group: '통계', items: [{ key: 'stats-view', label: '시청 통계' }, { key: 'stats-sales', label: '구독 / 매출' }] },
  { group: '회원/권한 관리', items: [{ key: 'members', label: '회원' }, { key: 'subs', label: '구독' }, { key: 'admins', label: '관리자 권한' }] },
  { group: '시스템 관리', items: [{ key: 'codes', label: '코드 관리' }, { key: 'logs', label: '작업 로그' }] },
];

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
              <button key={i.key} className={`cms-item ${active === i.key ? 'is-on' : ''} ${i.live ? '' : 'is-out'}`} onClick={() => setActive(i.key)}>
                {i.label}
                {i.live && <span className="cms-live-dot" title="데모 동작 화면" />}
              </button>
            ))}
          </div>
        ))}
        <p className="cms-nav-foot">● 표시: 데모에서 동작하는 화면</p>
      </aside>

      <section className="cms-main">
        <div className="cms-crumbs">
          {current.group} <span>›</span> <b>{current.label}</b>
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
        ) : (
          <div className="cms-out">
            <p className="cms-out-title">데모 범위 외</p>
            <p>이 메뉴는 기획안의 전체 메뉴 구조를 보여주기 위한 항목입니다. 데모에서는 운영 현황 · 편성표 · 메인 화면 관리 · 포커 용어 사전 4개 화면만 동작합니다.</p>
            <div className="cms-out-links">
              <button className="cms-btn" onClick={() => setActive('dashboard')}>
                운영 현황
              </button>
              <button className="cms-btn" onClick={() => setActive('schedule')}>
                편성표
              </button>
              <button className="cms-btn" onClick={() => setActive('home')}>
                메인 화면 관리
              </button>
              <button className="cms-btn" onClick={() => setActive('vocab')}>
                포커 용어 사전
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
