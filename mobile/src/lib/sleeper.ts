// Thin client over Sleeper's public API for the Fantasy tab.
// Docs: https://docs.sleeper.com — projections come from the undocumented api.sleeper.com feed,
// the same one the sleeper-fantasy-dashboard repo uses.

type Any = any

const API = 'https://api.sleeper.app/v1'
const API2 = 'https://api.sleeper.com'

/** This app is just for one Sleeper account, so the user and leagues are fixed. */
export const SLEEPER_USER_ID = '1028415641872699392' // timblazing
export const FANTASY_LEAGUES = [
  { id: '1389391504413310976', name: 'Slim Pickens Memorial League', short: 'Slim Pickens' },
  { id: '1388584098439639040', name: 'Oiled Down', short: 'Oiled Down' },
] as const
export type FantasyLeagueId = (typeof FANTASY_LEAGUES)[number]['id']
export const isFantasyLeague = (v: unknown): v is FantasyLeagueId => FANTASY_LEAGUES.some((l) => l.id === v)

async function get<T = Any>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Sleeper returned ${res.status} for ${new URL(url).pathname}`)
  return res.json()
}

/* ---------- types ---------- */

export interface NflState {
  week: number
  season: string
  seasonType: string
}

export interface FantasyLeague {
  id: string
  name: string
  season: string
  status: string
  rosterPositions: string[]
  scoring: Record<string, number>
  playoffWeekStart: number
  divisions: Record<number, string>
}

export interface FantasyTeam {
  rosterId: number
  ownerId: string | null
  name: string
  manager: string
  avatar?: string
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  division?: number
  streak?: string
}

export interface FantasyMatchup {
  rosterId: number
  matchupId: number | null
  points: number
  starters: string[]
  startersPoints: number[]
  players: string[]
  playersPoints: Record<string, number>
}

export interface FantasyPlayer {
  id: string
  name: string
  position: string
  team: string | null
  injury?: string | null
}

/* ---------- images ---------- */

export const avatarUrl = (id?: string | null) => (!id ? undefined : id.startsWith('http') ? id : `https://sleepercdn.com/avatars/thumbs/${id}`)

export const isDefense = (id: string) => /^[A-Z]{2,4}$/.test(id)

/* ---------- requests ---------- */

export async function getNflState(): Promise<NflState> {
  const s = await get(`${API}/state/nfl`)
  return { week: Number(s.week) || 1, season: String(s.season), seasonType: String(s.season_type) }
}

export async function getFantasyLeague(id: string): Promise<FantasyLeague> {
  const l = await get(`${API}/league/${id}`)
  const divisions: Record<number, string> = {}
  for (let i = 1; i <= (l.settings?.divisions ?? 0); i++) divisions[i] = l.metadata?.[`division_${i}`] ?? `Division ${i}`
  return {
    id: l.league_id,
    name: l.name,
    season: l.season,
    status: l.status,
    rosterPositions: l.roster_positions ?? [],
    scoring: l.scoring_settings ?? {},
    playoffWeekStart: l.settings?.playoff_week_start || 15,
    divisions,
  }
}

const pts = (whole?: number, decimal?: number) => (whole ?? 0) + (decimal ?? 0) / 100

/** League rosters joined with their managers. */
export async function getFantasyTeams(id: string): Promise<FantasyTeam[]> {
  const [rosters, users] = await Promise.all([get<Any[]>(`${API}/league/${id}/rosters`), get<Any[]>(`${API}/league/${id}/users`)])
  const byId = new Map(users.map((u) => [u.user_id, u]))
  return rosters.map((r) => {
    const u = byId.get(r.owner_id)
    const s = r.settings ?? {}
    return {
      rosterId: r.roster_id,
      ownerId: r.owner_id ?? null,
      name: u?.metadata?.team_name || u?.display_name || `Team ${r.roster_id}`,
      manager: u?.display_name ?? '',
      avatar: avatarUrl(u?.metadata?.avatar || u?.avatar),
      wins: s.wins ?? 0,
      losses: s.losses ?? 0,
      ties: s.ties ?? 0,
      pointsFor: pts(s.fpts, s.fpts_decimal),
      pointsAgainst: pts(s.fpts_against, s.fpts_against_decimal),
      division: s.division || undefined,
      streak: r.metadata?.streak,
    }
  })
}

export async function getFantasyMatchups(id: string, week: number): Promise<FantasyMatchup[]> {
  const ms = await get<Any[]>(`${API}/league/${id}/matchups/${week}`)
  return ms.map((m) => ({
    rosterId: m.roster_id,
    matchupId: m.matchup_id ?? null,
    points: m.custom_points ?? m.points ?? 0,
    starters: m.starters ?? [],
    startersPoints: m.starters_points ?? [],
    players: m.players ?? [],
    playersPoints: m.players_points ?? {},
  }))
}

export interface WeekProjections {
  stats: Map<string, Record<string, number>>
  players: Map<string, FantasyPlayer>
}

const toPlayer = (id: string, p: Any): FantasyPlayer => ({
  id,
  name: isDefense(id) ? `${p?.last_name ?? id} D/ST` : [p?.first_name, p?.last_name].filter(Boolean).join(' ') || id,
  position: p?.position ?? p?.fantasy_positions?.[0] ?? '',
  team: p?.team ?? (isDefense(id) ? id : null),
  injury: p?.injury_status,
})

/** One week of Sleeper projections (~2MB). Each row carries basic player info, which saves a lookup per player. */
export async function getWeekProjections(season: string, week: number): Promise<WeekProjections> {
  const p = new URLSearchParams({ season_type: 'regular' })
  for (const pos of ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']) p.append('position[]', pos)
  const rows = await get<Any[]>(`${API2}/projections/nfl/${season}/${week}?${p}`)
  const stats = new Map<string, Record<string, number>>()
  const players = new Map<string, FantasyPlayer>()
  for (const r of rows) {
    if (r.stats) stats.set(r.player_id, r.stats)
    if (r.player) players.set(r.player_id, toPlayer(r.player_id, r.player))
  }
  return { stats, players }
}

/** Single player lookup, for anyone missing from the week's projections (bye weeks, injured reserve). */
export const getFantasyPlayer = async (id: string) => toPlayer(id, await get(`${API2}/players/nfl/${id}`))

/* ---------- scoring ---------- */

export function projectPoints(stats: Record<string, number> | undefined, scoring: Record<string, number>) {
  if (!stats) return undefined
  const total = Object.entries(scoring).reduce((sum, [k, mult]) => sum + (stats[k] ?? 0) * mult, 0)
  return Number.isFinite(total) ? Math.max(0, total) : undefined
}

const SLOT_LABELS: Record<string, string> = { SUPER_FLEX: 'SF', REC_FLEX: 'W/T', WRRB_FLEX: 'W/R', IDP_FLEX: 'IDP', FLEX: 'FLX' }
export const slotLabel = (slot: string) => SLOT_LABELS[slot] ?? slot

/** Lineup slots that count toward the score (everything but bench, taxi and IR). */
export const starterSlots = (league: FantasyLeague) => league.rosterPositions.filter((p) => !['BN', 'TAXI', 'IR'].includes(p))

export const fmtPts = (n: number | undefined) => (n == null ? '–' : n.toFixed(2))
export const record = (t: FantasyTeam) => `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`
