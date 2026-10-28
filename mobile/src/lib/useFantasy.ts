import { useQueries, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getScoreboard, type Game } from './espn'
import {
  getFantasyLeague,
  getFantasyMatchups,
  getFantasyPlayer,
  getFantasyTeams,
  getNflState,
  getWeekProjections,
  projectPoints,
  type FantasyLeague,
  type FantasyMatchup,
  type FantasyPlayer,
  type FantasyTeam,
} from './sleeper'

export const useNflState = () => useQuery({ queryKey: ['sleeper', 'state'], queryFn: getNflState, staleTime: 5 * 60_000 })
export const useFantasyLeague = (id: string) => useQuery({ queryKey: ['sleeper', 'league', id], queryFn: () => getFantasyLeague(id), staleTime: 60 * 60_000 })
export const useFantasyTeams = (id: string) => useQuery({ queryKey: ['sleeper', 'teams', id], queryFn: () => getFantasyTeams(id), staleTime: 60_000 })

/** ESPN's NFL games for a regular-season week, keyed by team abbreviation (Sleeper's spelling). */
export function useNflWeekGames(season: string | undefined, week: number) {
  const q = useQuery({
    queryKey: ['sb', 'nfl', String(week), '2', Number(season)],
    queryFn: () => getScoreboard('nfl', { week: String(week), seasonType: '2', year: Number(season) }),
    enabled: !!season,
    refetchInterval: (query) => (query.state.data?.games.some((g) => g.state === 'in') ? 15_000 : 5 * 60_000),
  })
  const byTeam = useMemo(() => {
    const m = new Map<string, Game>()
    for (const g of q.data?.games ?? []) {
      m.set(fromEspn(g.home.abbr), g)
      m.set(fromEspn(g.away.abbr), g)
    }
    return m
  }, [q.data])
  return { byTeam, live: !!q.data?.games.some((g) => g.state === 'in') }
}

const fromEspn = (abbr: string) => (abbr === 'WSH' ? 'WAS' : abbr)

export function useFantasyMatchups(id: string, week: number, live: boolean) {
  return useQuery({ queryKey: ['sleeper', 'matchups', id, week], queryFn: () => getFantasyMatchups(id, week), refetchInterval: live ? 15_000 : 5 * 60_000 })
}

export function useProjections(season: string | undefined, week: number) {
  return useQuery({ queryKey: ['sleeper', 'proj', season, week], queryFn: () => getWeekProjections(season!, week), enabled: !!season, staleTime: 30 * 60_000, retry: 0 })
}

/** Player info for the given ids: from the week's projections when present, otherwise looked up one by one. */
export function useFantasyPlayers(ids: string[], known: Map<string, FantasyPlayer> | undefined, ready: boolean) {
  const missing = ready ? ids.filter((id) => id !== '0' && !known?.has(id)) : []
  const results = useQueries({ queries: missing.map((id) => ({ queryKey: ['sleeper', 'player', id], queryFn: () => getFantasyPlayer(id), staleTime: 12 * 60 * 60_000 })) })
  const map = new Map(known)
  missing.forEach((id, i) => {
    const p = results[i]?.data
    if (p) map.set(id, p)
  })
  return map
}

/** Share of an NFL game still to play, from ESPN's period and clock. */
function remaining(game: Game | undefined) {
  if (!game || game.state === 'pre') return 1
  if (game.state === 'post' || game.period > 4) return 0
  const [m, s] = game.clock.split(':').map(Number)
  const clock = (m || 0) * 60 + (s || 0)
  return Math.min(1, Math.max(0, ((4 - game.period) * 900 + clock) / 3600))
}

export interface Slot {
  id: string
  points: number
  projection?: number
  /** Points banked plus the projected share of what's left of the game. */
  live?: number
  game?: Game
}

/** Scores each player in a matchup and projects the team total for the week. */
export function scoreMatchup(m: FantasyMatchup, league: FantasyLeague, proj: Map<string, Record<string, number>> | undefined, team: (abbr: string | null | undefined) => Game | undefined, players: Map<string, FantasyPlayer>) {
  const slot = (id: string): Slot => {
    const points = m.playersPoints[id] ?? 0
    const projection = projectPoints(proj?.get(id), league.scoring)
    const game = team(players.get(id)?.team)
    const live = projection == null ? undefined : points + projection * remaining(game)
    return { id, points, projection, live, game }
  }
  const starters = m.starters.map(slot)
  const bench = m.players.filter((id) => !m.starters.includes(id)).map(slot)
  const projected = proj ? starters.reduce((sum, s) => sum + (s.id === '0' ? 0 : (s.live ?? s.points)), 0) : undefined
  // Requires some game info, so the week doesn't read as final while ESPN is still loading.
  const done = starters.some((s) => s.game) && starters.every((s) => s.id === '0' || !s.game || s.game.state === 'post')
  return { starters, bench, projected, done }
}

export const teamFor = (teams: FantasyTeam[] | undefined, rosterId: number) => teams?.find((t) => t.rosterId === rosterId)
