# Scores — work log

Running notes on what's built, why, and what's next. Read this before starting a new session.

## Session 1 — 2026-10-20

### What shipped

- **Web app** live at https://scores.blasingame.dev (Cloudflare Worker `scores`, static assets only).
- **Repo**: https://github.com/timblazing/scores (public).
- **iOS**: Capacitor 8 project in `ios/`; builds in Xcode (`pnpm ios`). Not yet installed on a device.

Features (NFL + CFB/FBS + NBA):

| Area | Route | Notes |
|---|---|---|
| Scores | `/` (`?league=nfl\|cfb\|nba`, `?d=YYYYMMDD`, `?w=&st=`) | All/NFL/CFB/NBA. Date strip for All/NBA, week strip for NFL/CFB. Order: My Teams, Live, then (CFB) Top 25, then by league/day. All shows only Top 25 college games. AP rank shown next to ranked college teams. My Teams pinned on top. Live games refetch every 15s. |
| Game | `/:league/game/:id` | Team-color header, line score, win probability + game flow chart (scrubbable), leaders, odds, scoring summary (NFL), team stats, last 5, season series, injuries, game info, predictor (pre-game). Tabs: Game, Box score, Plays (NBA by quarter, NFL by drive), Team stats. |
| Standings | `/standings` | NFL by division (AFC/NFC), NBA by conference with play-in line, CFB by FBS conference (scrollable picker). |
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
| Standings | `site.api.espn.com/apis/v2/sports/{sport}/{league}/standings` (NFL `?level=3` for divisions, CFB `?group=80` for FBS). `/apis/site/v2/.../standings` is a stub. |
| Team schedule | `.../teams/{id}/schedule?seasontype=2` (also carries team name/color/record/standing) |
| Roster | `.../teams/{id}/roster` |
| News | `.../news?limit=N&team={id}` |
| Athlete | `site.web.api.espn.com/apis/common/v3/sports/{sport}/{league}/athletes/{id}` (+ `/overview`, `/gamelog`) |
| Images | `a.espncdn.com/combiner/i?img=/i/teamlogos/{league}/500-dark/{abbr}.png&w=&h=` and `/i/headshots/{league}/players/full/{id}.png` |

Gotchas:

- **CORS**: every endpoint above sends `Access-Control-Allow-Origin: *` **except** `/teams` and `/teams/{id}`. The team list comes from standings and team detail from the schedule endpoint instead.
- **Bot blocking**: ESPN returns 403 to the `HeadlessChrome` user agent. When screenshotting with agent-browser, set `AGENT_BROWSER_USER_AGENT` to a normal Chrome/Safari UA. The WKWebView UA is fine.
- College football: league slug `college-football`, internal id `cfb`. FBS only via `groups=80` (scoreboard) / `group=80` (standings); the default scoreboard is just the Top 25. Logos are `/i/teamlogos/ncaa/500-dark/{teamId}.png` (by id, not abbreviation). Standings entries repeat each stat per split (home/away/...); the first occurrence is overall.
- NBA `season.year` is the ending year (2026-27 season = 2027).
- NFL default scoreboard flips to the next week mid-week; the week strip comes from `leagues[0].calendar` (`calendarType: list`).
- Standings entries aren't ordered; sort by `playoffSeed`, then `winPercent`.
- `winprobability[].playId` maps to `plays[].id` (NBA) or `drives.previous[].plays[].id` (NFL).

### Bugs fixed

- **"l is not a function" on client-side navigation** (Teams/Standings/News). `useEffect(() => window.scrollTo(0, 0))` implicitly returned `scrollTo`'s result, which is a Promise in current Chrome. React treated it as a cleanup function. Always use a block body for effects.

### Deploy & iOS

- Web: `pnpm run deploy` → `tsc -b && cf deploy` → Worker `scores` with custom domain `scores.blasingame.dev`. SPA fallback via `assets.notFoundHandling`. The zone has a `*.blasingame.dev` wildcard A record; the Worker custom domain takes precedence for `scores`.
- iOS: `pnpm ios` builds with `--mode capacitor` (skips the Cloudflare Vite plugin so output is plain `dist/`), syncs, opens Xcode. Sign with your free Personal Team; for no-cable 7-day refreshes, build an `.ipa` (see README) and install with SideStore.
- From the Raspberry Pi: `CF_SKIP_TYPES=1 pnpm run deploy`. The Cloudflare plugin's type generation spawns workerd, whose tcmalloc assumes a 48-bit address space and aborts on the Pi's 39-bit kernel. Node lives in `~/.hermes/node`; `node`, `npm`, `pnpm` are symlinked into `~/.local/bin`.
- Xcode 27.1 reported "CoreSimulator is out of date" — update components in Xcode settings before using the simulator.

### Next up (done in Session 2)

1. ~~Global search bar (teams + players).~~
2. ~~Team logo watermark (subtle, on headers/home).~~
3. ~~Cache ESPN responses at the Worker edge to cut client → ESPN calls.~~

## Session 2 — 2026-10-20

### What shipped

- **Global search** (`src/components/Search.tsx`). A native `<dialog>` command palette opened from a "Search teams and players" field at the top of Scores (phone), a "Search" field in the sidebar (desktop), or `⌘K` / `Ctrl K` / `/` from any page.
  - Teams match locally against the standings-derived team list (`['teams', league]` query, shared with the Teams page): exact abbreviation/nickname first, then word prefix, then substring for 4+ characters.
  - Players come from `site.web.api.espn.com/apis/common/v3/search?query=&type=player&sport=&league=`, one request per league in parallel (a comma-separated `league` returns nothing). Debounced 200 ms, cached 10 min in TanStack Query, `keepPreviousData` to avoid flicker, aborted on new keystrokes.
  - Empty query shows My Teams. Combobox/listbox ARIA, ↑/↓/Enter/Esc, closes on route change. Page scroll locks while open (`html:has(dialog[open])`).
  - `apis/search/v2` also has CORS but mixes every sport and content type; `common/v3/search` filters by league and returns numeric IDs, so that's the one used.
- **Team logo watermark** (`Watermark` in `src/components/ui.tsx`). 240 px (phone) / 320 px (≥640 px) logo at 9% opacity, bleeding off the edge and masked toward the content. Game header shows away on the left and home on the right; team and player headers show it on the right. Replaced the one-off version on the player page. Player meta line now wraps cleanly on narrow screens.
- **ESPN edge cache** (`worker/index.ts`, wired up in `cloudflare.config.ts` as `entrypoint` with `assets.runWorkerFirst: ['/api/*']`, so the SPA fallback and static assets never touch the Worker).
  - `/api/espn/site/<path>` → `site.api.espn.com/<path>`. Path allowlist (NFL/CFB/NBA only): scoreboard, summary, team schedule, roster, news, standings. Anything else is 403, unknown prefixes 404, non-GET 405. Unknown query params are dropped so they can't fragment the cache.
  - Cache API (`caches.open('espn')`). TTLs: scoreboard/summary 10 s when the body contains `"state":"in"`, else 60 s; schedule 2 min; standings and news 5 min; roster 30 min. Responses carry `X-Edge-Cache: HIT|MISS` and `X-Edge-TTL`; browsers get `Cache-Control: no-cache` so edge and browser TTLs don't stack.
  - Client (`src/lib/espn.ts` `fetchEspn`): web builds call the proxy for `site.api.espn.com` and fall back to ESPN directly if the proxy errors. Inside Capacitor (`Capacitor.isNativePlatform()`) everything goes direct, so the iOS app doesn't depend on the Worker.

### Gotchas found

- **`site.web.api.espn.com` returns 403 to Cloudflare Workers** (athletes, search), whatever the User-Agent, Origin, or Referer. It works from a laptop and from `pnpm dev` (the local runtime uses your IP), so it only shows up in production. That host sends CORS, so the client calls it directly; only `site.api.espn.com` is proxied. Check `curl https://scores.blasingame.dev/api/espn/...` after deploying, not just local dev.
- **Positioned `<dialog>` + `h-auto` stretches to the full viewport** (the UA sets `inset: 0`). Use `h-fit` for the desktop panel.
- `cf deploy` + `@cloudflare/vite-plugin` runs the Worker in `pnpm dev` too, so `/api/espn/*` works locally.
- agent-browser `screenshot` resolves relative paths against the daemon's working directory, not the shell's. Pass absolute paths.

### Verified

- Proxy on the live site: MISS then HIT, TTL 10 s with a live NBA game, 300 s for standings; 403 for `/teams` and other leagues, 404 for unknown hosts, 405 for POST, 204 for OPTIONS; deep links (`/nba/team/13`, `/nfl/player/…`, `/standings`) still return the SPA.
- Screenshots at 393×852 and 1440×900 of Scores, Standings, Teams, News, Game, Team, Player, and the search dialog (empty, results, keyboard selection), on fresh loads and through in-app navigation (Scores → game → team → roster → player → game log → Scores → search → player → Standings → News → back) with no runtime errors or error states.

### Next up

1. Search: recent searches, and team nicknames ESPN's names don't cover ("Sixers", "Niners", "Cavs").
2. Consider caching athletes/search somewhere ESPN doesn't block, or accept direct calls.
3. ~~Install the iOS build on a device~~ — completed in Session 3.

## Session 3 — 2026-10-27 — iPhone install and next-session handoff

### Current state

- **Scores installed successfully on the owner's physical iPhone 16 Pro**, running iOS 27.2, through SideStore. Owner confirmed installation succeeded; `devicectl` subsequently confirmed Scores version **1.0 (1)** is installed. No full functional or visual device QA was performed in this session.
- The installed app contains the shared website source through **`ee5fd21`**, including the possession triangle and centered game header clock. Website deployments alone do not update the bundled native app.
- No application source or native project changes were required. No website deployment was performed. This session updates the build/setup documentation only.
- SideStore **0.7.0-20260911.328+6032424a (0700)** was installed using **iloader 2.4.0** on the Mac. The owner authenticated in SideStore and successfully completed its first 7-day refresh with LocalDevVPN connected.

### Build and packaging evidence

- `pnpm exec tsc -b` passed; `pnpm sync` built in Capacitor mode and copied the current web assets into iOS.
- Unsigned Release archive via the README's `xcodebuild` command: **ARCHIVE SUCCEEDED**. All **19** files from `dist/` matched their archived `App.app/public/` copies by SHA-256.
- Initial packaging used `ditto -c -k --keepParent`, which added AppleDouble `._*` entries, including a second `.app`-suffixed entry at `Payload/._App.app`. SideStore rejected it as **"The app is in an invalid format."** Its extraction code selects the first `.app`-suffixed payload entry without filtering these metadata files; this explains a plausible failure path, though the selected entry was not captured in phone logs.
- Repacked using plain `zip` with `COPYFILE_DISABLE=1`, excluding `._*` and `.DS_Store`. Verified exactly one payload app, valid Info.plist and executable, no AppleDouble entries, and passing ZIP integrity. The owner confirmed this replacement installed.
- Local build artifacts (ignored by Git): `ios/App/build/Scores.xcarchive`, `ios/App/build/Payload/App.app`, and **`ios/App/build/Scores-clean.ipa`** (the successful package). The original `Scores.ipa` is the rejected package; use the clean one from this session or rebuild using the corrected README commands.
- Transferred the successful package directly into SideStore's `Documents/Scores-clean.ipa` using `devicectl device copy to`; the owner selected it under **My Apps → + → On My iPhone → SideStore**.

### Setup issues resolved

- iloader's device-name discovery error persisted even though Finder saw the phone. Dismissing it and selecting **USB** allowed progress; the exact source of the rejected query remains unknown.
- Apple returned account-locked error `-20209`. The owner unlocked the account, verified login on Apple's site, restarted iloader/reconnected the phone, and successfully logged in. No credentials or pairing files belong in this repository.
- SideStore then returned `-80045` on the phone despite successful desktop authentication. Turning **On-Device Anisette off**, selecting **Jkcoxson (Mac)**, disabling automatic server rotation, and restarting SideStore resolved authentication. No pairing reset was required. See README for the instructions and upstream issue link; availability and menu names may change.

### Next session: mobile app tweaks

- Owner plans to start a fresh session for mobile changes; no specific tweaks have been requested yet.
- Read this work log and README first. Shared React UI lives in `src/`; native wrapper/config lives in `ios/` and `capacitor.config.ts`. Native requests go directly to ESPN, as documented above.
- For each native update: typecheck, `pnpm sync`, archive, package with the corrected ZIP procedure, transfer, and install through the now-working SideStore setup. Recheck the connected device and installed SideStore identifier instead of assuming prior connection state.
- Validate requested changes on the physical phone; successful installation alone is not visual or functional acceptance. Do not reset the working SideStore authentication/pairing as a routine build step.

## Session 4 — 2026-10-27 — Native iOS feel

- **System tab bar** (`ios/App/App/NativeTabs.swift`): on iOS 18+ the root is a `UITabBarController` (Liquid Glass on iOS 26+) with Scores/Standings/Teams/News plus a `UISearchTab`. A single `ScoresBridgeViewController` web view moves into the selected tab's container. Native → web: `nativetab` CustomEvent (`{index, reselect}` or `{search: true}`). Web → native: local `NativeTabs` plugin (`select`, `setHidden`). The shell sets `window.__NATIVE_TABS__` at document start; the web hides its own bottom nav when it's present. iOS < 18 keeps the web nav.
- **Tab behavior** (`src/lib/native.ts` `useNativeTabs`): each tab remembers its last page and scroll position; switching uses `replace` so Back never crosses tabs; tapping the current tab pops to root, or scrolls to top at root. The search tab opens the search sheet and hides the tab bar while it's open.
- **Native polish**: no scroll indicators (native + CSS), edge-swipe back, rubber-band scrolling, SF Pro instead of DM Sans, no text selection/callouts outside inputs (`html.native`). The status-bar area is a soft scroll-edge fade instead of a solid black bar.
- **Safe area fix**: `main` and the hero headers both added `pt-safe`, so game/team/player headers sat a full status-bar height too low. `main` no longer pads; `PageHeader` and loading states do.
- **Team names**: score rows and the game header use abbreviations (POR, LAL) instead of truncated nicknames. Long broadcast lists clamp to two lines.
- Verified in the iOS 26.2 simulator (iPhone 17 Pro) with a temporary scripted run through tab switch → back → game → other tab → back (game restored) → reselect (pops to root). Release archive succeeded; `ios/App/build/Scores.ipa` repacked clean (no `._` entries). Not yet checked on the physical phone.
