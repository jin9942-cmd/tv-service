import { useEffect, useRef, useState } from 'react';
import type { Tier } from '../data/types';
import { accessFor, MAX_QUALITY } from '../state/selectors';
import { toast } from '../state/store';
import { fmtDuration } from '../lib/time';
import { Art, Icon, LiveBadge, LockIcon, Note, useEnv } from './ui';

const PREVIEW_SECONDS = 10;
const ALL_QUALITIES = ['Auto', '1080p60', '1080p', '720p', '480p'];

/**
 * Mock player: no real video. Shows the access rules:
 *  guest → login sheet, lower plan → 10s preview then paywall sheet, enough plan → plays.
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
}) {
  const env = useEnv();
  const access = accessFor(env.member, props.tier);
  const [playing, setPlaying] = useState(access !== 'login');
  const [previewElapsed, setPreviewElapsed] = useState(0);
  const [position, setPosition] = useState(props.resumeAt ?? 0);
  const [menu, setMenu] = useState(false);
  const [quality, setQuality] = useState('Auto');
  const paywallShown = useRef(false);
  const previewEnded = access === 'preview' && previewElapsed >= PREVIEW_SECONDS;

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
    if (!playing || previewEnded || env.preview) return;
    const id = window.setInterval(() => {
      if (access === 'preview') setPreviewElapsed((e) => Math.min(PREVIEW_SECONDS, e + 1));
      if (!props.live && props.durationSec) setPosition((p) => Math.min(props.durationSec!, p + 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, previewEnded, access, props.live, props.durationSec, env.preview]);

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

  const togglePlay = () => {
    if (access === 'login') return env.sheet({ kind: 'login', reason: 'Log in to watch live tournaments and replays.' });
    if (previewEnded) return env.sheet({ kind: 'paywall', tier: props.tier, title: props.contentTitle });
    setPlaying((p) => !p);
  };

  const allowed = MAX_QUALITY[env.member];
  const chooseQuality = (q: string) => {
    if (!allowed.includes(q)) {
      setMenu(false);
      return env.sheet({ kind: 'paywall', tier: q === '1080p60' ? 'premium' : 'basic', title: `${q} quality` });
    }
    setQuality(q);
    setMenu(false);
  };

  return (
    <div className="player">
      <Art hue={props.hue} title={props.title} sub={props.sub} className={`player-art ${playing ? 'is-playing' : ''}`}>
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

        {access === 'preview' && !previewEnded && (
          <div className="preview-bar" aria-label="Preview">
            <span>Preview · {PREVIEW_SECONDS - previewElapsed}s left</span>
            <i style={{ width: `${(previewElapsed / PREVIEW_SECONDS) * 100}%` }} />
          </div>
        )}

        {(access === 'login' || previewEnded || !playing) && (
          <button className="player-center" onClick={togglePlay} aria-label={access === 'login' ? 'Log in to play' : 'Play'}>
            {access === 'login' || previewEnded ? <LockIcon size={22} /> : <Icon name="play" size={30} />}
          </button>
        )}
        {(access === 'login' || previewEnded) && (
          <span className="player-msg">{access === 'login' ? 'Log in to watch' : `Preview ended · ${props.tier === 'premium' ? 'Premium' : 'Basic'} required`}</span>
        )}
        {playing && !previewEnded && <span className="eq" aria-hidden="true"><i /><i /><i /></span>}

        <div className="controls">
          <button aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlay}>
            <Icon name={playing ? 'pause' : 'play'} size={20} />
          </button>
          {props.live ? (
            <span className="ctl-live">● LIVE</span>
          ) : (
            <span className="ctl-time">
              {fmtDuration(position)} / {fmtDuration(props.durationSec ?? 0)}
              <span className="ctl-track">
                <i style={{ width: `${(position / (props.durationSec || 1)) * 100}%` }} />
              </span>
            </span>
          )}
          <button className="ctl-q" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu}>
            {quality === 'Auto' ? `Auto (${allowed[1] ?? allowed[0]})` : quality}
          </button>
          <button aria-label="Picture in picture" onClick={() => toast('Picture-in-picture (demo)')}>
            <Icon name="pip" size={18} />
          </button>
          <button aria-label="Full screen" onClick={() => toast('Full screen (demo)')}>
            <Icon name="full" size={18} />
          </button>
        </div>
        {menu && (
          <div className="q-menu" role="menu">
            {ALL_QUALITIES.map((q) => (
              <button key={q} role="menuitem" className={q === quality ? 'is-on' : ''} onClick={() => chooseQuality(q)}>
                {q}
                {!allowed.includes(q) && <LockIcon />}
              </button>
            ))}
          </div>
        )}
      </Art>
      <Note>
        {access === 'preview' ? '권한 없는 등급: 10초 미리보기 → 구독 안내 바텀시트' : access === 'login' ? '비로그인: 재생 시 로그인 유도' : '등급별 최대 화질 (예시 정책)'}
      </Note>
    </div>
  );
}
