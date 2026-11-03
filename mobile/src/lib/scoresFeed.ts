import type { Game, LeagueId } from './espn'
import type { Favorite } from './favorites'
import { ymd } from './format'

const key = (g: Game) => `${g.league}:${g.id}`
const day = (g: Game) => ymd(new Date(g.date))
const priority = { in: 0, pre: 1, post: 2 }
const byState = (a: Game, b: Game) => priority[a.state] - priority[b.state] || a.date.localeCompare(b.date)
const matches = (g: Game, t: Favorite) => g.league === t.league && (g.home.id === t.id || g.away.id === t.id)

/** Scoreboards override schedule copies so live scores always win. */
export function buildScoresFeed(board: Game[], schedules: Game[], teams: Favorite[], leagues: LeagueId[], today: string) {
  const all = new Map(schedules.map((g) => [key(g), g]))
  for (const g of board) all.set(key(g), g)
  const games = [...all.values()]
  const followed = new Map<string, Game>()
  const unscheduled: Favorite[] = []
  for (const team of teams) {
    const teamGames = games.filter((g) => matches(g, team))
    const current = teamGames.filter((g) => g.state === 'in' || day(g) === today)
    for (const g of current) followed.set(key(g), g)
    // Retain today's result, with the next matchup ready below it.
    if (!current.some((g) => g.state === 'in' || g.state === 'pre')) {
      const next = teamGames.filter((g) => g.state === 'pre' && day(g) >= today).sort(byState)[0]
      if (next) followed.set(key(next), next)
      else unscheduled.push(team)
    }
  }
  const following = [...followed.values()].sort(byState)
  const groups = leagues.map((league) => {
    const eligible = games.filter((g) => g.league === league)
    const current = eligible.filter((g) => g.state === 'in' || day(g) === today)
    const nextDay = eligible.filter((g) => g.state === 'pre' && day(g) > today).sort(byState)[0]
    const slate = current.some((g) => g.state !== 'post') || !nextDay
      ? current
      : [...current, ...eligible.filter((g) => g.state === 'pre' && day(g) === day(nextDay))]
    return { league, games: slate.sort(byState) }
  }).filter((g) => g.games.length).sort((a, b) => {
    const aLive = a.games.some((g) => g.state === 'in')
    const bLive = b.games.some((g) => g.state === 'in')
    return Number(bLive) - Number(aLive) || byState(a.games[0], b.games[0])
  })
  return { following, groups, unscheduled }
}
