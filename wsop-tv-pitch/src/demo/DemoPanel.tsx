import type { ReactNode } from 'react';
import type { Member } from '../data/types';
import { store, useStore, type Geo, type Mode } from '../state/store';
import { MEMBER_KO } from '../state/selectors';
import { DISPLAY_TZ, tzAbbr, type DisplayTz } from '../lib/time';

/** Right-hand demo settings. Changes apply to the app (and the CMS) immediately. */
export function DemoPanel() {
  const s = useStore((x) => x);
  return (
    <div className="panel">
      <h2 className="panel-title">데모 설정</h2>

      <Field label="회원 상태">
        <Seg<Member> value={s.member} options={['guest', 'free', 'basic', 'premium']} label={(m) => MEMBER_KO[m]} onChange={(member) => store.set({ member })} />
      </Field>

      <Field label="운영 모드" hint="CMS에 저장된 시즌/비시즌 홈 구성이 적용됩니다">
        <Seg<Mode> value={s.mode} options={['season', 'offseason']} label={(m) => (m === 'season' ? '시즌' : '비시즌')} onChange={(mode) => store.set({ mode })} />
      </Field>

      <Field label="진행 중 라이브 0건" hint="오늘 첫 방송 전 시각으로 데모 시계를 이동">
        <Toggle on={s.noLive} onChange={(noLive) => store.set({ noLive })} />
      </Field>

      <Field label="재생 환경" hint="DRM-02 지역 제한(라이브) · DRM-03 VPN 탐지 · LIVE-06 재생 오류">
        <Seg<Geo> value={s.geo} options={['ok', 'blackout', 'vpn', 'network']} label={(g) => GEO_KO[g]} onChange={(geo) => store.set({ geo })} />
      </Field>

      <Field label="Widevine L3 기기" hint="DRM-05 보안 등급이 낮은 기기: 화질 480p 제한 안내">
        <Toggle on={s.l3Device} onChange={(l3Device) => store.set({ l3Device })} />
      </Field>

      <Field label="구독 만료" hint="베이직·프리미엄 회원의 구독이 만료된 상태 (무료로 전환 + 갱신 안내)">
        <Toggle on={s.expired} onChange={(expired) => store.set({ expired })} />
      </Field>

      <Field label="표시 시간대" hint="앱 안의 모든 시각이 변환됩니다">
        <Seg<DisplayTz>
          value={s.tz}
          options={[...DISPLAY_TZ]}
          label={(tz) => `${tz.split('/')[1].replace('_', ' ')} (${tzAbbr(tz)})`}
          onChange={(tz) => store.set({ tz })}
        />
      </Field>

      <Field label="기획 포인트 보기" hint="앱 주요 영역 옆에 설명 말풍선 표시">
        <Toggle on={s.notes} onChange={(notes) => store.set({ notes })} />
      </Field>

      <button className="panel-relaunch" onClick={relaunch}>
        ↻ 앱 재실행 (SCR-01 스플래시 · 실행 시 팝업)
      </button>

      <div className="panel-foot">
        <p>
          홈 구성: <b>{s.mode === 'season' ? '시즌' : '비시즌'} 세트</b>
          {s.publishedAt[s.mode] ? ` · CMS 저장 ${new Date(s.publishedAt[s.mode]!).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` : ' · 기본값'}
        </p>
        <p>편성 {s.schedules.length}건 · 알림 신청 {s.alarms.length}건</p>
      </div>
    </div>
  );
}

const GEO_KO: Record<Geo, string> = { ok: '정상', blackout: '지역 제한', vpn: 'VPN', network: '오류' };

const relaunch = () => store.set((s) => ({ launchKey: s.launchKey + 1 }));

type Scenario = { n: number; group: string; text: string; set?: Parameters<typeof store.set>[0]; cms?: boolean };
const SCENARIOS: Scenario[] = [
  { n: 1, group: '홈 · 탐색', text: '비로그인 → 홈 열람 → LIVE NOW 카드 → 로그인 유도 (HOME-R2)', set: { member: 'guest' } },
  { n: 2, group: '홈 · 탐색', text: '시즌 → 비시즌: LIVE NOW 숨김, 큐레이션·인기 VOD 상단 (HOME-R6)', set: { mode: 'offseason' } },
  { n: 3, group: '홈 · 탐색', text: '라이브 0건 → 다음 라이브 카운트다운 (HOME-03)', set: { noLive: true } },
  { n: 4, group: '홈 · 탐색', text: '표시 시간대 변경 → 앱 안의 모든 시각 변환 (HOME-R4)', set: { tz: 'America/Los_Angeles' as DisplayTz } },
  { n: 5, group: '홈 · 탐색', text: '앱 재실행 → 스플래시 → 권장 업데이트 → 다시 실행하면 다음 팝업 (SCR-01 · HOME-R3)', set: (s) => ({ launchKey: s.launchKey + 1, seenPopups: [] }) },
  { n: 6, group: '시청 · 권한', text: '무료 → Premium 라이브 → 미리보기 → 구독 → 바로 시청 (SUB-04 · 05)', set: { member: 'free', geo: 'ok', expired: false } },
  { n: 7, group: '시청 · 권한', text: 'Premium → 라이브 → 언어 방송 전환 · DVR 되감기 → LIVE 복귀 · CC 자막 (LIVE-02 · 03 · VOD-04)', set: { member: 'premium', geo: 'ok', expired: false } },
  { n: 8, group: '시청 · 권한', text: 'VPN 탐지 → 차단 안내 → 해외 체류 예외 처리 (DRM-03 · 04)', set: { member: 'premium', geo: 'vpn' } },
  { n: 9, group: '시청 · 권한', text: '재생 오류 → 안내 → 재시도 (LIVE-06)', set: { member: 'premium', geo: 'network' } },
  { n: 10, group: '시청 · 권한', text: '구독 만료 → 무료로 전환 + 갱신 안내 → Renew (SUB-04)', set: { member: 'premium', expired: true, geo: 'ok' } },
  { n: 11, group: '개인화', text: '비로그인 → 편성표의 예정 방송 → “+ Watchlist” → 로그인 → MY 워치리스트 (CW-03)', set: { member: 'guest' } },
  { n: 12, group: '개인화', text: '이어보기 Edit → 수동 삭제 (홈 · MY) · 90% 이상 시청은 제외 (CW-01 · 02)', set: { member: 'free' } },
  { n: 13, group: 'CMS · 운영', text: '메인 화면 관리: LIVE NOW 0건 처리 · 순서 변경 → 저장 → 앱 반영 (HOM-001 · 004)', cms: true },
  { n: 14, group: 'CMS · 운영', text: '편성표: 편성 등록 → 라이브 자동 생성 → 앱 편성표·홈 반영 (SCH-003 · 007)', cms: true },
  { n: 15, group: 'CMS · 운영', text: '포커 용어 사전: Transcribe 반영 → 앱 자막 교정 (VOC-002 · 004)', cms: true },
  { n: 16, group: 'CMS · 운영', text: '앱 버전 관리: 강제 업데이트 · 점검 모드 → 앱 재실행 (APP-002 · 003)', cms: true },
  { n: 17, group: 'WSOP TV 전용 · 자동 제작', text: '홈 “Only on WSOP TV” → 파이널 테이블 라이브 → AI 해설 오디오 · CC 자막', set: { member: 'free', geo: 'ok', noLive: false } },
  { n: 18, group: 'WSOP TV 전용 · 자동 제작', text: 'CMS AI 자동 제작: 파이프라인 경고 → 수동 샷 지정 · AI 해설 OFF → 앱 오디오 반영', cms: true },
];

export function ScenarioGuide({ onOpenCms }: { onOpenCms: () => void }) {
  return (
    <div className="panel guide">
      <h2 className="panel-title">시연 시나리오</h2>
      {[...new Set(SCENARIOS.map((sc) => sc.group))].map((label) => ({ label, list: SCENARIOS.filter((sc) => sc.group === label) })).map((g) => (
        <div key={g.label} className="guide-group">
          <p className="guide-group-title">{g.label}</p>
          <ol>
            {g.list.map((sc) => (
              <li key={sc.n}>
                <span className="guide-n">{sc.n}</span>
                <span className="guide-text">{sc.text}</span>
                {sc.cms ? (
                  <button className="guide-go" onClick={onOpenCms}>
                    CMS 열기
                  </button>
                ) : (
                  <button className="guide-go" onClick={() => store.set(sc.set!)}>
                    준비
                  </button>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}
      <button
        className="guide-reset"
        onClick={() => store.set({ member: 'guest', mode: 'season', noLive: false, tz: 'Asia/Seoul', geo: 'ok', expired: false, l3Device: false })}
      >
        설정 기본값으로
      </button>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <div className="field-label">
        {label}
        {hint && <small>{hint}</small>}
      </div>
      {children}
    </div>
  );
}

function Seg<T extends string>({ value, options, label, onChange }: { value: T; options: T[]; label: (v: T) => string; onChange: (v: T) => void }) {
  return (
    <div className="pseg" role="radiogroup">
      {options.map((o) => (
        <button key={o} role="radio" aria-checked={o === value} className={o === value ? 'is-on' : ''} onClick={() => onChange(o)}>
          {label(o)}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`ptoggle ${on ? 'is-on' : ''}`} role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span />
      {on ? 'ON' : 'OFF'}
    </button>
  );
}
