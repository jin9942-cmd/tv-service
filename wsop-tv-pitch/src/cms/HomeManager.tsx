import { useEffect, useState } from 'react';
import type { HomeSection, HomeSectionId, Member } from '../data/types';
import { ALL_MEMBERS } from '../data/mock';
import { publishLayout, store, toast, useStore, type Mode } from '../state/store';
import { MEMBER_KO } from '../state/selectors';
import { AppPhone } from '../app/AppPhone';

const SECTION_LABEL: Record<HomeSectionId, { ko: string; en: string }> = {
  banner: { ko: '메인 배너', en: 'Main banner' },
  liveNow: { ko: 'LIVE NOW', en: 'Live now' },
  todaySchedule: { ko: '오늘의 편성', en: 'Today’s schedule' },
  tournaments: { ko: '대회', en: 'Tournaments' },
  strip: { ko: '띠배너', en: 'Promo strip' },
  curation: { ko: '큐레이션 VOD', en: 'Curated VOD' },
  popular: { ko: '인기 VOD TOP 10', en: 'Top 10' },
  continue: { ko: '이어보기', en: 'Continue watching' },
  shorts: { ko: '쇼츠', en: 'Shorts' },
  players: { ko: '선수', en: 'Players' },
  notice: { ko: '공지', en: 'Notice' },
};

/** 메인 화면 관리: edit the season / off-season home sets and publish them to the app instantly. */
export function HomeManager() {
  const published = useStore((s) => s.layouts);
  const publishedAt = useStore((s) => s.publishedAt);
  const appMode = useStore((s) => s.mode);
  const [set, setSet] = useState<Mode>(appMode);
  const [drafts, setDrafts] = useState<Record<Mode, HomeSection[]>>(published);
  const [previewMember, setPreviewMember] = useState<Member>('free');
  const [dragId, setDragId] = useState<HomeSectionId | null>(null);
  const draft = drafts[set];
  const dirty = JSON.stringify(draft) !== JSON.stringify(published[set]);

  // If the published layout changes elsewhere, keep untouched drafts in sync.
  useEffect(() => {
    setDrafts((d) => ({
      season: JSON.stringify(d.season) === JSON.stringify(published.season) ? published.season : d.season,
      offseason: JSON.stringify(d.offseason) === JSON.stringify(published.offseason) ? published.offseason : d.offseason,
    }));
  }, [published]);

  const update = (next: HomeSection[]) => setDrafts((d) => ({ ...d, [set]: next }));
  const patch = (id: HomeSectionId, p: Partial<HomeSection>) => update(draft.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= draft.length || from === to) return;
    const next = [...draft];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    update(next);
  };
  const toggleAudience = (s: HomeSection, m: Member) =>
    patch(s.id, { audiences: s.audiences.includes(m) ? s.audiences.filter((x) => x !== m) : ALL_MEMBERS.filter((x) => x === m || s.audiences.includes(x)) });

  const save = () => {
    publishLayout(set, draft);
    toast(`${set === 'season' ? '시즌' : '비시즌'} 구성 저장 완료 · 앱 홈에 즉시 반영 (앱 배포 없음)`, 'cms');
    if (set !== appMode) toast(`현재 앱은 ${appMode === 'season' ? '시즌' : '비시즌'} 모드입니다. “운영 적용”으로 전환할 수 있습니다`, 'cms');
  };

  return (
    <div className="cms-page">
      <div className="cms-page-head">
        <h1>메인 화면 관리</h1>
        <p className="cms-sub">홈 섹션의 순서 · 노출 · 노출 대상 등급을 관리합니다. 저장하면 앱 배포 없이 바로 반영됩니다. 헤더와 하단 탭바는 고정 영역이라 목록에서 제외됩니다.</p>
      </div>

      <div className="hm-top">
        <div className="cms-seg big">
          {(['season', 'offseason'] as Mode[]).map((m) => (
            <button key={m} className={set === m ? 'is-on' : ''} onClick={() => setSet(m)}>
              {m === 'season' ? '시즌 구성' : '비시즌 구성'}
              {appMode === m && <span className="applied">운영 중</span>}
            </button>
          ))}
        </div>
        <p className="hm-meta">
          {publishedAt[set] ? `마지막 저장 ${new Date(publishedAt[set]!).toLocaleTimeString('ko-KR')}` : '기본 구성'}
          {dirty && <span className="badge b-warn">저장 안 된 변경</span>}
        </p>
        <div className="hm-actions">
          <button className="cms-btn" disabled={!dirty} onClick={() => update(published[set])}>
            변경 취소
          </button>
          <button className="cms-btn cms-btn-primary" disabled={!dirty} onClick={save}>
            저장 (앱 즉시 반영)
          </button>
          <button
            className="cms-btn"
            disabled={appMode === set}
            onClick={() => {
              store.set({ mode: set });
              toast(`운영 모드를 ${set === 'season' ? '시즌' : '비시즌'}으로 전환 · 앱 홈 구성이 바뀌었습니다`, 'cms');
            }}
          >
            {appMode === set ? '운영 적용 중' : '이 구성으로 운영 적용'}
          </button>
        </div>
      </div>

      <div className="hm-body">
        <div className="card-box hm-list">
          <div className="hm-fixed">헤더 (고정 영역)</div>
          <ol>
            {draft.map((s, i) => (
              <li
                key={s.id}
                className={`hm-item ${s.visible ? '' : 'is-off'} ${dragId === s.id ? 'is-drag' : ''}`}
                draggable
                onDragStart={(e) => {
                  setDragId(s.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragId && dragId !== s.id) move(draft.findIndex((x) => x.id === dragId), i);
                }}
                onDragEnd={() => setDragId(null)}
              >
                <span className="hm-handle" aria-hidden="true">
                  ⋮⋮
                </span>
                <span className="hm-order">{i + 1}</span>
                <span className="hm-name">
                  <b>{SECTION_LABEL[s.id].ko}</b>
                  <small>{SECTION_LABEL[s.id].en}</small>
                </span>
                <span className="hm-aud" role="group" aria-label="노출 대상 등급">
                  {ALL_MEMBERS.map((m) => (
                    <button key={m} className={s.audiences.includes(m) ? 'is-on' : ''} aria-pressed={s.audiences.includes(m)} onClick={() => toggleAudience(s, m)}>
                      {MEMBER_KO[m]}
                    </button>
                  ))}
                </span>
                <button className={`cms-switch sm ${s.visible ? 'is-on' : ''}`} role="switch" aria-checked={s.visible} aria-label={`${SECTION_LABEL[s.id].ko} 노출`} onClick={() => patch(s.id, { visible: !s.visible })}>
                  <i />
                  {s.visible ? '노출' : '숨김'}
                </button>
                <span className="hm-move">
                  <button aria-label="위로" onClick={() => move(i, i - 1)} disabled={i === 0}>
                    ▲
                  </button>
                  <button aria-label="아래로" onClick={() => move(i, i + 1)} disabled={i === draft.length - 1}>
                    ▼
                  </button>
                </span>
              </li>
            ))}
          </ol>
          <div className="hm-fixed">하단 탭바 (고정 영역)</div>
          <p className="hm-hint">드래그하거나 ▲▼로 순서를 바꿉니다. 데이터가 없는 섹션(예: 라이브 0건일 때 다음 라이브도 없으면)은 앱에서 자동으로 숨겨집니다.</p>
        </div>

        <div className="hm-preview">
          <div className="hm-preview-bar">
            <span>미리보기</span>
            <div className="cms-seg">
              {ALL_MEMBERS.map((m) => (
                <button key={m} className={previewMember === m ? 'is-on' : ''} onClick={() => setPreviewMember(m)}>
                  {MEMBER_KO[m]}
                </button>
              ))}
            </div>
          </div>
          <p className="hm-preview-note">
            {set === 'season' ? '시즌' : '비시즌'} 구성 · {MEMBER_KO[previewMember]} 기준 · {dirty ? '저장 전 초안' : '저장된 구성'}
          </p>
          <div className="phone phone-sm">
            <div className="phone-notch" />
            <AppPhone preview={{ member: previewMember, mode: set, layout: draft }} />
          </div>
        </div>
      </div>
    </div>
  );
}
