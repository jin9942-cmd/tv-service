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
- 공개 배포는 하지 않았습니다. SPA라서 정적 호스팅에 올릴 때는 모든 경로를 `index.html`로 돌려주는 설정이 필요합니다.

## 기술 구성

React 19 + TypeScript + Vite + react-router 7. 상태 관리 라이브러리 없이 `useSyncExternalStore` 기반의 작은 store(localStorage 동기화)를 씁니다.

```
src/
  config/entitlements.ts   # 플랜별 재생 권한 정책 (데모 가정, 교체 지점)
  data/types.ts            # 도메인 타입 (모든 관계는 ID로 연결)
  data/mock.ts             # Mock 데이터 (시즌·이벤트·방송·플레이어·핸드·아카이브·영상 소스)
  data/api.ts              # 데이터 접근 계층 (비동기 함수, 실제 API로 교체할 곳)
  state/stores.ts          # 로그인 상태·데모 설정·이어보기 기록 (localStorage)
  state/gate.tsx           # 재생 권한 안내 흐름 (로그인 → 구독 → 원래 콘텐츠 복귀)
  components/              # Ticker, VideoPlayer, Layout(헤더·하단 탭·Demo tools), PromoModal …
  pages/                   # Landing, Watch, HandDetail, HandsList, Players, Schedule, Archive, NotFound
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

모든 상세 화면은 URL로 바로 열 수 있고, 탭·필터·날짜도 쿼리스트링에 저장되어 새로고침·뒤로가기·앞으로가기 후에도 유지됩니다. 없는 ID는 “doesn’t exist” 화면과 다른 콘텐츠로 가는 링크를 보여줍니다.

## 데모 가정

- **권한 정책** (`src/config/entitlements.ts`)
  - Guest: 하이라이트 재생, 스케줄·아카이브 목록·프로필 탐색
  - Free: + 지정 무료 VOD (2025 Main Event Final Table, 일부 핸드)
  - Standard: + 메인 라이브·유료 VOD
  - Platinum: + 추가 테이블 방송
- **로그인**은 버튼 한 번으로 “Demo Viewer(Free)”가 되는 가짜 로그인입니다. 이메일·비밀번호·결제 정보는 받지 않습니다. 플랜 변경도 결제 없이 즉시 적용됩니다.
- 화면 오른쪽 아래 **Demo tools**에서 Guest/Free/Standard/Platinum 전환, “라이브 없음” 시뮬레이션, “영상 재생 실패” 강제, 데모 초기화를 할 수 있습니다.
- **재생 권한 안내 모달**은 사용자가 카드·링크로 콘텐츠를 *선택했을 때만* 자동으로 열립니다. URL로 바로 들어오면 플레이어 위에 잠금 안내와 버튼만 보입니다. 모달을 닫아도 탐색은 계속할 수 있고 제한 콘텐츠는 재생되지 않습니다. 로그인·업그레이드에 성공하면 모달이 닫히고 같은 화면에서 재생이 시작됩니다.
- **홍보 모달**은 Guest가 여러 화면을 둘러본 뒤 세션당 한 번 표시됩니다. 노란 테두리와 “Promotion · you can keep browsing” 표시로 재생 권한 안내(빨간 테두리)와 구분됩니다.
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
| 방송 지연 | `/watch/ev-2026-main/bc-main-t3` |
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

| 지점 | 현재 | 교체 대상 |
| --- | --- | --- |
| `src/data/api.ts` 전체 | `mock.ts`를 120ms 지연 후 반환 | 일정·이벤트·VOD 카탈로그 API. 함수 시그니처는 그대로 둬도 됨 |
| `getEvent` · `getBroadcastsForEvent` 의 칩 카운트/좌석 | Mock `leaderboard`, `seats` | EBS 기반 테이블 데이터 / 라이브 리포팅 API |
| `getHands` | Mock 핸드 기록 | 핸드 히스토리 + 클립 메타데이터 API |
| `VideoSource.url` | Wikimedia Commons의 CC 라이선스 영상 | HLS/DASH 매니페스트 (AWS MediaPackage/CloudFront 등). 플레이어에 hls.js 등 추가 필요 |
| `src/config/entitlements.ts` | 정적 정책 | 엔타이틀먼트/구독 API |
| `src/state/gate.tsx` `useAuth` | localStorage 가짜 로그인 | GGPass 등 실제 인증 (리다이렉트 후 원래 URL로 복귀) |
| 플랜 활성화 버튼 | 즉시 tier 변경 | 결제·구독 페이지 |
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
