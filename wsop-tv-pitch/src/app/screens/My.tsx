import { continueWatching, notices } from '../../data/mock';
import { store, toast, useStore } from '../../state/store';
import { MEMBER_LABEL, vodById } from '../../state/selectors';
import { fmtDate, fmtDuration } from '../../lib/time';
import { Icon, Note, useEnv } from '../ui';
import { AppHeader } from './Home';
import { SubHead } from './LivePlayer';

export function MyTab() {
  const env = useEnv();
  const push = useStore((s) => s.push);
  const night = useStore((s) => s.nightPush);
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
          <button className="row-btn" onClick={() => env.push({ name: 'paywall' })}>
            <span>Subscription</span>
            <span className="muted">
              {MEMBER_LABEL[env.member]} <Icon name="chevron" size={14} />
            </span>
          </button>
        )}
        <Note side="inline">계정 · 구독 등급 · 시청 기록 · 알림 설정 · 알림함 · 공지 · 고객센터</Note>
      </div>

      {!guest && (
        <section className="sec">
          <div className="sec-head">
            <h2>Watch history</h2>
          </div>
          <ul className="list">
            {continueWatching.map((c) => {
              const v = vodById(c.vodId)!;
              return (
                <li key={c.vodId}>
                  <button className="history-row" onClick={() => env.push({ name: 'vod', vodId: v.id })}>
                    <span className="history-title">{v.title}</span>
                    <span className="history-meta">
                      {Math.round(c.progress * 100)}% · {fmtDuration(v.durationSec)}
                    </span>
                    <span className="history-bar">
                      <i style={{ width: `${c.progress * 100}%` }} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
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

      <section className="sec">
        <div className="sec-head">
          <h2>Notices</h2>
        </div>
        <ul className="list">
          {notices.map((n) => (
            <li key={n.id} className="notice-row">
              <span>{n.title}</span>
              <small>{fmtDate(n.date, env.tz)}</small>
            </li>
          ))}
        </ul>
      </section>

      <div className="screen-pad my-foot">
        <button className="row-btn" onClick={() => toast('Help center (demo)')}>
          <span>Help center</span>
          <Icon name="chevron" size={14} />
        </button>
        <div className="row-btn static">
          <span>App version</span>
          <span className="muted">2.0.0 (demo)</span>
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
