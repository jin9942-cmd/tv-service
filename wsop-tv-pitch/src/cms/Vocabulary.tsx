import { useState } from 'react';
import { CAPTION_LINES, renderCaption, type VocabCategory, type VocabTerm } from '../data/vocab';
import { store, toast, useStore } from '../state/store';
import { fmtKo } from '../lib/time';

const CATEGORIES: VocabCategory[] = ['선수명', '대회·이벤트', '경기 용어', '장소'];

/** Poker vocabulary manager: custom dictionary for AI subtitles (speech-to-text). Deploy → app captions update. */
export function Vocabulary() {
  const vocab = useStore((s) => s.vocab);
  const version = useStore((s) => s.vocabVersion);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<VocabCategory | ''>('');
  const [form, setForm] = useState({ phrase: '', soundsLike: '', displayAs: '', category: '선수명' as VocabCategory });

  const pending = vocab.filter((v) => v.status === 'pending');
  const shown = vocab.filter((v) => (!cat || v.category === cat) && (!q || `${v.phrase} ${v.soundsLike} ${v.displayAs}`.toLowerCase().includes(q.toLowerCase())));
  const dup = vocab.some((v) => v.phrase.toLowerCase() === form.phrase.trim().toLowerCase());

  const add = () => {
    const phrase = form.phrase.trim();
    if (!phrase || dup) return;
    const term: VocabTerm = {
      id: `vc-n${Date.now()}`,
      phrase,
      soundsLike: form.soundsLike.trim() || phrase.toLowerCase(),
      displayAs: form.displayAs.trim() || phrase,
      category: form.category,
      status: 'pending',
      updatedAt: Date.now(),
    };
    store.set((s) => ({ vocab: [term, ...s.vocab] }));
    setForm({ phrase: '', soundsLike: '', displayAs: '', category: form.category });
    toast(`“${phrase}” 추가됨 · 배포 대기`, 'cms');
  };

  const deploy = () => {
    store.set((s) => ({ vocab: s.vocab.map((v) => ({ ...v, status: 'active' })), vocabVersion: s.vocabVersion + 1 }));
    toast(`용어 사전 v${version + 1} 배포 완료 · 진행 중 라이브 자막부터 적용 (데모)`, 'cms');
  };

  return (
    <div className="cms-page">
      <div className="cms-page-head">
        <h1>포커 용어 사전</h1>
        <p className="cms-sub">AI 자막(음성 인식)이 선수 이름·대회명·경기 용어를 정확히 표기하도록 돕는 커스텀 사전입니다. 배포하면 라이브·VOD 자막에 바로 적용됩니다.</p>
        <button className="cms-btn cms-btn-primary head-action" onClick={deploy} disabled={!pending.length}>
          사전 배포{pending.length ? ` (${pending.length}건 대기)` : ''}
        </button>
      </div>

      <div className="kpis kpis-3">
        <div className="kpi">
          <span className="kpi-label">등록 용어</span>
          <span className="kpi-value">{vocab.length}개</span>
          <span className="kpi-sub">{CATEGORIES.map((c) => `${c} ${vocab.filter((v) => v.category === c).length}`).join(' · ')}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">배포 버전</span>
          <span className="kpi-value">v{version}</span>
          <span className="kpi-sub">자막 엔진에 적용된 사전</span>
        </div>
        <div className={`kpi ${pending.length ? 'kpi-warn' : ''}`}>
          <span className="kpi-label">배포 대기</span>
          <span className="kpi-value">{pending.length}건</span>
          <span className="kpi-sub">배포 전에는 자막에 반영되지 않음</span>
        </div>
      </div>

      <div className="cms-grid vocab-grid">
        <div className="card-box">
          <h2>용어 추가</h2>
          <div className="vocab-form">
            <label>
              용어 (Phrase)
              <input value={form.phrase} placeholder="예: Callum Breck" onChange={(e) => setForm({ ...form, phrase: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add()} />
            </label>
            <label>
              발음 표기 (Sounds like)
              <input value={form.soundsLike} placeholder="예: kal um brek" onChange={(e) => setForm({ ...form, soundsLike: e.target.value })} />
            </label>
            <label>
              자막 표기 (Display as)
              <input value={form.displayAs} placeholder="비우면 용어와 동일" onChange={(e) => setForm({ ...form, displayAs: e.target.value })} />
            </label>
            <label>
              분류
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as VocabCategory })}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            {dup && <p className="vocab-warn">이미 등록된 용어입니다.</p>}
            <button className="cms-btn cms-btn-primary" onClick={add} disabled={!form.phrase.trim() || dup}>
              + 추가
            </button>
          </div>
        </div>

        <div className="card-box">
          <h2>자막 미리보기 (영어 AI 자막)</h2>
          <p className="cms-sub">배포된 용어만 반영됩니다. 밑줄은 사전으로 교정된 부분입니다.</p>
          <ul className="vocab-preview">
            {CAPTION_LINES.map((line, i) => (
              <li key={i}>
                {renderCaption(line, vocab).map((p, j) =>
                  p.fixed ? (
                    <mark key={j}>{p.text}</mark>
                  ) : (
                    <span key={j} className={line[j] && typeof line[j] !== 'string' ? 'vocab-raw' : ''}>
                      {p.text}
                    </span>
                  ),
                )}
              </li>
            ))}
          </ul>
          <p className="cms-sub">앱 데모 › 라이브/VOD 플레이어 › CC › English (AI)에서 같은 자막이 나옵니다.</p>
        </div>
      </div>

      <div className="card-box">
        <div className="vocab-toolbar">
          <h2>용어 목록</h2>
          <input className="vocab-search" value={q} placeholder="검색" onChange={(e) => setQ(e.target.value)} />
          <div className="cms-seg">
            {(['', ...CATEGORIES] as const).map((c) => (
              <button key={c || 'all'} className={cat === c ? 'is-on' : ''} onClick={() => setCat(c)}>
                {c || '전체'}
              </button>
            ))}
          </div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>용어</th>
              <th>발음 표기</th>
              <th>자막 표기</th>
              <th>분류</th>
              <th>상태</th>
              <th>수정</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((v) => (
              <tr key={v.id}>
                <td>
                  <b>{v.phrase}</b>
                </td>
                <td className="muted-cell">{v.soundsLike}</td>
                <td>{v.displayAs}</td>
                <td>{v.category}</td>
                <td>
                  <span className={`st ${v.status === 'active' ? 'st-ok' : 'st-wait'}`}>{v.status === 'active' ? '적용 중' : '배포 대기'}</span>
                </td>
                <td className="muted-cell">{fmtKo(new Date(v.updatedAt).toISOString())}</td>
                <td>
                  <button
                    className="cms-btn cms-btn-sm"
                    onClick={() => {
                      store.set((s) => ({ vocab: s.vocab.filter((x) => x.id !== v.id) }));
                      toast(`“${v.phrase}” 삭제`, 'cms');
                    }}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td colSpan={7} className="muted-cell">
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
