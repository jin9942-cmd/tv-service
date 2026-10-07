import type { Tier } from '../../data/types';
import { store, toast } from '../../state/store';
import { MEMBER_LABEL } from '../../state/selectors';
import { PLAN_ROWS as ROWS } from '../../data/plans';
import { Note, useEnv } from '../ui';
import { SubHead } from './LivePlayer';

export function Paywall() {
  const env = useEnv();
  const current = env.member;
  const choose = (t: Tier) => {
    if (t === 'free') {
      store.set({ member: 'free' });
      toast('Free account (demo)');
    } else {
      store.set({ member: t });
      toast(`Subscribed to ${MEMBER_LABEL[t]} (demo)`);
    }
    env.back();
  };

  return (
    <div className="paywall">
      <SubHead title="Choose your plan" />
      <div className="screen-pad">
        <p className="paywall-lead">Watch every table of the World Series of Poker, live and on demand.</p>
        <p className="policy-tag">Example policy · not final</p>
        <Note side="inline">예시 정책 (미확정) · 구독 버튼을 누르면 데모 회원 상태가 바로 바뀜</Note>

        <div className="compare" role="table">
          <div className="compare-row compare-head" role="row">
            <span role="columnheader" />
            {(['free', 'basic', 'premium'] as Tier[]).map((t) => (
              <span key={t} role="columnheader" className={`plan-h plan-${t} ${current === t ? 'is-current' : ''}`}>
                {MEMBER_LABEL[t]}
              </span>
            ))}
          </div>
          {ROWS.map((r) => (
            <div key={r.label} className="compare-row" role="row">
              <span role="rowheader" className="compare-label">
                {r.label}
              </span>
              {(['free', 'basic', 'premium'] as Tier[]).map((t) => (
                <span key={t} role="cell" className={current === t ? 'is-current' : ''}>
                  {r.values[t]}
                </span>
              ))}
            </div>
          ))}
        </div>

        <div className="plan-buttons">
          {(['premium', 'basic', 'free'] as Tier[]).map((t) => (
            <button key={t} className={`btn btn-block ${t === 'premium' ? 'btn-gold' : 'btn-outline'}`} disabled={current === t} onClick={() => choose(t)}>
              {current === t ? `Current plan · ${MEMBER_LABEL[t]}` : t === 'free' ? (current === 'guest' || current === 'free' ? 'Check · stay on Free' : 'Fold to Free') : t === 'premium' ? 'All-in · Premium' : `Raise to ${MEMBER_LABEL[t]}`}
            </button>
          ))}
        </div>
        <button className="restore" onClick={() => toast('No purchases to restore (demo)')}>
          Restore purchases
        </button>
      </div>
    </div>
  );
}
