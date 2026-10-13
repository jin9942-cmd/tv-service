import { useState } from 'react';
import { CAPTION_LINES, renderCaption, type VocabCategory, type VocabLang, type VocabTerm } from '../data/vocab';
import { store, toast, useStore } from '../state/store';
import { fmtKo } from '../lib/time';

const CATEGORIES: VocabCategory[] = ['선수명', '포커 용어', '대회·장소명'];
const LANGS: VocabLang[] = ['EN', 'ES', 'KO'];
const LANG_KO: Record<VocabLang, string> = { EN: '영어', ES: '스페인어', KO: '한국어' };

/**
 * 포커 용어 사전 (VOC-001~004): custom dictionary for AWS Transcribe auto subtitles, managed per language.
 * "Transcribe 반영" pushes pending terms → app captions (CC › English) are corrected.
 */
export function Vocabulary() {
  const vocab = useStore((s) => s.vocab);
  const version = useStore((s) => s.vocabVersion);
  const [lang, setLang] = useState<VocabLang>('EN');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<VocabCategory | ''>('');
  const [syncing, setSyncing] = useState(false);
  const [history, setHistory] = useState<{ v: number; at: number; n: number; lang: VocabLang }[]>([{ v: version, at: Date.now() - 86_400_000, n: 9, lang: 'EN' }]);
  const [form, setForm] = useState({ phrase: '', soundsLike: '', displayAs: '', category: '선수명' as VocabCategory });

  const inLang = vocab.filter((v) => v.lang === lang);
  const pending = inLang.filter((v) => v.status === 'pending');
  const shown = inLang.filter((v) => (!cat || v.category === cat) && (!q || `${v.phrase} ${v.soundsLike} ${v.displayAs}`.toLowerCase().includes(q.toLowerCase())));
  const dup = inLang.some((v) => v.phrase.toLowerCase() === form.phrase.trim().toLowerCase());

  const patchTerm = (id: string, p: Partial<VocabTerm>) =>
    store.set((s) => ({ vocab: s.vocab.map((v) => (v.id === id ? { ...v, ...p, status: 'pending', updatedAt: Date.now(), updatedBy: 'demo.admin' } : v)) }));

  const add = () => {
    const phrase = form.phrase.trim();
    if (!phrase || dup) return;
    const term: VocabTerm = {
      id: `vc-n${Date.now()}`,
      phrase,
      soundsLike: form.soundsLike.trim() || phrase.toLowerCase(),
      displayAs: form.displayAs.trim() || phrase,
      category: form.category,
      lang,
      enabled: true,
      status: 'pending',
      updatedAt: Date.now(),
      updatedBy: 'demo.admin',
    };
    store.set((s) => ({ vocab: [term, ...s.vocab] }));
    setForm({ phrase: '', soundsLike: '', displayAs: '', category: form.category });
    toast(`“${phrase}” 등록 · Transcribe 반영 대기`, 'cms');
  };

  // VOC-004: request → processing → done (version + history).
  const sync = () => {
    setSyncing(true);
    const n = pending.length;
    window.setTimeout(() => {
      store.set((s) => ({ vocab: s.vocab.map((v) => (v.lang === lang ? { ...v, status: 'active' } : v)), vocabVersion: s.vocabVersion + 1 }));
      setHistory((h) => [{ v: version + 1, at: Date.now(), n, lang }, ...h].slice(0, 4));
      setSyncing(false);
      toast(`${LANG_KO[lang]} 사전 v${version + 1} Transcribe 반영 완료 · 진행 중 라이브 자막부터 적용 (데모)`, 'cms');
    }, 1500);
  };

  return (
    <div className="cms-page">
      <div className="cms-page-head">
        <h1>포커 용어 사전</h1>
        <p className="cms-sub">자동 자막(AWS Transcribe) 인식률을 높이기 위한 포커 용어 · 선수명 사전입니다. 언어별로 관리하고, “Transcribe 반영”을 누르면 사용자 지정 사전에 적용됩니다.</p>
        <button className="cms-btn cms-btn-primary head-action" onClick={sync} disabled={!pending.length || syncing}>
          {syncing ? '반영 처리 중…' : `Transcribe 반영 (${LANG_KO[lang]}${pending.length ? ` · ${pending.length}건 대기` : ''})`}
        </button>
      </div>

      <div className="vocab-langs">
        <div className="cms-seg">
          {LANGS.map((l) => (
            <button key={l} className={lang === l ? 'is-on' : ''} onClick={() => setLang(l)}>
              {LANG_KO[l]} {vocab.filter((v) => v.lang === l).length}
            </button>
          ))}
        </div>
        <span className="muted-cell">사전은 언어별로 관리 (콘텐츠 언어 분기)</span>
      </div>

      <div className="kpis kpis-3">
        <div className="kpi">
          <span className="kpi-label">등록 용어 ({LANG_KO[lang]})</span>
          <span className="kpi-value">{inLang.length}개</span>
          <span className="kpi-sub">{CATEGORIES.map((c) => `${c} ${inLang.filter((v) => v.category === c).length}`).join(' · ')}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">반영 상태</span>
          <span className="kpi-value">{syncing ? '처리 중' : pending.length ? '대기' : '완료'}</span>
          <span className="kpi-sub">
            사전 v{version} · 마지막 반영 {fmtKo(new Date(history[0].at).toISOString())}
          </span>
        </div>
        <div className={`kpi ${pending.length ? 'kpi-warn' : ''}`}>
          <span className="kpi-label">반영 대기</span>
          <span className="kpi-value">{pending.length}건</span>
          <span className="kpi-sub">반영 전에는 자막에 적용되지 않음</span>
        </div>
      </div>

      <div className="cms-grid vocab-grid">
        <div className="card-box">
          <h2>용어 등록 (VOC-002)</h2>
          <div className="vocab-form">
            <label>
              용어 (Phrase) *
              <input value={form.phrase} placeholder="예: Callum Breck" onChange={(e) => setForm({ ...form, phrase: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add()} />
            </label>
            <label>
              발음 표기 (Sounds Like / IPA)
              <input value={form.soundsLike} placeholder="예: kal um brek" onChange={(e) => setForm({ ...form, soundsLike: e.target.value })} />
            </label>
            <label>
              표시 형식 (Display As)
              <input value={form.displayAs} placeholder="예: '쓰리벳' → '3-bet'" onChange={(e) => setForm({ ...form, displayAs: e.target.value })} />
            </label>
            <label>
              분류
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as VocabCategory })}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            {dup && <p className="vocab-warn">이미 등록된 용어입니다 (중복 용어 경고).</p>}
            <button className="cms-btn cms-btn-primary" onClick={add} disabled={!form.phrase.trim() || dup}>
              + 등록 ({LANG_KO[lang]})
            </button>
            <button className="cms-btn" onClick={() => toast('엑셀 양식(Phrase / IPA / SoundsLike / DisplayAs) 업로드 → 검증 결과 → 등록 (VOC-003, 데모)', 'cms')}>
              엑셀 일괄 등록
            </button>
          </div>
          <p className="muted-cell vocab-auto">✓ 선수 관리에서 선수 등록 시 선수명 · 별칭 자동 추가 (VOC-003)</p>
        </div>

        <div className="card-box">
          <h2>자막 미리보기 (영어 자동 자막)</h2>
          <p className="cms-sub">영어 사전에서 반영 완료 · 사용 중인 용어만 적용됩니다. 밑줄은 사전으로 교정된 부분입니다.</p>
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
          <p className="cms-sub">반영 이력: {history.map((h) => `v${h.v} ${LANG_KO[h.lang]} ${h.n}건`).join(' · ')}</p>
          <p className="cms-sub">앱 데모 › 라이브/VOD 플레이어 › CC › English (AI)에서 같은 자막이 나옵니다.</p>
        </div>
      </div>

      <div className="card-box">
        <div className="vocab-toolbar">
          <h2>용어 목록 (VOC-001)</h2>
          <input className="vocab-search" value={q} placeholder="키워드" onChange={(e) => setQ(e.target.value)} />
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
              <th>표시 형식</th>
              <th>언어</th>
              <th>분류</th>
              <th>사용</th>
              <th>반영</th>
              <th>수정일 · 수정자</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((v) => (
              <tr key={v.id} className={v.enabled ? '' : 'is-off'}>
                <td>
                  <b>{v.phrase}</b>
                </td>
                <td className="muted-cell">{v.soundsLike}</td>
                <td>{v.displayAs}</td>
                <td>{v.lang}</td>
                <td>{v.category}</td>
                <td>
                  <input type="checkbox" checked={v.enabled} aria-label={`${v.phrase} 사용 여부`} onChange={(e) => patchTerm(v.id, { enabled: e.target.checked })} />
                </td>
                <td>
                  <span className={`st ${v.status === 'active' ? 'st-ok' : 'st-wait'}`}>{v.status === 'active' ? '완료' : syncing ? '처리 중' : '대기'}</span>
                </td>
                <td className="muted-cell">
                  {fmtKo(new Date(v.updatedAt).toISOString())} · {v.updatedBy}
                </td>
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
                <td colSpan={9} className="muted-cell">
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
