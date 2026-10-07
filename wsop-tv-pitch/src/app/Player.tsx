import { useEffect, useRef, useState } from 'react';
import type { Tier } from '../data/types';
import { CAPTION_LINES, renderCaption } from '../data/vocab';
import { accessFor, MAX_QUALITY } from '../state/selectors';
import { store, toast, useStore } from '../state/store';
import { fmtDuration } from '../lib/time';
import { Art, Icon, LiveBadge, LockIcon, Note, useEnv } from './ui';

const PREVIEW_SECONDS = 10;
/** Live rewind window (DVR). */
const DVR_WINDOW = 2 * 3600;
const SKIP = 10;
const ALL_QUALITIES = ['Auto', '1080p60', '1080p', '720p', '480p', '360p', '240p'];
const SUBTITLES = ['Off', 'English (AI)', 'Español (AI)', 'Português (AI)', '한국어 (AI)'];
const AUDIO_LIVE = ['English commentary', 'Español commentary', 'Table sound only'];
const AUDIO_VOD = ['English commentary', 'Table sound only'];

// Caption translations for the demo (the English line is built from the CMS vocabulary).
const CAPTION_I18N: Record<string, string[]> = {
  'Español (AI)': ['Toma asiento en la Mesa Final.', '¡Qué momento en Paradise Island!', 'Ahora están mano a mano.', 'El brazalete del Main Event está más cerca.'],
  'Português (AI)': ['Senta-se à Mesa Final.', 'Que momento em Paradise Island!', 'Agora estão no heads-up.', 'O bracelete do Main Event está mais perto.'],
  '한국어 (AI)': ['파이널 테이블에 자리를 잡습니다.', '패러다이스 아일랜드, 관중이 모두 일어섰습니다!', '이제 1:1 승부입니다.', '메인 이벤트 브레이슬릿이 한 걸음 더 가까워졌습니다.'],
};

type Panel = 'quality' | 'subtitles' | 'audio';

/**
 * Mock player: no real video. Shows the access rules and the player features from the proposal:
 *  guest → login sheet, lower plan → 10s preview then paywall, region/VPN restriction,
 *  live rewind (DVR) with Go Live, quality ladder, AI subtitles and audio tracks.
 */
export function MockPlayer(props: {
  hue: number;
  title: string;
  sub: string;
  live?: boolean;
  tier: Tier;
  contentTitle: string;
  durationSec?: number;
  resumeAt?: number;
  viewers?: string;
  /** Jump request from outside (key moments). `n` changes on every request. */
  seek?: { t: number; n: number };
  markers?: number[];
}) {
  const env = useEnv();
  const geo = useStore((s) => s.geo);
  const vocab = useStore((s) => s.vocab);
  const access = accessFor(env.member, props.tier);
  // Blackout is a live-rights rule; VPN/proxy blocks all playback.
  const blocked = access !== 'login' && (geo === 'vpn' || (geo === 'blackout' && props.live)) ? geo : null;
  const [playing, setPlaying] = useState(access !== 'login');
  const [previewElapsed, setPreviewElapsed] = useState(0);
  const [position, setPosition] = useState(props.resumeAt ?? 0);
  /** Seconds behind the live edge (0 = live). */
  const [behind, setBehind] = useState(0);
  const [menu, setMenu] = useState<Panel | null>(null);
  const [quality, setQuality] = useState('Auto');
  const [subtitle, setSubtitle] = useState('Off');
  const [audio, setAudio] = useState('English commentary');
  const [tick, setTick] = useState(0);
  const paywallShown = useRef(false);
  const previewEnded = access === 'preview' && previewElapsed >= PREVIEW_SECONDS;
  const canPlay = access !== 'login' && !previewEnded && !blocked;

  // Upgrading (or logging in) while on this screen → play immediately.
  useEffect(() => {
    if (access === 'ok') {
      setPlaying(true);
      setPreviewElapsed(0);
      paywallShown.current = false;
    } else if (access === 'preview') {
      setPlaying(true);
    } else setPlaying(false);
  }, [access]);

  useEffect(() => {
    if (env.preview || !canPlay) return;
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
      if (!playing) {
        // Paused on a live stream: the live edge keeps moving away.
        if (props.live) setBehind((b) => Math.min(DVR_WINDOW, b + 1));
        return;
      }
      if (access === 'preview') setPreviewElapsed((e) => Math.min(PREVIEW_SECONDS, e + 1));
      if (!props.live && props.durationSec) setPosition((p) => Math.min(props.durationSec!, p + 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, canPlay, access, props.live, props.durationSec, env.preview]);

  useEffect(() => {
    if (previewEnded && !paywallShown.current) {
      paywallShown.current = true;
      setPlaying(false);
      env.sheet({ kind: 'paywall', tier: props.tier, title: props.contentTitle });
    }
  }, [previewEnded, env, props.tier, props.contentTitle]);

  // Opening a stream as a guest is a play intent → ask to log in straight away.
  const loginAsked = useRef(false);
  useEffect(() => {
    if (access === 'login' && !loginAsked.current && !env.preview) {
      loginAsked.current = true;
      env.sheet({ kind: 'login', reason: 'Log in to watch live tournaments and replays.' });
    }
  }, [access, env]);

  // Key-moment jumps.
  useEffect(() => {
    if (!props.seek) return;
    setPosition(props.seek.t);
    if (canPlay) setPlaying(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.seek?.n]);

  const togglePlay = () => {
    if (access === 'login') return env.sheet({ kind: 'login', reason: 'Log in to watch live tournaments and replays.' });
    if (previewEnded) return env.sheet({ kind: 'paywall', tier: props.tier, title: props.contentTitle });
    if (blocked) return;
    setPlaying((p) => !p);
  };

  const skip = (d: number) => {
    if (!canPlay) return togglePlay();
    if (props.live) setBehind((b) => Math.max(0, Math.min(DVR_WINDOW, b - d)));
    else setPosition((p) => Math.max(0, Math.min(props.durationSec ?? 0, p + d)));
  };
  const goLive = () => {
    setBehind(0);
    setPlaying(true);
  };

  const allowed = MAX_QUALITY[env.member];
  const chooseQuality = (q: string) => {
    if (!allowed.includes(q)) {
      setMenu(null);
      return env.sheet({ kind: 'paywall', tier: q === '1080p60' ? 'premium' : 'basic', title: `${q} quality` });
    }
    setQuality(q);
    setMenu(null);
  };

  const captionIdx = Math.floor(tick / 4) % CAPTION_LINES.length;
  const showCaption = subtitle !== 'Off' && playing && canPlay;
  const audioOptions = props.live ? AUDIO_LIVE : AUDIO_VOD;

  return (
    <div className="player">
      <Art hue={props.hue} title={props.title} sub={props.sub} className={`player-art ${playing && canPlay ? 'is-playing' : ''} ${showCaption ? 'has-caption' : ''}`}>
        {props.live && (
          <span className="art-tl player-live">
            <LiveBadge small />
            {props.viewers && (
              <span className="viewers">
                <Icon name="eye" size={12} /> {props.viewers}
              </span>
            )}
          </span>
        )}

        {access === 'preview' && !previewEnded && !blocked && (
          <div className="preview-bar" aria-label="Preview">
            <span>Preview · {PREVIEW_SECONDS - previewElapsed}s left</span>
            <i style={{ width: `${(previewElapsed / PREVIEW_SECONDS) * 100}%` }} />
          </div>
        )}

        {blocked ? (
          <div className="geo-block" role="alert">
            <Icon name="globe" size={26} />
            {blocked === 'blackout' ? (
              <>
                <b>Not available in your region</b>
                <span>Broadcast rights limit this live stream in your location. The replay and highlights will be available after the event.</span>
              </>
            ) : (
              <>
                <b>VPN or proxy detected</b>
                <span>Turn off your VPN to keep watching. Travelling abroad? Your plan still works — verify your home region.</span>
                <button
                  className="btn btn-gold btn-sm"
                  onClick={() => {
                    store.set({ geo: 'ok' });
                    toast('Home region verified — travel access on (demo)');
                  }}
                >
                  I'm travelling
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {(access === 'login' || previewEnded || !playing) && (
              <button className="player-center" onClick={togglePlay} aria-label={access === 'login' ? 'Log in to play' : 'Play'}>
                {access === 'login' || previewEnded ? <LockIcon size={22} /> : <Icon name="play" size={30} />}
              </button>
            )}
            {(access === 'login' || previewEnded) && (
              <span className="player-msg">{access === 'login' ? 'Log in to watch' : `Preview ended · ${props.tier === 'premium' ? 'Premium' : 'Basic'} required`}</span>
            )}
            {playing && canPlay && <span className="eq" aria-hidden="true"><i /><i /><i /></span>}
          </>
        )}

        {showCaption && (
          <p className="caption" aria-live="off">
            {subtitle === 'English (AI)'
              ? renderCaption(CAPTION_LINES[captionIdx], vocab).map((p, i) => <span key={i}>{p.text}</span>)
              : CAPTION_I18N[subtitle]?.[captionIdx]}
          </p>
        )}

        <div className="controls">
          <button aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlay}>
            <Icon name={playing && canPlay ? 'pause' : 'play'} size={20} />
          </button>
          <button aria-label={`Back ${SKIP} seconds`} onClick={() => skip(-SKIP)}>
            <Icon name="rew" size={18} />
          </button>
          <button aria-label={`Forward ${SKIP} seconds`} onClick={() => skip(SKIP)} disabled={!!props.live && behind === 0}>
            <Icon name="fwd" size={18} />
          </button>
          {props.live ? (
            <span className="ctl-time">
              <span className="ctl-track ctl-dvr" title="Live rewind window: 2 hours">
                <i style={{ width: `${100 - (behind / DVR_WINDOW) * 100}%` }} />
              </span>
              {behind === 0 ? (
                <span className="ctl-live">● LIVE</span>
              ) : (
                <button className="ctl-golive" onClick={goLive}>
                  −{fmtDuration(behind)} · Go Live
                </button>
              )}
            </span>
          ) : (
            <span className="ctl-time">
              {fmtDuration(position)}
              <span className="ctl-track">
                <i style={{ width: `${(position / (props.durationSec || 1)) * 100}%` }} />
                {props.markers?.map((m) => (
                  <b key={m} className="ctl-marker" style={{ left: `${(m / (props.durationSec || 1)) * 100}%` }} />
                ))}
              </span>
              {fmtDuration(props.durationSec ?? 0)}
            </span>
          )}
          <button className={`ctl-cc ${subtitle !== 'Off' ? 'is-on' : ''}`} aria-label="Subtitles and audio" onClick={() => setMenu((m) => (m === 'subtitles' ? null : 'subtitles'))}>
            CC
          </button>
          <button className="ctl-q" onClick={() => setMenu((m) => (m === 'quality' ? null : 'quality'))} aria-haspopup="menu" aria-expanded={menu === 'quality'}>
            {quality === 'Auto' ? 'Auto' : quality}
          </button>
          <button aria-label="Full screen" onClick={() => toast('Full screen (demo)')}>
            <Icon name="full" size={18} />
          </button>
        </div>

        {menu && (
          <div className="q-menu" role="menu">
            {menu === 'quality' ? (
              <>
                <p className="q-head">Quality · adaptive {allowed[1] ?? allowed[0]} max</p>
                {ALL_QUALITIES.map((q) => (
                  <button key={q} role="menuitem" className={q === quality ? 'is-on' : ''} onClick={() => chooseQuality(q)}>
                    {q}
                    {!allowed.includes(q) && <LockIcon />}
                  </button>
                ))}
              </>
            ) : (
              <>
                <div className="q-tabs">
                  <button className={menu === 'subtitles' ? 'is-on' : ''} onClick={() => setMenu('subtitles')}>
                    Subtitles
                  </button>
                  <button className={menu === 'audio' ? 'is-on' : ''} onClick={() => setMenu('audio')}>
                    Audio
                  </button>
                </div>
                {(menu === 'subtitles' ? SUBTITLES : audioOptions).map((o) => {
                  const on = menu === 'subtitles' ? subtitle === o : audio === o;
                  return (
                    <button
                      key={o}
                      role="menuitem"
                      className={on ? 'is-on' : ''}
                      onClick={() => {
                        if (menu === 'subtitles') setSubtitle(o);
                        else {
                          setAudio(o);
                          toast(`Audio: ${o}`);
                        }
                        setMenu(null);
                      }}
                    >
                      {o}
                      {on && <span aria-hidden="true">✓</span>}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </Art>
      <Note>
        {blocked
          ? blocked === 'blackout'
            ? '지역 제한(Geo-fencing/Blackout): 라이브 중계권 지역만 차단 · VOD는 시청 가능'
            : 'VPN 감지 → 시청 차단 · 여행자는 본국 인증 후 시청 (Traveller support)'
          : access === 'preview'
            ? '권한 없는 등급: 10초 미리보기 → 구독 안내 바텀시트'
            : access === 'login'
              ? '비로그인: 재생 시 로그인 유도'
              : props.live
                ? '라이브 되감기(DVR 2시간): 일시정지·10초 이동 → Go Live 복귀 · CC: AI 자막/오디오 트랙'
                : 'ABR 1080p~240p · 등급별 최대 화질 (예시 정책) · CC: AI 자막(포커 용어 사전 반영)'}
      </Note>
    </div>
  );
}
