/* eslint-disable @typescript-eslint/no-explicit-any */
import clsx from 'clsx'
import { Link } from 'react-router'
import type { Game, LeagueId, Side } from '@/lib/espn'
import { headshot, teamLogo } from '@/lib/espn'
import { dateTime, monthDay, readable } from '@/lib/format'
import { Card, Headshot, Logo } from '../ui'

type Any = any

export function periodLabel(league: LeagueId, p: number) {
  if (p <= 4) return ['1st', '2nd', '3rd', '4th'][p - 1]
  return league === 'nba' ? (p === 5 ? 'OT' : `${p - 4}OT`) : 'OT'
}

/* ---------- line score ---------- */

export function LineScore({ game }: { game: Game }) {
  const n = Math.max(4, game.home.linescores.length, game.away.linescores.length)
  if (!game.home.linescores.length) return null
  const cols = Array.from({ length: n }, (_, i) => i + 1)
  const row = (s: Side) => (
    <tr>
      <td className="py-1.5 pr-3">
        <span className="flex items-center gap-2 font-medium">
          <Logo src={s.logo} alt="" size={20} />
          {s.abbr}
        </span>
      </td>
      {cols.map((c) => (
        <td key={c} className="py-1.5 text-center text-muted tnum">
          {s.linescores[c - 1] ?? '-'}
        </td>
      ))}
      <td className="py-1.5 text-center font-semibold tnum">{s.score}</td>
    </tr>
  )
  return (
    <Card>
      <table className="w-full px-4 text-[14px]">
        <thead>
          <tr className="text-[12px] text-faint">
            <th className="pt-3 pb-1 pl-4 text-left font-normal" />
            {cols.map((c) => (
              <th key={c} className="pt-3 pb-1 font-normal">
                {c <= 4 ? c : periodLabel(game.league, c)}
              </th>
            ))}
            <th className="pt-3 pr-4 pb-1 font-normal">T</th>
          </tr>
        </thead>
        <tbody className="[&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_tr:last-child_td]:pb-3">
          {row(game.away)}
          {row(game.home)}
        </tbody>
      </table>
    </Card>
  )
}

/* ---------- odds ---------- */

export function OddsCard({ game }: { game: Game }) {
  const o = game.odds
  if (!o) return null
  const rows = [
    { side: game.away, spread: o.awaySpread, spreadOdds: o.awaySpreadOdds, total: o.overUnder != null ? `o${o.overUnder}` : undefined, totalOdds: o.overOdds, ml: o.awayML },
    { side: game.home, spread: o.homeSpread, spreadOdds: o.homeSpreadOdds, total: o.overUnder != null ? `u${o.overUnder}` : undefined, totalOdds: o.underOdds, ml: o.homeML },
  ]
  return (
    <Card title="Odds" action={o.provider && <span className="text-xs text-faint">{o.provider}</span>}>
      <table className="w-full text-[14px]">
        <thead>
          <tr className="text-[12px] text-faint">
            <th className="pb-1 pl-4 text-left font-normal">Team</th>
            <th className="pb-1 font-normal">Spread</th>
            <th className="pb-1 font-normal">Total</th>
            <th className="pr-4 pb-1 font-normal">Moneyline</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.side.id} className="border-t border-line">
              <td className="py-2.5 pl-4">
                <span className="flex items-center gap-2 font-medium">
                  <Logo src={r.side.logo} alt="" size={20} />
                  {r.side.abbr}
                </span>
              </td>
              <td className="py-2 text-center tnum">
                {r.spread ?? '-'}
                {r.spreadOdds && <div className="text-[11px] text-faint">{r.spreadOdds}</div>}
              </td>
              <td className="py-2 text-center tnum">
                {r.total ?? '-'}
                {r.totalOdds && <div className="text-[11px] text-faint">{r.totalOdds}</div>}
              </td>
              <td className="py-2 pr-4 text-center tnum">{r.ml ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 pt-1 pb-3 text-[11px] text-faint">Lines may be closed or out of date.</p>
    </Card>
  )
}

/* ---------- matchup predictor ---------- */

export function Predictor({ raw, game }: { raw: Any; game: Game }) {
  const p = raw.predictor
  if (!p?.homeTeam?.gameProjection) return null
  const home = Number(p.homeTeam.gameProjection)
  const away = Number(p.awayTeam?.gameProjection ?? 100 - home)
  return (
    <Card title="Matchup predictor">
      <div className="px-4 pb-4">
        <div className="mb-2 flex justify-between font-score text-[28px] leading-none font-semibold tnum">
          <span>{away.toFixed(1)}%</span>
          <span>{home.toFixed(1)}%</span>
        </div>
        <div className="flex h-2 gap-1 overflow-hidden rounded-full">
          <div style={{ width: `${away}%`, background: readable(game.away.color) }} />
          <div style={{ width: `${home}%`, background: readable(game.home.color) }} />
        </div>
        <div className="mt-2 flex justify-between text-[12px] text-muted">
          <span>{game.away.abbr}</span>
          <span>{game.home.abbr}</span>
        </div>
        <p className="mt-3 text-[11px] text-faint">ESPN Analytics</p>
      </div>
    </Card>
  )
}

/* ---------- leaders ---------- */

export function Leaders({ raw, game, title }: { raw: Any; game: Game; title: string }) {
  const teams: Any[] = raw.leaders ?? []
  const away = teams.find((t) => String(t.team?.id) === game.away.id)
  const home = teams.find((t) => String(t.team?.id) === game.home.id)
  const cats: string[] = (away?.leaders ?? home?.leaders ?? []).filter((c: Any) => c.leaders?.length).map((c: Any) => c.name)
  if (!cats.length) return null
  const pick = (t: Any, name: string) => t?.leaders?.find((c: Any) => c.name === name)
  return (
    <Card title={title}>
      <div className="divide-y divide-line">
        {cats.slice(0, 5).map((name) => {
          const a = pick(away, name)
          const h = pick(home, name)
          return (
            <div key={name} className="px-4 py-3">
              <div className="mb-2 text-center text-[12px] text-faint">{(a ?? h)?.displayName}</div>
              <div className="flex items-start justify-between gap-3">
                <LeaderCell league={game.league} l={a?.leaders?.[0]} />
                <LeaderCell league={game.league} l={h?.leaders?.[0]} right />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function LeaderCell({ l, right, league }: { l: Any; right?: boolean; league: LeagueId }) {
  if (!l) return <div className="flex-1" />
  const a = l.athlete ?? {}
  return (
    <Link
      to={`/${league}/player/${a.id}`}
      className={clsx('flex min-w-0 flex-1 items-center gap-2.5', right && 'flex-row-reverse text-right')}
    >
      <Headshot src={headshot(league, a.id, 44)} alt={a.displayName} size={44} />
      <div className="min-w-0">
        <div className="font-score text-[24px] leading-none font-semibold tnum">{l.mainStat?.value ?? l.displayValue}</div>
        <div className="mt-1 truncate text-[13px] font-medium">{a.shortName ?? a.displayName}</div>
        <div className="truncate text-[11px] text-faint">{l.summary || l.displayValue}</div>
      </div>
    </Link>
  )
}

/* ---------- team stats comparison ---------- */

const num = (s: string) => {
  const m = String(s).match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : NaN
}

const LOWER_IS_BETTER = /turnover|penalt|sack|interception|fumble|foul|lost/i

export function TeamStatsCompare({ raw, game, limit }: { raw: Any; game: Game; limit?: number }) {
  const teams: Any[] = raw.boxscore?.teams ?? []
  const away = teams.find((t) => String(t.team?.id) === game.away.id)
  const home = teams.find((t) => String(t.team?.id) === game.home.id)
  if (!away?.statistics?.length || !home?.statistics?.length) return null
  const seen = new Set<string>()
  const stats = away.statistics
    .filter((s: Any) => {
      if (seen.has(s.label)) return false
      seen.add(s.label)
      return true
    })
    .map((s: Any) => ({ label: s.label as string, a: s.displayValue as string, h: (home.statistics.find((x: Any) => x.name === s.name)?.displayValue ?? '-') as string }))
    .filter((s: Any) => !/technical|flagrant|team turnovers/i.test(s.label))
  const ac = readable(game.away.color)
  const hc = readable(game.home.color)
  return (
    <Card title="Team stats">
      <div className="space-y-3.5 px-4 pb-4">
        {(limit ? stats.slice(0, limit) : stats).map((s: { label: string; a: string; h: string }) => {
          const a = num(s.a)
          const h = num(s.h)
          const ok = !Number.isNaN(a) && !Number.isNaN(h) && a + h > 0
          const share = ok ? a / (a + h) : 0.5
          const lower = LOWER_IS_BETTER.test(s.label)
          const aWins = ok && (lower ? a < h : a > h)
          const hWins = ok && (lower ? h < a : h > a)
          return (
            <div key={s.label}>
              <div className="mb-1.5 flex items-baseline justify-between text-[14px]">
                <span className={clsx('tnum', aWins ? 'font-semibold' : 'text-muted')}>{s.a}</span>
                <span className="text-[12px] text-muted">{s.label}</span>
                <span className={clsx('tnum', hWins ? 'font-semibold' : 'text-muted')}>{s.h}</span>
              </div>
              <div className="flex h-1.5 gap-1">
                <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-raised">
                  <div className="rounded-full" style={{ width: `${share * 100}%`, background: ac, opacity: aWins ? 1 : 0.45 }} />
                </div>
                <div className="flex-1 overflow-hidden rounded-full bg-raised">
                  <div className="h-full rounded-full" style={{ width: `${(1 - share) * 100}%`, background: hc, opacity: hWins ? 1 : 0.45 }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/* ---------- last five ---------- */

export function LastFive({ raw, game }: { raw: Any; game: Game }) {
  const teams: Any[] = raw.lastFiveGames ?? []
  if (!teams.length) return null
  return (
    <Card title="Last five games">
      <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
        {[game.away, game.home].map((side) => {
          const t = teams.find((x) => String(x.team?.id) === side.id)
          if (!t?.events?.length) return null
          return (
            <div key={side.id}>
              <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold">
                <Logo src={side.logo} alt="" size={18} />
                {side.displayName}
              </div>
              <table className="w-full text-[13px]">
                <tbody>
                  {t.events.map((e: Any) => (
                    <tr key={e.id} className="border-t border-line">
                      <td className="py-1.5 text-faint tnum">{monthDay(e.gameDate)}</td>
                      <td className="py-1.5">
                        <Link to={`/${game.league}/game/${e.id}`} className="flex items-center gap-1.5">
                          <span className="w-4 text-faint">{e.atVs}</span>
                          <Logo src={teamLogo(game.league, e.opponent?.abbreviation, 32)} alt="" size={16} />
                          {e.opponent?.abbreviation}
                        </Link>
                      </td>
                      <td className="py-1.5 text-right tnum">
                        <span className={e.gameResult === 'W' ? 'text-win' : e.gameResult === 'L' ? 'text-live' : 'text-muted'}>{e.gameResult}</span>{' '}
                        {e.score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/* ---------- season series ---------- */

export function SeasonSeries({ raw, game }: { raw: Any; game: Game }) {
  const s = (raw.seasonseries ?? [])[0]
  if (!s?.events?.length || s.events.length < 2) return null
  return (
    <Card title={s.title ?? 'Season series'} action={s.summary && <span className="text-xs text-muted">{s.summary}</span>}>
      <div className="divide-y divide-line">
        {s.events.map((e: Any) => {
          const away = e.competitors?.find((c: Any) => c.homeAway === 'away')
          const home = e.competitors?.find((c: Any) => c.homeAway === 'home')
          const done = e.statusType?.completed ?? e.status?.type?.completed
          const current = String(e.id) === game.id
          return (
            <Link
              key={e.id}
              to={`/${game.league}/game/${e.id}`}
              className={clsx('flex items-center justify-between px-4 py-2.5 text-[14px]', current && 'bg-raised/60')}
            >
              <span className="flex w-20 items-center gap-2">
                <Logo src={teamLogo(game.league, away?.team?.abbreviation, 32)} alt="" size={20} />
                {done || Number(away?.score) > 0 ? <span className="font-semibold tnum">{away?.score}</span> : away?.team?.abbreviation}
              </span>
              <span className="text-[12px] text-muted">{e.statusType?.shortDetail ?? e.status?.type?.shortDetail ?? ''}</span>
              <span className="flex w-20 items-center justify-end gap-2">
                {done || Number(home?.score) > 0 ? <span className="font-semibold tnum">{home?.score}</span> : home?.team?.abbreviation}
                <Logo src={teamLogo(game.league, home?.team?.abbreviation, 32)} alt="" size={20} />
              </span>
            </Link>
          )
        })}
      </div>
    </Card>
  )
}

/* ---------- injuries ---------- */

export function Injuries({ raw, game }: { raw: Any; game: Game }) {
  const teams: Any[] = (raw.injuries ?? []).filter((t: Any) => t.injuries?.length)
  if (!teams.length) return null
  return (
    <Card title="Injury report">
      <div className="space-y-4 px-4 pb-4">
        {[game.away, game.home].map((side) => {
          const t = teams.find((x) => String(x.team?.id) === side.id)
          if (!t) return null
          return (
            <div key={side.id}>
              <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold">
                <Logo src={side.logo} alt="" size={18} />
                {side.displayName}
              </div>
              <ul className="divide-y divide-line">
                {t.injuries.map((i: Any) => (
                  <li key={i.athlete?.id + i.status}>
                    <Link to={`/${game.league}/player/${i.athlete?.id}`} className="flex items-center gap-3 py-2">
                      <Headshot src={headshot(game.league, i.athlete?.id, 32)} alt="" size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-medium">
                          {i.athlete?.displayName} <span className="text-[12px] font-normal text-faint">{i.athlete?.position?.abbreviation}</span>
                        </div>
                        <div className="truncate text-[12px] text-muted">{[i.details?.type, i.details?.detail].filter(Boolean).join(' · ') || i.type?.description}</div>
                      </div>
                      <div className="text-right">
                        <div className={clsx('text-[13px] font-medium', /out|injured reserve/i.test(i.status) ? 'text-live' : 'text-warn')}>{i.status}</div>
                        {i.details?.returnDate && <div className="text-[11px] text-faint">Est. {monthDay(i.details.returnDate)}</div>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/* ---------- game info ---------- */

export function GameInfo({ raw, game }: { raw: Any; game: Game }) {
  const gi = raw.gameInfo ?? {}
  const v = gi.venue
  const where = [v?.address?.city, v?.address?.state].filter(Boolean).join(', ')
  const officials = (gi.officials ?? []).map((o: Any) => o.displayName).filter(Boolean)
  const items = [
    ['Date', dateTime(game.date)],
    ['Venue', v?.fullName ? `${v.fullName}${where ? `, ${where}` : ''}` : undefined],
    ['TV', game.broadcast],
    ['Weather', gi.weather ? `${gi.weather.temperature ?? ''}° ${gi.weather.displayValue ?? ''}`.trim() : undefined],
    ['Attendance', gi.attendance ? Number(gi.attendance).toLocaleString() : undefined],
    ['Officials', officials.length ? officials.join(', ') : undefined],
  ].filter(([, val]) => val)
  return (
    <Card title="Game info">
      <dl className="divide-y divide-line px-4 pb-2 text-[14px]">
        {items.map(([k, val]) => (
          <div key={k} className="flex gap-4 py-2.5">
            <dt className="w-24 shrink-0 text-muted">{k}</dt>
            <dd>{val}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

/* ---------- NFL scoring summary ---------- */

export function ScoringSummary({ raw, game }: { raw: Any; game: Game }) {
  const plays: Any[] = raw.scoringPlays ?? []
  if (!plays.length) return null
  return (
    <Card title="Scoring summary">
      <ul className="divide-y divide-line">
        {plays.map((p) => (
          <li key={p.id} className="flex items-start gap-3 px-4 py-3">
            <Logo src={teamLogo(game.league, p.team?.abbreviation, 48)} alt={p.team?.abbreviation ?? ''} size={24} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold">{p.type?.text}</div>
              <div className="text-[13px] text-muted">{p.text}</div>
              <div className="mt-0.5 text-[11px] text-faint">
                {periodLabel(game.league, p.period?.number)} · {p.clock?.displayValue}
              </div>
            </div>
            <div className="text-[13px] font-semibold tnum">
              {p.awayScore}-{p.homeScore}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
