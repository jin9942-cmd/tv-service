# WSOP TV — v9 demo. A fresh build (not forked from v8).

- Live: https://tv-service-keig.vercel.app/v9/
- Run: `npm install`, `npm run dev`; publish: `npm run publish:vercel` (copies the build into `../wsop-tv/public/v9`).
- Footage and stills come from `../wsop-tv/public/nas` (served at `/nas/`).

## The idea: the channel is the tournament

The Tournament Ticker along the top is the remote control and the main navigation. [T] is the centre; every other screen leads back to it.

| Screen | Route | What it does |
| --- | --- | --- |
| **[T] Tournament live** | `/watch/:id` | Large player (LIVE, -30s timeshift, CC, full screen; scoreboard over the picture), info bar (Stats / Highlights / Results), chip-count strip, then **Summary / Chip Counts / Hand History / Charts** (NBA TV's Summary / Box Score / Play-By-Play / Game Charts). Chip counts and hands update live: a simulation stands in for the EBS Chip Management and Hand History feeds. When several broadcasts are live, the viewer picks one card; the screen is never split. VOD and past-final replays use the same frame, marked VOD / REPLAY. |
| **[R] Hand replay** | `/hands`, `/hands/:id` | Free for everyone. Clip player, the hand street by street, the players in the hand (→ [P]), back to the live broadcast, more from the event. Hands in [T]'s Hand History that have a clip link here. |
| **[P] Player profile** | `/players/:id` | Bracelets, earnings, live chips, Watch Live, highlight clips, **PAST FINALS** timeline (→ that final in [T] as a replay), career stats. `/players` lists the live final tables as player cards. |
| **[S] Schedule** | `/schedule`, `/event/:id` | Featured event (players left, chip leader, big blind), 7-day date strip, live / ended / upcoming, PT or the viewer's own time zone, Watch / Replay / Set reminder, empty days. Event detail: the picture with prize, status, blinds, chip leader and average stack beside it; recap and key hands. |
| **[L] Landing** | `/` (Free tier) | Free highlights first, never a paywall: hero, free clips, the GGPass plan table, Subscribe via GGPass. Subscribers skip it and land straight in [T] (the live table, or the recommended replay when nothing is live). |
| **[W] GGPass subscribe** | `/subscribe?plan=&next=` | Mock: sign in → choose plan → back to the screen the viewer came from. |

**Plans (GGPass bundle, billed by WSOP+), all mocked:** Free ($0): highlight clips, schedule · Standard ($9.99/mo): + live streaming, timeshift / VOD · Platinum ($49.99/mo): + multi feature table select (pick any table while several are live; the first live table needs Standard).

**DEMO button (bottom right):** switch GGPass tier (Free / Standard / Platinum) and On air / Off air. Demo day: Tue 14 July 2026, 3:12 PM PT.

Nothing connects to AWS, GGPass, WSOP+ or EBS. Players, chip counts, hands and results are sample data.
