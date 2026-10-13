import { removeContinue, store, toast, useStore } from '../../state/store';
import { MEMBER_LABEL, vodById } from '../../state/selectors';
import { fmtDate, fmtDuration } from '../../lib/time';
import { APP_VERSION } from '../../state/store';
import { Icon, Note, useEnv } from '../ui';
import { AppHeader } from './Home';
import { SubHead } from './LivePlayer';
import { MyListPreview } from '../MyList';

export function MyTab() {
  const env = useEnv();
  const push = useStore((s) => s.push);
  const night = useStore((s) => s.nightPush);
  const continueList = useStore((s) => s.continueList);
  const guest = env.member === 'guest';

  return (
    <div>
      <AppHeader title="My" />
      <div className="screen-pad">
        <div className="account">
          {guest ? (
            <>
              <p className="account-name">You’re browsing as a guest</p>
              <p className="muted">Log in for alerts, continue watching and subscriptions.</p>
              <button className="btn btn-gold btn-block" onClick={() => env.sheet({ kind: 'login', reason: 'Log in to manage your account.' })}>
                Log in
              </button>
            </>
          ) : (
            <>
              <span className="avatar-btn big">DV</span>
              <div>
                <p className="account-name">Demo Viewer</p>
                <p className="muted">demo.viewer@example.com</p>
              </div>
              <span className={`plan-pill plan-${env.member}`}>{MEMBER_LABEL[env.member]}</span>
            </>
          )}
        </div>
        {!guest && (
          <button className="row-btn" onClick={() => toast('Payment history: managed in App Store / Google Play (demo)')}>
            <span>Payment history</span>
            <Icon name="chevron" size={14} />
          </button>
        )}
        {!guest && (
          <button className="row-btn" onClick={() => env.push({ name: 'paywall' })}>
            <span>Subscription</span>
            <span className="muted">
              {env.expiredPlan ? `${MEMBER_LABEL[env.expiredPlan]} · Expired` : MEMBER_LABEL[env.member]} <Icon name="chevron" size={14} />
            </span>
          </button>
        )}
        <Note side="inline">SCR-11 MY · 계정(GGPass) · 구독 등급·결제 내역 · 워치리스트 · 이어보기 · 알림 설정 · 알림함 · 공지 · 고객센터 · 앱 버전 · 로그아웃·탈퇴</Note>
      </div>

      <MyListPreview />

      {!guest && (
        <section className="sec">
          <div className="sec-head">
            <h2>Continue Watching</h2>
            {continueList.length > 0 && (
              <button
                className="sec-more"
                onClick={() => {
                  store.set({ continueList: [] });
                  toast('Continue Watching cleared');
                }}
              >
                Clear all
              </button>
            )}
          </div>
          <Note>CW-01·02 · 기기 간 동기화 · 90% 이상 시청 시 완료 처리 · 수동 삭제(개별·전체) · 워치리스트와 별개</Note>
          {continueList.some((c) => c.progress < 0.9) ? (
            <ul className="list">
              {continueList.filter((c) => c.progress < 0.9).map((c) => {
                const v = vodById(c.vodId)!;
                return (
                  <li key={c.vodId} className="history-item">
                    <button className="history-row" onClick={() => env.push({ name: 'vod', vodId: v.id })}>
                      <span className="history-title">{v.title}</span>
                      <span className="history-meta">
                        {Math.round(c.progress * 100)}% · {fmtDuration(v.durationSec)}
                      </span>
                      <span className="history-bar">
                        <i style={{ width: `${c.progress * 100}%` }} />
                      </span>
                    </button>
                    <button
                      className="ml-remove"
                      aria-label={`Remove ${v.title} from Continue Watching`}
                      onClick={() => {
                        removeContinue(c.vodId);
                        toast('Removed from Continue Watching');
                      }}
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="screen-pad muted">Nothing to continue. Videos you start will appear here.</p>
          )}
        </section>
      )}

      <section className="sec">
        <div className="sec-head">
          <h2>Settings</h2>
        </div>
        <div className="screen-pad">
          <Switch label="Push notifications" on={push} disabled={guest} onChange={(v) => store.set({ push: v })} />
          <Switch label="Night-time notifications (21:00–08:00)" on={night} disabled={guest || !push} onChange={(v) => store.set({ nightPush: v })} />
          {!guest && (
            <button className="row-btn" onClick={() => env.push({ name: 'inbox' })}>
              <span>Inbox</span>
              <Icon name="chevron" size={14} />
            </button>
          )}
        </div>
      </section>

      <div className="screen-pad my-foot">
        <button className="row-btn" onClick={() => env.push({ name: 'notices' })}>
          <span>Notices</span>
          <Icon name="chevron" size={14} />
        </button>
        <button className="row-btn" onClick={() => toast('UI and subtitles in 20+ languages (L10N-01, demo shows English)')}>
          <span>App language</span>
          <span className="muted">
            English <Icon name="chevron" size={14} />
          </span>
        </button>
        <button className="row-btn" onClick={() => toast('Help center (demo)')}>
          <span>Help center</span>
          <Icon name="chevron" size={14} />
        </button>
        <div className="row-btn static">
          <span>App version</span>
          <span className="muted">{APP_VERSION} (demo)</span>
        </div>
        {!guest && (
          <button
            className="btn btn-ghost btn-block"
            onClick={() => {
              store.set({ member: 'guest' });
              toast('Logged out');
            }}
          >
            Log out
          </button>
        )}
        {!guest && (
          <button className="link-btn" onClick={() => toast('Account deletion is handled through GGPass (AUTH-03, demo)')}>
            Delete account
          </button>
        )}
      </div>
    </div>
  );
}

function Switch({ label, on, disabled, onChange }: { label: string; on: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`row-btn switch-row ${disabled ? 'is-disabled' : ''}`} role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)}>
      <span>{label}</span>
      <span className={`sw ${on && !disabled ? 'is-on' : ''}`}>
        <i />
      </span>
    </button>
  );
}

export function Inbox() {
  const env = useEnv();
  const alarms = useStore((s) => s.alarms);
  const schedules = useStore((s) => s.schedules);
  const items = [
    ...alarms
      .map((id) => schedules.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => ({ id: s.id, title: `Reminder set: ${s.title}`, sub: `${s.lang} · ${fmtDate(s.start, env.tz)}` })),
    { id: 'n1', title: 'Main Event Day 1B Full Replay is now available', sub: 'VOD' },
    { id: 'n2', title: 'Welcome to WSOP TV', sub: 'Account' },
  ];
  return (
    <div>
      <SubHead title="Inbox" />
      <ul className="list">
        {items.map((i) => (
          <li key={i.id} className="notice-row">
            <span>{i.title}</span>
            <small>{i.sub}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
