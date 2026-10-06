import { useEffect, useState } from 'react';
import { AppPhone } from './app/AppPhone';
import { DemoPanel, ScenarioGuide } from './demo/DemoPanel';
import { Cms } from './cms/Cms';
import { useStore } from './state/store';

const MOBILE_QUERY = '(max-width: 767px)';

export default function App() {
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  const [tab, setTab] = useState<'app' | 'cms'>('app');
  const scale = usePhoneScale();

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const on = () => setMobile(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // On a phone the demo is just the app, full screen.
  if (mobile) {
    return (
      <div className="mobile-root">
        <AppPhone />
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="shell-top">
        <div className="shell-brand">
          WSOP TV <span>기획 데모</span>
        </div>
        <nav className="shell-tabs" role="tablist" aria-label="데모 선택">
          <button role="tab" aria-selected={tab === 'app'} className={tab === 'app' ? 'is-on' : ''} onClick={() => setTab('app')}>
            앱 데모
          </button>
          <button role="tab" aria-selected={tab === 'cms'} className={tab === 'cms' ? 'is-on' : ''} onClick={() => setTab('cms')}>
            CMS 데모
          </button>
        </nav>
        <p className="shell-hint">목업 데이터 · 실제 영상/로그인/결제 연동 없음 · 새로고침 시 초기화</p>
      </header>

      {tab === 'app' ? (
        <main className="stage">
          <aside className="stage-left">
            <ScenarioGuide onOpenCms={() => setTab('cms')} />
          </aside>
          <div className="stage-center" style={{ height: 868 * scale }}>
            <div className="phone" style={{ transform: `scale(${scale})` }}>
              <div className="phone-notch" />
              <AppPhone />
            </div>
          </div>
          <aside className="stage-right">
            <DemoPanel />
          </aside>
        </main>
      ) : (
        <Cms onOpenApp={() => setTab('app')} />
      )}
      <CmsToasts />
    </div>
  );
}

/** Fit the 414×868 device frame (390×844 screen) into the viewport height. */
function usePhoneScale() {
  const calc = () => Math.min(1, (window.innerHeight - 56 - 40) / 868);
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const on = () => setScale(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return Math.max(0.6, scale);
}

function CmsToasts() {
  const toasts = useStore((s) => s.toasts).filter((t) => t.scope === 'cms');
  if (!toasts.length) return null;
  return (
    <div className="cms-toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="cms-toast">
          ✓ {t.text}
        </div>
      ))}
    </div>
  );
}
