# Scores — work log

Running notes on what's built, why, and what's next. Read this before starting a new session.

## Slate — what's next

Keep this list current at the end of every session; session notes below are history. Last updated: Session 11, 2026-10-31.

**State:** `main` has the native Expo app in `mobile/` with tabs Scores (gear → Settings), Fantasy and Search, plus first-launch onboarding. PR #13 (Session 10) added the ESPN-style Gamecast game page, cut Scores to today only (Favorites, Live, today's games by league), and removed the Leagues tab. An IPA from that `main` was built for the owner to install through SideStore; not yet confirmed on the phone. Session 11 added Fantasy data from RosterAudit and PropLine in a PR (`feat/fantasy-data`); typecheck and lint pass, not yet run on a device.

**Simulators need the owner's approval** (`AGENTS.md` → "Simulators"). Verify with typecheck and lint; the owner tests on the phone.

**Up next, in order:**

1. **Owner tests the Session 10 IPA on the phone**: Scores today-only, the title on the settings row, the Gamecast game page during a live game, and Session 9's context menus and haptics.
2. **More design refinement.** The owner is focused on design. Ask for notes; offer side-by-side simulator screenshots only if the owner approves a simulator.
3. **Owner tests the Fantasy data on the phone** (Session 11): book lines and ▲/▼ on a pregame lineup, tapping a player, the all-time series card, Standings → Power (Oiled Down only) and All-time. Lines only show before kickoff, so test before a slate.
4. **Native features still open:** `@expo/ui` SwiftUI controls. Widgets: not yet (owner).
5. **Parked.**
   - **Live Activities for favorites' live games.** The owner wants them but won't pay the $99/yr Apple program, and updates while the app is closed need ActivityKit push from your own team. Free alternatives (score alerts through ntfy/Bark or Web Push, in-app-only Live Activity) are in `docs/IOS_SIDELOADING.md` → "Live scores without the $99 program". Pitch one if the owner asks again.
   - Football possession indicator, in some form other than the left/right arrow.
   - Fantasy's empty-state "Open Settings" button is unverified; the owner says it isn't a priority.
   - Sharing Scores with a friend without SideStore: options researched in `docs/IOS_SIDELOADING.md` → "Sharing Scores with a friend". Future idea, nothing to build yet.

## Session 11 — 2026-10-31 — Fantasy data: lines, values, history, power rankings, player page

- Research in `docs/FANTASY_DATA_APIS.md`; the owner asked for all five recommendations, with DraftKings, Underdog and PrizePicks as the only books and no empty states (anything without data is hidden).
- `lib/propline.ts`: one slate-wide call (`/sports/football_nfl/odds`, three books, pass/rush/rec yards + anytime TD), refetched at most every 30 min. Main line per book: PrizePicks' standard line, otherwise the Over/Under pair priced closest to even. Players match by normalized name plus the game's ESPN team ids (Sleeper's `espn_id` is too sparse). PrizePicks posts no TD prices.
- `lib/rosteraudit.ts`: values and 7-day trends (superflex or 1QB by league), league history (managers, champions, record book, head-to-head), roster grades (dynasty only; redraft returns "League not synced"), and the keyed player page.
- Lineup rows: a third line "D84.5 U79.5 P80.5" (book initial in its color) before kickoff, ▲/▼ for value moves of 150+ this week, legend and RosterAudit credit under Starters; tapping a player opens `/fplayer/[id]`. Matchups get an All-time series card when the managers have met.
- Standings: Season | Power | All-time segments; Power and All-time only appear when RosterAudit has data.
- Player page (`FantasyPlayerScreen.tsx`): this week's lines by book, dynasty value with trends, badges and a value sparkline, outlook (PPG, floor/median/ceiling finish, breakout/bust %, 5-year values), weekly usage.
- Keys live in `mobile/.env.local` as `EXPO_PUBLIC_*` and are bundled into the IPA (personal sideloaded app; the repo only has `.env.example`). A Worker proxy would keep them out of the app if that ever matters.
- Typecheck and lint pass. Not run on the simulator (owner's call); the owner tests on the phone.

## Session 10 — 2026-10-31 — Gamecast game page, Scores today-only, no Leagues tab

- PR #13, squash-merged as `f60cfff`, combined two sessions: the ESPN-style Gamecast game page, and the Scores changes.
- Scores (`ScoresScreen.tsx`): only today's games. Sections are Favorites (renamed from My Teams), Live, then today's games by league with no heading. Yesterday's scoreboard is still fetched so games past midnight stay listed. The title is a header item on the settings row instead of a large title.
- Leagues tab removed along with `LeaguesScreen`/`LeagueScreen` and the `(leagues)` routes; they're in Git history if the owner brings them back. Search's "My Teams" is "Favorites".
- Typecheck and lint pass. Not run on a simulator; the owner tests the IPA on the phone.
- Simulator use now needs the owner's approval, in the global agent instructions and this repo's `AGENTS.md`, `mobile/AGENTS.md` and README. Sessions had been booting one to check every change.
- Branch cleanup: only `main` and `feat/fantasy-data` remain.

## Session 9 — 2026-10-30 — Link previews, context menus, haptics, SideStore over Tailscale

- Game rows (`GameRow.tsx`): press and hold for the native game page preview and a menu with Follow/Unfollow for each team and Share (ESPN game link with the score line). Search team rows (`TeamItem.tsx`): preview plus Follow/Unfollow.
- Haptics: `toggleFollow` in `components/ui.tsx` gives a success tap when following and a selection tap when unfollowing (star buttons, team page, menus). Pull-to-refresh starts with a light tap. A success tap fires when a My Teams live game changes score (`useScoreTaps` in `ScoresScreen.tsx`).
- Typecheck and lint pass. Not run on the simulator or phone.
- **SideStore refreshes over Tailscale; LocalDevVPN is no longer needed.** `sidestore-reflect.service` on **raygun** (`tools/sidestore-reflect/`) reflects `10.7.0.1`, advertised as a Tailscale subnet route. The reflected packets are SNATed to raygun's Tailscale IP, because the phone's Tailscale drops new connections from `10.7.0.1`. SideStore runs in Remote Endpoint mode with Device IP `10.7.0.1`. The owner confirmed it works (2026-10-30). Refreshing needs Wi-Fi. LocalDevVPN stays installed as the fallback if raygun is down. The owner may still try ArcticSign + Feather.

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

## Session 4 — 2026-10-27 — Native Expo app

- Replaced the Capacitor web wrapper with a native Expo SDK 58 app in `mobile/` (branch `feat/expo-app`). Data code (`espn.ts`, favorites, formatting, React Query) was ported; all screens were rebuilt with React Native components.
- Navigation: native Liquid Glass tab bar with **Home**, **Favorites** and a separate search button (`role="search"`, native search field in the tab bar). Each tab is a stack sharing game / team / player detail routes, with the native swipe-back gesture.
- Home: header-left SwiftUI menu ("All Leagues ⌄", NFL, CFB, NBA; persisted). With a league picked, a header-right native segmented control switches Scores / Standings / News. "All" shows scores only. The Teams page moved into Favorites (star teams, filter with a search field).
- Game / team / player pages draw the team-color hero under the status bar. Two settings make that work: `disableAutomaticContentInsets` on every `NativeTabs.Trigger` (otherwise native tabs switch the first ScrollView's `contentInsetAdjustmentBehavior` from `never` back to `automatic`, pushing the hero below the header), and `scrollEdgeEffects: { top: 'hidden' }` on the detail screens.
- Verified on the iOS 26.2 simulator (Release build): Home for all leagues and NBA, Standings, News, a live game page, a team page, Favorites, and search. Not verified: opening the league menu by tap (no simulator tap tool here), swipe-back, and the physical phone.

## Session 5 — 2026-10-28 — Fantasy tab, plainer Home chrome

- Home: the date/week strip is no longer a floating glass pill. It's a full-width dark bar under the header with a hairline bottom edge and an underline on the selected day, like the web app's `DateStrip`. The header-right Scores / Standings / News switch is now plain underline text tabs (`Tabs` in `components/ui.tsx`) with `hidesSharedBackground`, instead of a native segmented control in a glass capsule.
- NBA games show one TV channel: the national broadcast, else "League Pass" (shortened from "NBA League Pass"), else the first local feed (`primaryBroadcast` in `lib/espn.ts`).
- Removed the Favorites tab. Starring teams still works from team pages and search, and starred teams still pin to "My Teams" on Scores.
- New **Fantasy** tab (`screens/FantasyScreen.tsx`, `lib/sleeper.ts`, `lib/useFantasy.ts`), modeled on the sleeper-fantasy-dashboard repo. The Sleeper user (timblazing) and the two leagues (Slim Pickens Memorial League, Oiled Down) are hardcoded. Header menu picks the league (persisted); tabs switch Matchup (my head-to-head lineup with live points, projections and win odds), League (every matchup that week; tap one for its head-to-head) and Standings (grouped by division when the league has them). Projections come from Sleeper's `api.sleeper.com` projections feed, scored with each league's settings; player game status comes from ESPN's NFL scoreboard.
- Verified on the iOS 26.2 simulator (Release build): Home strip and tabs (All and NBA), NBA TV labels, Fantasy Matchup / League / Standings for both leagues, a finished week (Week 7), and a matchup detail page. Not verified on the physical phone.

## Session 6 — 2026-10-28 — Search nicknames and recents (mobile)

- The owner has used the Expo app on their iPhone (built after the Fantasy commit) and installed it through SideStore. They haven't given detailed feedback yet.
- `ios/` and `capacitor.config.ts` stay on purpose: the Capacitor web wrapper may be the starting point for a separately maintained build for an iPad mini 2 on iOS 10 (see the owner's `ios-games` repo). It isn't the current iPhone app.
- Search matches fan nicknames ESPN's names don't contain ("Sixers", "Niners", "Cavs", "Bama", "Noles", "Dubs"…), in `mobile/src/lib/nicknames.ts`, keyed by league and ESPN abbreviation. An exact nickname ranks like an exact abbreviation; 3+ letters prefix-match a nickname ("six" → 76ers).
- Search remembers the last 8 teams and players opened from it (`mobile/src/lib/recents.ts`, same kv-store pattern as favorites). They show under "Recent", with a Clear button, above My Teams when the field is empty.
- Game rows: the spread and TV channel lines use `colors.muted` instead of `colors.faint`; they were hard to read on the phone.
- Backlog item "cache athletes/search somewhere ESPN doesn't block": closed as "call ESPN directly". The native app already calls ESPN directly, so the Worker proxy doesn't matter there.
- Verified on the iOS 26.2 simulator (Release build), driven with agent-device: the league menu opens by tap; "sixers", "niners", "cavs" and "bama" return the right team first; opening a team and a player from search adds both to Recent, newest first; Clear empties it; swipe-back from a game page returns to Home; the spread and channel text are readable. The web app's search (`src/components/Search.tsx`) is unchanged.

## Session 7 — 2026-10-28 — Simulator setup notes; next direction

- The owner keeps the phone on the newest iOS: the iOS 27 public beta, moving to the **iOS 27.2 release candidate**. Downloaded the iOS 27.1 simulator runtime (Xcode 27.1). It only supports the iPhone Duo, but the iOS 27.0 runtime, installed too, supports the iPhone 16 Pro, so one was created on 27.0 (UDID in README). The Release build runs on iOS 27.0, checked on the iPhone 18 Pro simulator because T3's Device panel didn't list the new iPhone 16 Pro yet.
- README now covers the Release simulator build. `mobile/AGENTS.md` collects the agent-device lessons from Session 6: stale snapshots after search typing, stale refs, the coordinate scale and the swipe-back gesture.
- **Owner's next focus:** refine the design to their taste, and explore native components, features and tools the Expo rebuild makes possible (e.g. `@expo/ui` SwiftUI controls, widgets / Live Activities, haptics, context menus and link previews). Have the owner pick the directions before building. They want options shown as side-by-side simulator screenshots in a later session; the workflow is in `mobile/AGENTS.md` → "design work with the owner".

## Session 8 — 2026-10-29 — Scores hub, settings, onboarding

- Game page polish (PR #8): centered records, no star in the header, a "Team" tab, an untitled win probability card, no top divider on Leaders / Scoring summary, and the possession indicator removed per the owner.
- **Home became Scores** (`(scores)` tab, `screens/ScoresScreen.tsx`): one page for every followed league, yesterday through the next 7 days, no league menu or date strip. Per-day, per-league ESPN scoreboards (date ranges return 400), deduped by `league:id` and bucketed by local start day. Sections: Yesterday (finals, collapsed), My Teams, Live, Today (by league), then one collapsible section per upcoming day (tomorrow open). My Teams holds today's games for favorites plus each favorite's next game, labeled with its day. Outside My Teams, college football shows only Top 25 games. Settings opens from a gear button at top right.
- **Leagues tab** (`(leagues)`): list of followed leagues, each opening Standings / News (`screens/LeagueScreen.tsx`, moved from the old Home screen).
- **Settings** (`lib/settings.ts`, one kv-store blob): followed leagues (at least one), favorite teams picker (`components/TeamPicker.tsx`), Sleeper username (validated against `api.sleeper.app/v1/user/<name>`), per-league show/hide for Fantasy, and "Show onboarding again". **Onboarding** (`screens/Onboarding.tsx`) replaces the tabs until finished; existing installs see it once.
- Fantasy no longer hardcodes the account: leagues come from the Sleeper user's current-season leagues (`useMyFantasyLeagues`), minus hidden ones.
- The Leagues list is the `leagues` route, not `index`: two tab groups with `index` both claim `/`, and the app opened on Leagues.
- The Fantasy header menu shows a shortened league name (`shortLeagueName`); the full "Slim Pickens Memorial League" pushed the Matchup / League / Standings tabs into an overflow menu.
- Removed `homeSelection.ts` and the old Home screen.
- Verified on the iPhone 18 Pro simulator (iOS 27.0, Release build): onboarding (leagues, starring a team from search, Sleeper lookup for timblazing), Scores with live games, My Teams and collapsible days, the gear → Settings, hiding a fantasy league, Fantasy header, Leagues → NFL standings, and opening a game from Scores. Not verified: the "Open Settings" button on Fantasy's empty state (`/settings` exists in three tab groups), and the phone.
