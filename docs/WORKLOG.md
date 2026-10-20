# Scores — work log

Running notes on what's built, why, and what's next. Read this before starting a new session.

## Session 1 — 2026-10-20

### What shipped

- **Web app** live at https://scores.blasingame.dev (Cloudflare Worker `scores`, static assets only).
- **Repo**: https://github.com/timblazing/scores (public).
- **iOS**: Capacitor 8 project in `ios/`; builds in Xcode (`pnpm ios`). Not yet installed on a device.

Features (NFL + NBA):

| Area | Route | Notes |
|---|---|---|
| Scores | `/` (`?league=nfl\|nba`, `?d=YYYYMMDD`, `?w=&st=`) | All/NFL/NBA. Date strip for All/NBA, week strip for NFL. My Teams pinned on top. Live games refetch every 15s. |
| Game | `/:league/game/:id` | Team-color header, line score, win probability + game flow chart (scrubbable), leaders, odds, scoring summary (NFL), team stats, last 5, season series, injuries, game info, predictor (pre-game). Tabs: Game, Box score, Plays (NBA by quarter, NFL by drive), Team stats. |
| Standings | `/standings` | NFL by division (AFC/NFC), NBA by conference with play-in line. |
| Teams | `/teams` | Search, My Teams (localStorage), star to follow. |
| Team | `/:league/team/:id` | Schedule (regular/post), roster (NFL grouped by unit), team news. |
| Player | `/:league/player/:id` | Headshot header, stat splits, bio, game log, news. |
| News | `/news` | League news feed, links out to ESPN. |

### Stack

- Vite 8 + React 19 + TypeScript 7, Tailwind v4 (`@theme` tokens in `src/index.css`), TanStack Query 5, React Router 8, lucide-react.
- Fonts: DM Sans Variable (UI), Barlow Condensed 500/600 (scores/numbers).
- Capacitor 8 + `@capacitor/status-bar`. App ID `dev.blasingame.scores`.
- Deploy: `cf` CLI (beta) with `cloudflare.config.ts` + `@cloudflare/vite-plugin`. `pnpm run deploy`.

### Layout of the code

```
src/
  lib/espn.ts          ESPN client + normalizers (Game, Side, Odds, StandingGroup, …)
  lib/format.ts        dates, relative time, readable() lifts dark team colors
  lib/favorites.ts     My Teams store (localStorage + useSyncExternalStore)
  lib/useLeague.ts     league toggle state in URL, remembers last choice
  components/ui.tsx    Logo, Headshot, Card, Segmented, Tabs, FavButton, states
  components/GameRow.tsx  Apple Sports–style score row
  components/game/     WinChart (SVG), BoxScore, Plays, sections (odds, leaders, injuries, …)
  routes/              Scores, Game, Standings, Teams, Team, Player, News
```

### Design

- Based on components.blasingame.dev (shadcn neutral dark, DM Sans, 0.5rem radius), pushed to true black `#000` for OLED.
- Team colors are the only accent: gradient headers on game/team/player pages, chart lines, stat bars. `readable()` lightens very dark team colors.
- Reference: Apple Sports / ESPN / Sleeper screenshots (`ios-sports-apps.pdf`).

### ESPN API notes (verified 2026-10-20)

Reference: https://github.com/pseudo-r/Public-ESPN-API

| Data | Endpoint |
|---|---|
| Scoreboard | `site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard?dates=YYYYMMDD` (NFL week: `?week=N&seasontype=2&dates=YYYY`) |
| Game | `.../summary?event={id}` (header, boxscore, plays or drives, winprobability, pickcenter, leaders, injuries, lastFiveGames, seasonseries, predictor, gameInfo) |
| Standings | `site.api.espn.com/apis/v2/sports/{sport}/{league}/standings` (NFL `?level=3` for divisions). `/apis/site/v2/.../standings` is a stub. |
| Team schedule | `.../teams/{id}/schedule?seasontype=2` (also carries team name/color/record/standing) |
| Roster | `.../teams/{id}/roster` |
| News | `.../news?limit=N&team={id}` |
| Athlete | `site.web.api.espn.com/apis/common/v3/sports/{sport}/{league}/athletes/{id}` (+ `/overview`, `/gamelog`) |
| Images | `a.espncdn.com/combiner/i?img=/i/teamlogos/{league}/500-dark/{abbr}.png&w=&h=` and `/i/headshots/{league}/players/full/{id}.png` |

Gotchas:

- **CORS**: every endpoint above sends `Access-Control-Allow-Origin: *` **except** `/teams` and `/teams/{id}`. The team list comes from standings and team detail from the schedule endpoint instead.
- **Bot blocking**: ESPN returns 403 to the `HeadlessChrome` user agent. When screenshotting with agent-browser, set `AGENT_BROWSER_USER_AGENT` to a normal Chrome/Safari UA. The WKWebView UA is fine.
- NBA `season.year` is the ending year (2026-27 season = 2027).
- NFL default scoreboard flips to the next week mid-week; the week strip comes from `leagues[0].calendar` (`calendarType: list`).
- Standings entries aren't ordered; sort by `playoffSeed`, then `winPercent`.
- `winprobability[].playId` maps to `plays[].id` (NBA) or `drives.previous[].plays[].id` (NFL).

### Bugs fixed

- **"l is not a function" on client-side navigation** (Teams/Standings/News). `useEffect(() => window.scrollTo(0, 0))` implicitly returned `scrollTo`'s result, which is a Promise in current Chrome. React treated it as a cleanup function. Always use a block body for effects.

### Deploy & iOS

- Web: `pnpm run deploy` → `tsc -b && cf deploy` → Worker `scores` with custom domain `scores.blasingame.dev`. SPA fallback via `assets.notFoundHandling`. The zone has a `*.blasingame.dev` wildcard A record; the Worker custom domain takes precedence for `scores`.
- iOS: `pnpm ios` builds with `--mode capacitor` (skips the Cloudflare Vite plugin so output is plain `dist/`), syncs, opens Xcode. Sign with your free Personal Team; for no-cable 7-day refreshes, build an `.ipa` (see README) and install with SideStore.
- Xcode 27.1 reported "CoreSimulator is out of date" — update components in Xcode settings before using the simulator.

### Next up

1. Global search bar (teams + players).
2. Team logo watermark (subtle, on headers/home).
3. Cache ESPN responses at the Worker edge to cut client → ESPN calls.
