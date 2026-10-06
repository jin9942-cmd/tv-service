import type { ReactNode } from 'react';
import type { Member } from '../data/types';
import { store, useStore, type Mode } from '../state/store';
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

const SCENARIOS = [
  { n: 1, text: '비로그인 → 홈 → LIVE NOW 카드 → 로그인 유도', set: { member: 'guest' as Member } },
  { n: 2, text: '무료 → Premium 라이브 → 미리보기 → 구독 안내 → Premium 구독 → 바로 시청', set: { member: 'free' as Member } },
  { n: 3, text: 'Premium → 라이브 → 다른 언어 방송 전환 → 다음 편성 알림 신청', set: { member: 'premium' as Member } },
  { n: 4, text: '시즌 → 비시즌 전환: LIVE NOW 숨김, VOD 섹션 위로', set: { mode: 'offseason' as Mode } },
  { n: 5, text: '라이브 0건 ON → 다음 라이브 카운트다운', set: { noLive: true } },
  { n: 6, text: 'CMS 메인 화면 관리: 순서 변경/숨김 → 저장 → 앱 즉시 반영', cms: true },
  { n: 7, text: 'CMS 편성표: 편성 추가 → 앱 편성표·오늘의 편성 반영', cms: true },
  { n: 8, text: '시간대 변경 → 앱 안의 모든 시각 변환', set: { tz: 'America/Los_Angeles' as DisplayTz } },
];

export function ScenarioGuide({ onOpenCms }: { onOpenCms: () => void }) {
  return (
    <div className="panel guide">
      <h2 className="panel-title">시연 시나리오</h2>
      <ol>
        {SCENARIOS.map((sc) => (
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
      <button
        className="guide-reset"
        onClick={() => store.set({ member: 'guest', mode: 'season', noLive: false, tz: 'Asia/Seoul' })}
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
