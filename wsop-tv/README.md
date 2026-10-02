# WSOP TV — 반응형 데모 (Demo)

‘지금 진행 중인 토너먼트 시청’을 중심으로 만든 UX 검증용 프로토타입입니다.
**실서비스가 아니며 WSOP와 관련이 없습니다.** 선수·성적·핸드는 모두 가상의 샘플 데이터입니다. 영상은 Creative Commons로 공개된 **실제 홀덤 영상**(World Poker Tour 파이널 테이블 중계 등)이며 WSOP 영상이 아닙니다. 영상 속 인물은 데모의 가상 선수·데이터와 무관합니다.
AWS, GGPass, EBS, 결제 시스템 등 외부 시스템에는 연결되어 있지 않습니다.

## 실행 방법

```bash
cd wsop-tv
npm install
npm run dev        # http://localhost:5173
npm run build      # 타입 체크 + 프로덕션 빌드 (dist/)
npm run preview    # 빌드 결과 미리보기
```

- Node 20+ 권장 (Node 24에서 확인)
- 영상은 Wikimedia Commons에서 스트리밍하므로 **인터넷 연결이 필요**합니다. 오프라인이면 플레이어의 오류 화면과 재시도 버튼이 표시됩니다.
## 배포 (GitHub Pages)

`main`에 push하면 `.github/workflows/deploy-pages.yml`이 빌드해서 GitHub Pages에 올립니다.

- 주소: `https://<계정>.github.io/<저장소>/` (이 저장소는 https://jin9942-cmd.github.io/tv-service/)
- **최초 1회** 저장소 Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 바꿔야 합니다.
- 하위 경로에서 돌기 때문에 빌드 시 `BASE_PATH=/<저장소>/`를 넣습니다 (워크플로가 자동 설정). 라우터 `basename`과 이미지 경로가 이 값을 따라갑니다.
- SPA 딥링크(예: `/tv-service/hands/h-101`) 새로고침을 위해 빌드 결과의 `index.html`을 `404.html`로 복사합니다.
- 하위 경로 빌드를 로컬에서 확인하려면: `BASE_PATH=/tv-service/ npm run build && npx vite preview --base /tv-service/` (Windows Git Bash에서는 앞에 `MSYS_NO_PATHCONV=1`)

## 기술 구성

React 19 + TypeScript + Vite + react-router 7. 상태 관리 라이브러리 없이 `useSyncExternalStore` 기반의 작은 store(localStorage 동기화)를 씁니다.

```
src/
  config/entitlements.ts   # 플랜별 재생 권한 정책 (데모 가정, 교체 지점)
  config/badges.ts         # 활동 배지 4종과 획득 조건 (조건만 바꾸면 UI에 반영)
  config/glossary.ts       # 포커 용어 설명 목록
  lib/analytics.ts         # 로컬 전용 분석 이벤트 로그 (외부 전송 없음)
  data/types.ts            # 도메인 타입 (모든 관계는 ID로 연결)
  data/mock.ts             # Mock 데이터 (시즌·이벤트·방송·플레이어·핸드·아카이브·영상 소스)
  data/api.ts              # 데이터 접근 계층 (비동기 함수, 실제 API로 교체할 곳)
  state/stores.ts          # 로그인·플랜 상태, 데모 설정, 이어보기, 도움말 설정 (localStorage, 탭 간 동기화)
  state/activity.ts        # 저장한 핸드·팔로우·시청 시간·배지 (인증·구독과 분리)
  state/gate.tsx           # 로그인(GGPass) → 구독(WSOP+) 안내, 저장·팔로우 전 로그인 후 동작 이어서 실행
  components/              # Ticker, VideoPlayer, Layout(헤더·하단 탭·Demo tools), PromoModal …
  pages/                   # Landing, Watch, HandDetail, HandsList, Players, Schedule, Archive, MyWsop, NotFound
```

## 화면과 URL

| 화면 | URL |
| --- | --- |
| 랜딩 (소개·무료 하이라이트·Demo plan) | `/` (`/#plans`) |
| 토너먼트 시청 (기본: 첫 번째 라이브 대회) | `/watch` → `/watch/:eventId` |
| 특정 방송/테이블, 과거 대회 다시보기 | `/watch/:eventId/:broadcastId` (`?tab=players` · `?tab=hands`) |
| 핸드 리플레이 목록 / 상세 | `/hands` (`?event=`) · `/hands/:handId` |
| 플레이어 목록 / 프로필 | `/players` · `/players/:playerId` |
| 스케줄 | `/schedule` (`?date=YYYY-MM-DD`) |
| 아카이브 | `/archive` (`?season=&event=`) |
| My WSOP (개인 페이지: 이어보기·저장한 핸드·팔로우·배지·설정) | `/me` |

모든 상세 화면은 URL로 바로 열 수 있고, 탭·필터·날짜도 쿼리스트링에 저장되어 새로고침·뒤로가기·앞으로가기 후에도 유지됩니다. 없는 ID는 “doesn’t exist” 화면과 다른 콘텐츠로 가는 링크를 보여줍니다.

## 데모 가정

- **권한 정책** (`src/config/entitlements.ts`)
  - Guest: 하이라이트 재생, 스케줄·아카이브 목록·프로필 탐색
  - Free: + 지정 무료 VOD (2025 Main Event Final Table, 일부 핸드)
  - Standard: + 메인 라이브·유료 VOD
  - Platinum: + 추가 테이블 방송
- **인증은 GGPass, 결제·구독은 WSOP+** 가 맡는다는 전제입니다. 데모는 둘 다 연결하지 않습니다.
  - 로그인: “Continue with GGPass (demo)” 버튼 한 번으로 “Demo Viewer”가 됩니다. 이메일·비밀번호 등 개인정보는 받지 않습니다.
  - 구독: 안내 모달에서 WSOP+ 연동 예정임을 알리고 데모 플랜으로 바로 바꿉니다. 결제는 실행하지 않습니다. 플랜 이름(Standard/Platinum)·혜택은 임시값입니다.
  - Guest = 로그아웃, Free = 로그인했지만 WSOP+ 플랜 없음, Standard/Platinum = 데모 WSOP+ 플랜.
- **저장·팔로우**: 비로그인 사용자가 누르면 로그인 안내가 뜨고, 로그인하면 같은 화면에서 저장·팔로우가 이어서 실행됩니다. 같은 핸드·선수는 몇 번을 눌러도 기록이 하나만 남습니다 (ID 키 기반).
- **활동 배지** (`src/config/badges.ts`): First Table(방송 실제 재생 60초) · Hand Collector(서로 다른 핸드 3개 저장) · Final Fan(서로 다른 파이널 테이블 영상 2개를 각 60초) · Player Follower(서로 다른 선수 2명 팔로우).
  - 구독 플랜과 무관하게 계산하고, 배지로 콘텐츠가 열리지 않으며, 실력 등급이나 공식 자격으로 표현하지 않습니다. 포인트·보상·순위는 없습니다.
  - 로그인 사용자만 기록합니다. 한 번 얻은 배지는 저장 취소·언팔로우 후에도 유지되고, “서로 다른 N개”는 지금까지 저장·팔로우한 적이 있는 고유 ID 수로 셉니다.
  - 시청 시간은 1초마다 “실제 경과 시간”과 “영상 재생 위치 변화” 중 작은 값만 더합니다. 그래서 일시정지·버퍼링(재생 위치 변화 0)과 탐색(위치가 크게 뜀)은 들어가지 않습니다. 페이지가 보일 때만 세고, 여러 탭에서는 localStorage 임대(lease)를 가진 탭 하나만 셉니다.
  - 획득 알림은 화면 구석의 작은 토스트로 배지마다 한 번만 띄웁니다 (표시 즉시 “알림 완료”로 저장 → 새로고침·다른 탭에서도 반복 안 됨).
  - “파이널 테이블 영상”은 제목이 Final Table인 방송(라이브·다시보기)입니다. 핸드 클립은 시청 시간에 넣지 않습니다.
- **포커 용어 설명** (`src/config/glossary.ts`): 기본값은 끄기이고 설정은 localStorage에 저장합니다. 켜면 앱이 표시하는 텍스트(핸드 설명·진행, 대회 개요, 블라인드, 선수 소개)에서 BB·SB·BTN·Stack·All-in·Check-raise·Bubble·Heads-up 등에 점선 밑줄이 생깁니다. PC는 팝오버, 모바일(767px 이하)은 바텀시트로 뜨고 Esc·닫기 버튼·바깥 영역으로 닫힙니다. 영상 속 그래픽은 분석하지 않습니다. 구독·배지와 연결하지 않으며, 꺼도 모든 기능이 같습니다.
- **분석 이벤트**(playback_started, hand_saved, player_followed, badge_earned, glossary_opened, return_to_live_clicked)는 외부로 보내지 않고 localStorage 링버퍼와 `console.debug`에만 남깁니다. Demo tools → Analytics log에서 볼 수 있습니다.
- **Demo tools**에서 로그인·플랜 전환, 배지 조건 진행 상황 확인, 활동 데이터만 초기화, 전체 초기화를 할 수 있습니다.
- 화면 오른쪽 아래 **Demo tools**에서 Guest/Free/Standard/Platinum 전환, “라이브 없음” 시뮬레이션, “영상 재생 실패” 강제, 데모 초기화를 할 수 있습니다.
- **재생 권한 안내 모달**은 사용자가 카드·링크로 콘텐츠를 *선택했을 때만* 자동으로 열립니다. URL로 바로 들어오면 플레이어 위에 잠금 안내와 버튼만 보입니다. 모달을 닫아도 탐색은 계속할 수 있고 제한 콘텐츠는 재생되지 않습니다. 로그인·업그레이드에 성공하면 모달이 닫히고 같은 화면에서 재생이 시작됩니다.
- **홍보 모달**은 Guest가 여러 화면을 둘러본 뒤 세션당 한 번 표시됩니다. 노란 테두리와 “Promotion · you can keep browsing” 표시로 재생 권한 안내(빨간 테두리)와 구분됩니다.
- **지연 방송(broadcast delay)**: 포커 중계는 실시간이 아니라 일정 시간 늦춰 내보냅니다. 홀카드를 공개하므로, 현장 선수가 중계를 보고 이득을 얻지 못하게 하기 위해서입니다. 데모는 방송마다 `delayMinutes`를 둡니다(피처 테이블·파이널 30분, 홀카드 없는 아우터 테이블 15분).
  - 배지·플레이어·티커·스케줄·채널 카드에 "LIVE · 30m delay"처럼 지연을 함께 표시합니다. 시청 화면에는 지금 방송이 보여주는 시각(스트림 타임)과 "현장은 30분 앞서 있음"을 안내합니다.
  - 칩 카운트·핸드 기록·핸드 리플레이는 **스트림 타임 기준**입니다. 아직 방송되지 않은 핸드(`playedAt + delay`가 지나지 않은 핸드)는 Hand History·핸드 목록·홈 하이라이트에서 빠지고, URL로 직접 열면 “방송 후 공개(예상 시각)” 화면이 나옵니다.
  - **실제 서비스에서는 서버가 방송 전 데이터를 아예 내려주지 않아야 합니다.** 데모처럼 브라우저에서 거르는 방식은 보안 경계가 아닙니다. EBS 칩 카운트·핸드 기록·클립 API는 `asOf = 스트림 타임` 기준으로 응답해야 합니다.
  - 기존의 “방송 시작이 늦어짐” 상태는 지연 방송과 헷갈리지 않도록 **Late start**(`late-start`)로 이름을 바꿨습니다.
- **라이브**는 녹화된 실제 홀덤 영상을 반복 재생하는 시뮬레이션입니다. 방송 시작 시각을 기준으로 재생 위치를 계산해 “중간에 들어오는” 느낌만 냅니다. 되감기(DVR)는 제공하지 않으며 화면에 그렇게 표시합니다.
- **영상 공유**: 라이브 방송 여러 개가 같은 영상 파일을 쓰면 방송 카드와 플레이어 아래에 표시합니다. 현재 라이브 3개는 서로 다른 영상을 쓰고, 다시보기 일부(2025·2024 Main Event FT, 2025 High Roller FT)는 같은 WPT 파이널 테이블 영상을 씁니다.
- **핸드 클립**은 실제 영상의 구간(시작 초 + 길이)으로 표현합니다. 클립 화면의 카드·팟 그래픽은 원본 중계의 것이라 데모의 핸드 기록(가상)과 일치하지 않습니다.
- **시간**은 대회장 기준(Las Vegas, PT)으로 정의하고 사용자 현지 시간을 함께 표시합니다. 일정은 “오늘” 기준 상대 시각으로 만들어지므로 언제 실행해도 라이브·예정 대회가 있습니다.
- **이어보기**는 다시보기·핸드 클립만 저장합니다 (localStorage, 약 4초 간격 + 일시정지·이탈·새로고침 시점). 거의 끝까지 보면 기록을 지웁니다.
- 썸네일과 플레이어 포스터는 위 영상에서 추출한 정지 화면(`public/media/`)을 씁니다. 선수 프로필은 가상 인물이라 이니셜 아바타를 씁니다.

## 예외 상태 (확인 방법)

| 상태 | 위치 |
| --- | --- |
| 라이브 없음 | Demo tools → “No live tournaments right now” 후 `/watch` |
| 방송 시작 지연 (Late start) | `/watch/ev-2026-main/bc-main-t3` |
| 아직 방송되지 않은 핸드 | `/hands/h-107` (Players Championship, 방송 후 공개) |
| 방송 중단 | `/watch/ev-2026-main/bc-main-t4` |
| 방송 종료 | `/watch/ev-2026-mystery` |
| 방송 없음(중계 안 함) | `/watch/ev-2026-plo` |
| 예정 방송 | `/watch/ev-2026-shr` |
| 관련 핸드 없음 | `/watch/ev-2026-mystery?tab=hands`, `/players/p-hale` |
| 과거 결승 없음 | `/players/p-hale` |
| 클립이 없는 핸드 | `/hands/h-104` |
| 재생 권한 없음 | Guest로 `/watch/ev-2026-main` 등 |
| 영상 재생 실패 | Demo tools → “Force sample video failure” |
| 일정 없는 날 | `/schedule`에서 빨간 점이 없는 날짜 |
| 존재하지 않는 URL | `/watch/nope`, `/hands/h-999`, `/foo` |

## 실제 API 연동 지점

> 데모는 모든 상태를 브라우저 localStorage에 둡니다. 실제 서비스에서는 **콘텐츠 접근 권한과 활동 기록(저장·팔로우·시청 시간·배지)을 서버가 관리**해야 합니다. 클라이언트 값은 쉽게 바뀔 수 있기 때문입니다.

| 지점 | 현재 | 교체 대상 |
| --- | --- | --- |
| `src/data/api.ts` 전체 | `mock.ts`를 120ms 지연 후 반환 | 일정·이벤트·VOD 카탈로그 API. 함수 시그니처는 그대로 둬도 됨 |
| `getEvent` · `getBroadcastsForEvent` 의 칩 카운트/좌석 | Mock `leaderboard`, `seats` | EBS 기반 테이블 데이터 / 라이브 리포팅 API. 반드시 스트림 타임(`now − delay`) 기준으로 응답 |
| `isHandAired` · `streamTime` (`src/data/api.ts`) | 브라우저에서 방송 전 핸드를 거름 | 서버가 방송 전 핸드·클립을 응답에서 제외 |
| `getHands` | Mock 핸드 기록 | 핸드 히스토리 + 클립 메타데이터 API |
| `VideoSource.url` | Wikimedia Commons의 CC 라이선스 영상 | HLS/DASH 매니페스트 (AWS MediaPackage/CloudFront 등). 플레이어에 hls.js 등 추가 필요 |
| `src/config/entitlements.ts` | 정적 정책 | 엔타이틀먼트/구독 API |
| `src/state/gate.tsx` `useAuth` | localStorage 가짜 로그인 | GGPass 인증 (리다이렉트 후 원래 URL·동작으로 복귀) |
| 플랜 전환 버튼 | 즉시 tier 변경 | WSOP+ 구독·결제 페이지와 구독 상태 API |
| `src/state/activity.ts` | localStorage | 서버의 활동 기록 API: 저장·팔로우·시청 시간·배지를 서버가 검증·저장해야 함 (클라이언트 값은 조작 가능) |
| 시청 시간 집계 | 브라우저에서 1초 단위 계산 + 탭 임대 | 플레이어 하트비트를 서버가 받아 세션 단위로 중복 제거 |
| `src/lib/analytics.ts` `track` | 로컬 로그 | 실제 분석 SDK 전송 (동의 관리 포함) |
| `progressStore` | localStorage | 서버 측 이어보기 API (기기 간 동기화) |

## 영상 출처와 라이선스

| 용도 | 영상 | 저작자 | 라이선스 |
| --- | --- | --- | --- |
| Main Event Feature Table, 과거 결승 다시보기, 대부분의 핸드 클립 | [Incredibly Unbelievable Fold on the World Poker Tour](https://commons.wikimedia.org/wiki/File:Incredibly_Unbelievable_Fold_on_the_World_Poker_Tour.webm) (7:27) | World Poker Tour | CC BY 3.0 |
| Players Championship, 2025 Main Event Day 7 | [Lynn Gilmartin Previews WPT Montreal](https://commons.wikimedia.org/wiki/File:Lynn_Gilmartin_Previews_WPT_Montreal_at_Playground_Poker_Club.webm) (1:47) | World Poker Tour | CC BY 3.0 |
| 2025 하이라이트 릴, Outer Table 4 | [World Poker Tour asks players which country is the best](https://commons.wikimedia.org/wiki/File:World_Poker_Tour_asks_players_which_country_is_the_best.webm) (1:31) | World Poker Tour | CC BY 3.0 |
| Outer Table 2, 2024 Players Championship | [Texas Hold 'em](https://commons.wikimedia.org/wiki/File:Texas_Hold_%27em.webm) (1:56) | BrewCrewCountry93 | CC BY-SA 4.0 |

화면의 모든 플레이어 아래에 출처와 라이선스를 표시합니다. 정지 화면 출처는 [public/media/CREDITS.md](public/media/CREDITS.md)에 있습니다. 실제 WSOP·PokerGO 중계 영상은 저작권 때문에 쓰지 않았습니다.

## 미구현 / 제한 사항

- 실제 라이브 스트리밍, DVR, 화질 선택, 자막, 화면분할 동시 시청 (의도적으로 제외, 화면에 기능이 있는 것처럼 표시하지 않음)
- 실제 인증·결제·구독, 이메일 수집
- 다국어 (UI는 영어)
- 영상이 모두 WebM(VP9/VP8)이라 **구형 iOS Safari에서는 재생되지 않을 수 있습니다** (오류 화면과 재시도 버튼이 표시됨).
- iOS Safari는 볼륨 슬라이더를 무시하므로 모바일에서는 음소거 버튼만 표시합니다. iOS 전체화면은 `webkitEnterFullscreen`으로 처리하며 실기기에서는 확인하지 않았습니다.
- 자동 테스트(단위/E2E)는 포함하지 않았습니다.
