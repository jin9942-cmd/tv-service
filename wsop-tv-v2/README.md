# WSOP TV (working title) — interactive demo

A clickable demo of a sports-OTT style viewing platform for championship poker, for investors, partners and internal stakeholders.
React + TypeScript + Tailwind CSS (v4), client-side routing, local mock data only. No backend, payments or real video.

- Live: https://jin9942-cmd.github.io/tv-service/v2/ · https://tv-service-keig.vercel.app/v2/
- Video: real poker footage under Creative Commons, streamed from Wikimedia Commons, with stills in `public/media` (see `public/media/CREDITS.md`) — not WSOP footage.
- All players, events and results are fictional. The WSOP logo (`public/wsop-logo.webp`) is used at the WSOP team's request; it replaces the text wordmark in the header, footer, sign-in dialog and TV shells.

```bash
cd wsop-tv-v2
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + static build (dist/)
npm run publish:vercel   # build with relative paths and copy into ../wsop-tv/public/v2 (Vercel site)
```

## Screens

| Route | Screen | Highlights |
| --- | --- | --- |
| `#/watch/:dayId` | **Watch** | 16:9 player mock, LIVE / DELAYED / LATE START / INTERRUPTED / VOD badge, **per-table delay** (feature table 30 min, outer tables 15 min — the live edge and the "showing play from about …" note follow the table on screen), tables on hold (late start / interrupted) with a switch-back button, timeline with **hand markers** (All-in, Big Pot, Bluff, Bad Beat, Hero Fold — distinct glyph + tone) and tooltips, previous/next hand, **Jump to Live**, **overlay Off / Basic / Pro** (Pro adds stacks, hole cards, equity bar, hand history), audio tracks (English Commentary / Natural Sound / Spanish Commentary), CC, quality, volume, full screen, **multiview 1 / 2 / 4** with one audio source, side panel **Chip Counts / Current Hand / Tables** (bottom sheet on mobile; Tables shows each table's delay or state), spoiler blur + Reveal. `?clip=<handId>` opens a **free highlight** (single hand, own short timeline, end card with sign-in / plans CTA) when the full broadcast is locked |
| `#/` | Home | **v1-style featured player** (full-width real CC footage, muted autoplay, poster when reduced motion) with the **Live channels** band (one card per table: LIVE / Delayed / Late start / Interrupted + access), **Coming up** cards with a large date and Las Vegas time, Continue Watching, Free highlights, Followed Players' Latest Hands, Featured Series, Trending Hands, Archive Classics (full width) |
| `#/live` | Live | Now streaming (with per-table chips: delay / late start / interrupted) + coming up |
| `#/schedule` | Schedule | **v1 layout**: venue-calendar date strip with dots for days that have broadcasts, Las Vegas (PT) start time with your time underneath, status + #event · day · buy-in, status note, Watch / Details / View; Today also lists anything still on air; empty state with "Next day with broadcasts"; Remind me, Add to calendar (mock), your-time-zone selector |
| `#/series`, `#/events/:id` | Series & Events | Series → bracelet event → Day 1A/1B/2/3/Final Table, scoreboard (entrants, prize pool, first prize, level, players left, chip leader, champion), day list with status |
| `#/players`, `#/players/:id` | Players | Search + nationality filter (empty state), profile with earnings, bracelets (SVG), recent results, highlight hands, Follow + alerts toggle |
| `#/hands` | Hands & Clips | Filter chips, sort, skeleton loader |
| `#/archive` | Archive | Classics + replays (guests see part of it) |
| `#/account` | Account | GGPASS connection, subscription, devices (sign out one / all), Spoiler-Free Mode, default overlay/audio/captions, notifications, privacy requests, Responsible Gaming |
| `#/auth/ggpass` | GGPASS mock | External-domain look (light theme, fake address bar): sign-in → consent (email + nickname only) → redirect back |
| `#/plans`, `#/devices` | Plans / Devices | Monthly / Annual placeholders ("handled according to platform policy"); stream-limit device management |

States covered: empty (player search, followed hands), loading (skeletons on Watch and Hands), error (High Roller outer table feed in Tables tab / multiview, with Retry), broadcast states (Main Event Final Table: Outer Table 3 late start, Outer Table 4 interrupted).

### Content access badges

Every card and the Watch header carry an access badge, with a lock when the current viewer can't play it yet:

| Badge | Who can watch | Examples in the demo |
| --- | --- | --- |
| **Free** | Anyone, no account (not counted against the stream limit) | A quarter of the hands — the Home "Free highlights" row |
| **Sign in** | Any GGPASS account in good standing (no subscription) | Some hands, the 2019 / 2024 classics, Main Event Day 1A replay |
| **Subscribers** | Active subscription (paywall states 2–6 apply) | Live tables, other replays, most hands |

Access policy: `canWatch` / `gateForAccess` in `src/state/app.tsx`; per-item levels in `src/data/mock.ts`.

## Demo Controls (bottom-right, collapsible)

Visually separate from the product (dashed blue, monospace).

- **Account state:** 1 not signed in · 2 GGPASS, no subscription (plan picker at play) · 3 active · 4 subscribed but GGPASS not linked (link screen) · 5 GGPASS restricted (support link) · 6 too many devices (device management)
- **Featured stream:** LIVE / DELAYED / VOD / LATE START / INTERRUPTED for the Main Event Final Table (VOD turns the Home hero into a countdown; late start and interrupted show their own Home and Watch messages)
- **Region restricted:** "This event isn't available in your region" + alternatives + Notify me
- **Platform:** web / mobile / TV devices — limits overlay level and multiview per the parity matrix
- **Spoiler-Free Mode** shortcut

## TV Preview (10-foot UI)

Open with **TV Preview** (header) or Demo Controls. The TV UI is a 1920×1080 canvas scaled into a TV frame.

| Keyboard | Remote |
| --- | --- |
| ← ↑ → ↓ | D-pad (focus moves between the side menu and content rows; columns are remembered per row) |
| Enter | OK |
| Backspace | Back |
| Esc | Close the preview |

Screens (shared by every platform): Home, event detail, player, **TV sign-in** (6-digit code + QR mock, "Go to ggpass.example/activate", auto-authorizes after ~5 s). Optional 5% overscan safe-area guide.

### Platform UI shells

Switching the platform dropdown swaps the whole UI shell immediately (the current screen is kept so platforms can be compared). Design tokens, data and screen structure stay common; only the chrome and focus language change.

| Platform | Shell | Focus | Player |
| --- | --- | --- | --- |
| Apple TV | Top tab bar, large 2:3 poster cards | Lift + scale + soft shadow (parallax feel) | Multiview 1/2/4, overlay Off/Basic/Pro, hand-marker jump |
| Roku | Fixed left menu, uniform 16:9 grid | Thick square white border, almost no scaling | Multiview item disabled ("Not available on Roku"), overlay up to Basic (Pro disabled), simple trick-play bar |
| Android TV / Fire TV | Collapsible left rail (icons → labels when focused) + content rows | Scale + bright border | Multiview up to 2 (4 disabled), all overlay levels |
| Samsung / LG | Android TV shell + top system bar + colour-key hints (A/B/C/D) | Same as Android TV | Per parity matrix |

Unsupported features are never hidden — they stay in place, disabled, with the reason ("Not available on Roku"). The arrow / Enter / Backspace mapping is identical on every shell (top tabs: ↑ from the first row enters the tab bar; side menus: ← from the first column).

- Shell + focus tokens: `src/features/tv/tvTokens.ts` (one file)
- Focus engine: `src/features/tv/focus.ts` · shells & screens: `src/features/tv/TvApp.tsx` · frame + parity panel: `src/features/tv/TvPreview.tsx`

## Design

Tokens live in `src/styles/theme.css` (colour, type, radius, motion, layout, focus ring) and are used everywhere as Tailwind utilities.
Charcoal base, one restrained gold accent, status colours only for LIVE (red) and DELAYED (amber). No felt green, chips, cards or dice decoration. Numbers use tabular figures. Bracelets are a hand-drawn SVG icon. Copy talks about championships, the mind sport, strategy and competition — no real-money play, deposits, bonuses or betting CTAs anywhere.

Accessibility: keyboard-reachable controls with a visible focus ring, skip link, ARIA roles for tabs/radios/sliders/dialogs, focus-trapped modals, CC toggle, colour contrast ≥ WCAG AA (see token comments), markers distinguished by shape as well as colour, reduced-motion support.

## Assumptions

- **GGPASS SSO:** OAuth 2.0 / OIDC authorization-code flow with a consent screen; WSOP TV receives only email and nickname. New SSO users have no subscription until they pick a plan. TV uses a device-code flow (code + QR) at `ggpass.example/activate`.
- **Account states** 4–6 (unlinked subscription, restricted GGPASS account, stream limit) are assumed product policies; the stream limit is 2 concurrent streams.
- **Delay:** set per table — the feature table at a final table runs 30 minutes behind real time, outer tables 15; the timeline's live edge is the delayed edge of the table on screen, and chip counts / hands follow the stream.
- **Broadcast states:** *late start* (scheduled time passed, expected start shown) and *interrupted* (temporarily off air, resumes automatically) can apply to a whole broadcast or a single table.
- **Access levels:** free / sign-in / subscriber per content item; free clips play without an account.
- **Platform capabilities** in the parity matrix are placeholders to be confirmed per platform SDK.
- **Prices** are placeholders; billing follows the store/platform policy.
- Hand types, chip counts and equity are presented as competition data, in line with the spec.
- State lives in React only (no browser storage), so a reload resets the demo.
