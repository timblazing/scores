# Fantasy data APIs: RosterAudit and PropLine

Research notes, 2026-10-31. All five recommendations below were built in Session 11 (`lib/propline.ts`, `lib/rosteraudit.ts`); see `docs/WORKLOG.md`. Every endpoint below was called live against the owner's leagues (Oiled Down = dynasty `1388584098439639040`, Slim Pickens = redraft `1389391504413310976`, user `TimBlazing` / `1028415641872699392`).

Keys already exist locally: `ROSTERAUDIT_API_KEY` in `~/DEV/github/active/sleeper-fantasy-dashboard/.env`, `PROPLINE_API_KEY` in `~/DEV/github/in progress/propline/.env` (that key is now on the **free tier**: 1,000 requests/day, 10 burst / 5 per sec).

## RosterAudit (`https://rosteraudit.com/wp-json/ra/v1`)

Keyed by **Sleeper player id**, so it joins to our data with no mapping. Send a real `User-Agent` (docs say default curl/Python UAs are blocked; `curl/8.0` still worked today). Every response carries `attribution` / `attribution_url`; terms ask that we show "Values by RosterAudit.com" with a link wherever values appear. ~0.2–0.6 s per call.

| Endpoint | Key? | Result | What it gives us |
|---|---|---|---|
| `/rankings/values?format_key=1qb_ppr` | no | 200, 25 KB, 906 players | `{sleeper_id: {sf, 1qb}}` value map. One call covers every roster. |
| `/players/search?q=&limit=` | no | 200 | value, pos/overall rank, tier, `trend_7d/30d`, `buy_low`/`sell_high`, headshot URL |
| `/players/{sleeper_id}` | no | 200, 4 KB | above + `trend_90d`, weekly `value_history` (40 points), injury fields |
| `/projections/embed/{id}` | no | 200, 1 KB | 5-year value curve with confidence, PPG (std/half/ppr), one-paragraph outlook |
| `/projections/ppg-rankings` | no | 200, 67 KB | top 100 by projected PPG with multi-year stat lines |
| `/projections/roster-grades?league_id=&user_id=` | no | 200 dynasty / **400 "League not synced"** redraft | per team: `power_rank`, `dynasty_rank`, contender + dynasty letter grades, total/starter value, projected PPG, positional value + avg age, `weakness` ("TE room needs attention") |
| `/league-history/{league}/managers`, `/manager/{user}`, `/records`, `/championships`, `/seasons` | no | 200 for **both** leagues | all-time W-L/PF per manager, champions by year, record book (highest week, biggest blowout, longest streaks, closest games) |
| `/league-history/{league}/h2h/{u1}/{u2}` | no | not tested (same family) | rivalry record + every meeting |
| `/picks` | no | 200 | early/mid/late value per round, next 4 classes |
| `/player-stats/{id}` | no | 200, 7 KB | current-season weekly box + fantasy points (std & PPR), EPA, career |
| `/player-page/{id}` | yes | 200, 54 KB | everything: snaps %, target share splits (RZ, deep, goal line), NGS, contract, combine, cliff risk, p10/p50/p90 outcome, recent real trades |
| `/player-page/{id}/weekly/{season}` | yes | 200 | weekly line, 1 KB |
| `/trade/calculate` (POST) | yes | 200 | both sides' value, differential, verdict, age-cliff warnings (100/hr) |
| `/stats-explorer?position=` | yes | 200, 133 KB | leaderboards with filters |
| `/projections/compare?ids=` | no | 400 even with 2 valid ids | broken or undocumented param |
| `/stats/leaderboard?stat=` | yes | 400 "Unknown stat" | needs a stat name the docs don't list |

Caveats: values are **dynasty** market values. They're still useful in redraft as a "trade value" signal but roster grades don't work there. Limits: 200/min keyless; 600/hr + 5,000/day with the key.

## PropLine (`https://api.prop-line.com/v1`, `X-API-Key`)

Sportsbook odds and props, 100+ books. Free tier gets **real prices on raw odds and props** (Pinnacle, DraftKings, FanDuel, Kalshi, Sleeper Picks and more for NFL week 9). The derived endpoints (`/projections`, `/ev`, `/best-line`, `/trends`, `/history`) come back with values nulled on free.

| Endpoint | Free? | Result |
|---|---|---|
| `/sports/football_nfl/events` | yes | 200, ESPN team ids + logos |
| `/sports/football_nfl/odds?markets=h2h,spreads,totals&bookmakers=draftkings` | yes | 200, 61 KB gzip / 1.2 MB raw (alt-line ladders inflate it) |
| `/sports/football_nfl/odds?markets=player_anytime_td,player_rush_yds,player_reception_yds,player_pass_yds,player_receptions&bookmakers=draftkings` | yes | 200, **146 KB gzip / 2.5 MB raw** for the whole slate. Without `bookmakers` it's 16 MB. |
| `/events/{id}/odds?markets=…` | yes | 200, 5 MB for one game across all books |
| `/events/{id}/markets` | yes | 40+ NFL prop markets (anytime/1st/2+ TD, yds, receptions, targets, longest, kicking) |
| `/events/{id}/projections` (market-implied median) | **redacted** | exactly the number we'd want; Hobby+ only |
| `/injuries?status=out,questionable` | yes | ESPN-sourced, 10-min refresh, `status_since`, `expected_return` |
| `/ids`, `/ids/lookup?espn_event_id=` | yes | PropLine ↔ ESPN event id crosswalk |
| `/players?search=`, `/players/{name}/games` | yes | `espn:` player ids, box-score game log (archive starts Apr 2026) |
| `/futures` | yes | MVP, Super Bowl, draft #1 pick, etc. |
| `/events/{id}/context` | – | 404 for an upcoming game |

Mapping: PropLine uses `espn:<id>` player ids. Sleeper's `espn_id` is filled for only 221 of 861 active skill players (null for Bijan and Chase), so join by **normalized name + team abbr** instead (PropLine strips "(DAL)" suffixes in its own grouping; we'd do the same).

## Recommendations

Ranked by value to the Fantasy tab vs. effort.

1. **Vegas line under each starter (PropLine, free).** In `PlayerCell`, show the sportsbook line for the player's main stat next to Sleeper's projection: "62.5 rush yds · 48% TD". Anytime-TD probability comes from de-vigging a two-way Yes/No pair (Pinnacle, Novig, ProphetX post both sides; DraftKings posts Yes only, so it would need a flat vig haircut). One slate-wide call per few hours, filtered to one or two books, covers every matchup. This is the most useful new number on the Matchup view and nothing else in the app has it.
2. **Player values and trends on rosters (RosterAudit, no key).** One `/rankings/values` call (25 KB) gives every rostered player a value; `/players/search` adds 7-day trend and buy-low / sell-high flags. Uses: a small ▲/▼ trend chip on lineup rows, "team value" on Standings, a value line in the player preview. Needs the attribution link.
3. **League history on Standings (RosterAudit, no key, works for both leagues).** An "All-time" segment: career W-L and PF per manager, champions by year, record book (highest week, biggest blowout, longest streak). On a matchup, a rivalry line from `/h2h` ("You lead 4-2 all-time"). Cheap, fun, and nothing else provides it.
4. **Power rankings + roster grades (RosterAudit, dynasty only).** On Oiled Down: power rank, contender/dynasty grade, projected PPG and the one-line `weakness` per team. Hide for redraft leagues (API returns "League not synced").
5. **Player page enrichment (RosterAudit, key).** For a fantasy player: snap % and target/RZ share by week, p10/p50/p90 outcome range, value history sparkline. Strong content, but it's 54 KB per player and the key's limit is 600/hr, so it belongs on the detail screen only.

Skip or later:
- **PropLine game lines on Scores.** ESPN's scoreboard already carries DraftKings spread/total/open/live (`Odds` in `lib/espn.ts`).
- **PropLine injuries.** Sleeper already supplies `injury_status` per player; ESPN news covers the rest. Its `status_since` / history is a nice-to-have.
- **Trade calculator.** Good feature, but a new screen and flow; revisit after the views above.
- **Market-implied projections, EV, trends.** Paid tier only.

## Architecture notes

As built: the app calls both APIs directly, with the keys bundled from `mobile/.env.local` (fine for a personal sideloaded app). The Worker below is the upgrade path if the keys should stay out of the IPA or the PropLine payload becomes a problem.

- PropLine needs a key and returns big payloads. Don't call it from the phone: put a small Cloudflare Worker (the `scores` Worker already exists) in front that fetches the slate per sport every ~30 min on Sundays and less often otherwise, trims to `{player, team, market, line, overProb}`, and caches in KV. That stays well under 1,000/day and sends the phone a few KB.
- RosterAudit's keyless endpoints are fine to call straight from the app with a `User-Agent` like `Scores/1.0` and React Query `staleTime` of hours (values snapshot daily). Keyed endpoints should go through the same Worker so the key isn't in the IPA.
- Prior art: `sleeper-fantasy-dashboard/src/lib/roster-audit/` already has zod schemas and endpoint wrappers; `docs/endpoints.md` there documents RosterAudit too.
