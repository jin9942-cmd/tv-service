// SCR-01 splash · version check and HOME-R3 launch order:
// forced update > maintenance > system popup (incl. recommended update) > image popup.
// Only the top item shows; lower popups appear on the next launch.
import { useEffect, useState } from 'react';
import { APP_VERSION, store, toast, useStore } from '../state/store';
import { Note } from './ui';
import { Wordmark } from './screens/Home';

const cmp = (a: string, b: string) => {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
};

type Step = 'splash' | 'forced' | 'maintenance' | 'recommended' | 'system' | 'image' | null;

export function LaunchLayer() {
  const key = useStore((s) => s.launchKey);
  const cfg = useStore((s) => s.launch);
  const [step, setStep] = useState<Step>(null);

  useEffect(() => {
    if (!key) return;
    setStep('splash');
    const t = window.setTimeout(() => {
      const s = store.get();
      const c = s.launch;
      const seen = s.seenPopups;
      if (cmp(APP_VERSION, c.minVersion) < 0) return setStep('forced');
      if (c.maintenance) return setStep('maintenance');
      const popups: Step[] = [];
      if (cmp(APP_VERSION, c.latestVersion) < 0) popups.push('recommended');
      if (c.systemPopup) popups.push('system');
      if (c.imagePopup) popups.push('image');
      setStep(popups.find((p) => !seen.includes(p!)) ?? null);
    }, 1300);
    return () => window.clearTimeout(t);
  }, [key]);

  if (!step) return null;
  const closePopup = () => {
    store.set((s) => ({ seenPopups: [...s.seenPopups, step] }));
    setStep(null);
  };

  if (step === 'splash') {
    return (
      <div className="launch launch-splash">
        <Wordmark />
        <span className="launch-check">Checking app version…</span>
        <Note side="inline">SCR-01 스플래시 · 버전 체크 · 점검 모드 확인 · 자동 로그인</Note>
      </div>
    );
  }

  if (step === 'forced' || step === 'maintenance') {
    return (
      <div className="launch launch-block" role="alertdialog" aria-modal="true">
        <Wordmark />
        {step === 'forced' ? (
          <>
            <b>Update required</b>
            <p>
              A new version of WSOP TV is required to keep watching. Installed {APP_VERSION} · minimum {cfg.minVersion}.
            </p>
            <button className="btn btn-gold btn-block" onClick={() => toast('Opens App Store / Google Play (demo)')}>
              Update now
            </button>
          </>
        ) : (
          <>
            <b>We'll be right back</b>
            <p>{cfg.maintenanceText}</p>
          </>
        )}
        <Note side="inline">{step === 'forced' ? 'APP-002 강제 업데이트: 닫기 불가 → 스토어 이동' : 'APP-003 점검 모드: 앱 진입 차단 · 화이트리스트 계정만 진입'}</Note>
        <button className="link-btn launch-demo-skip" onClick={() => setStep(null)}>
          Demo only: dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true">
      <div className={`launch-pop ${step === 'image' ? 'is-image' : ''}`}>
        {step === 'recommended' && (
          <>
            <b>New version available</b>
            <p>Version {cfg.latestVersion} brings faster live start and new subtitle languages.</p>
            <button className="btn btn-gold btn-block" onClick={() => (toast('Opens store (demo)'), closePopup())}>
              Update
            </button>
            <button className="btn btn-ghost btn-block" onClick={closePopup}>
              Later
            </button>
          </>
        )}
        {step === 'system' && (
          <>
            <b>Service notice</b>
            <p>Scheduled maintenance this Sunday 03:00–05:00 KST.</p>
            <button className="btn btn-outline btn-block" onClick={closePopup}>
              OK
            </button>
          </>
        )}
        {step === 'image' && (
          <>
            <div className="launch-pop-art">
              <small>2026 WSOP Paradise</small>
              <b>Main Event Final Table</b>
              <span>Live this weekend</span>
            </div>
            <button className="btn btn-gold btn-block" onClick={() => (toast('Reminder set (demo)'), closePopup())}>
              Set a reminder
            </button>
            <button className="btn btn-ghost btn-block" onClick={closePopup}>
              Don't show today
            </button>
          </>
        )}
        <Note side="inline">HOME-R3 노출 순서: 강제 업데이트 &gt; 점검 &gt; 시스템 팝업 &gt; 이미지 팝업 · 상위가 뜨면 하위는 다음 진입 시 노출 · 앱 재실행으로 확인</Note>
      </div>
    </div>
  );
}
