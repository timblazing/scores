// Thin client over ESPN's public (unofficial) JSON endpoints.
// Endpoint reference: https://github.com/pseudo-r/Public-ESPN-API
// All of these send `Access-Control-Allow-Origin: *`, so the app calls them directly.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any

export type LeagueId = 'nfl' | 'nba'

export const LEAGUES: Record<LeagueId, { id: LeagueId; sport: string; name: string; periodName: string }> = {
  nfl: { id: 'nfl', sport: 'football', name: 'NFL', periodName: 'Quarter' },
  nba: { id: 'nba', sport: 'basketball', name: 'NBA', periodName: 'Quarter' },
}

export const LEAGUE_IDS: LeagueId[] = ['nfl', 'nba']

const SITE = 'https://site.api.espn.com/apis/site/v2/sports'
const SITE_V2 = 'https://site.api.espn.com/apis/v2/sports'
const COMMON = 'https://site.web.api.espn.com/apis/common/v3/sports'

async function get<T = Any>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`ESPN returned ${res.status} for ${new URL(url).pathname}`)
  return res.json()
}

const base = (l: LeagueId) => `${SITE}/${LEAGUES[l].sport}/${l}`

/* ---------- images ---------- */

export function img(path: string | undefined, w: number, h = w) {
  if (!path) return undefined
  const p = path.replace(/^https?:\/\/a\.espncdn\.com/, '')
  if (p.startsWith('http')) return path
  return `https://a.espncdn.com/combiner/i?img=${p}&w=${w}&h=${h}`
}

export function teamLogo(league: LeagueId, abbr: string | undefined, size = 80) {
  if (!abbr) return undefined
  return img(`/i/teamlogos/${league}/500-dark/${abbr.toLowerCase()}.png`, size)
}

export function headshot(league: LeagueId, athleteId: string | undefined, size = 96) {
  if (!athleteId) return undefined
  return img(`/i/headshots/${league}/players/full/${athleteId}.png`, Math.round(size * 1.375), size)
}

/* ---------- normalized game ---------- */

export type GameState = 'pre' | 'in' | 'post'

export interface Side {
  id: string
  abbr: string
  name: string
  displayName: string
  logo?: string
  color: string
  altColor: string
  score?: string
  record?: string
  winner?: boolean
  linescores: string[]
}

export interface Odds {
  provider?: string
  details?: string
  overUnder?: number
  homeSpread?: string
  awaySpread?: string
  homeSpreadOdds?: string
  awaySpreadOdds?: string
  homeML?: string
  awayML?: string
  overOdds?: string
  underOdds?: string
}

export interface Situation {
  downDistance?: string
  possessionId?: string
  isRedZone?: boolean
  lastPlay?: string
}

export interface Game {
  id: string
  league: LeagueId
  date: string
  state: GameState
  detail: string
  shortDetail: string
  period: number
  clock: string
  home: Side
  away: Side
  broadcast?: string
  odds?: Odds
  situation?: Situation
  venue?: string
  note?: string
  timeTBD?: boolean
}

const fmtML = (v: unknown) => {
  if (v == null || v === '') return undefined
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n > 0 ? `+${n}` : String(n)
}

export function parseOdds(o: Any): Odds | undefined {
  if (!o) return undefined
  const ps = o.pointSpread
  const tot = o.total
  const ml = o.moneyline
  const odds: Odds = {
    provider: o.provider?.name,
    details: o.details,
    overUnder: o.overUnder,
    homeSpread: ps?.home?.close?.line,
    awaySpread: ps?.away?.close?.line,
    homeSpreadOdds: ps?.home?.close?.odds,
    awaySpreadOdds: ps?.away?.close?.odds,
    homeML: ml?.home?.close?.odds ?? fmtML(o.homeTeamOdds?.moneyLine),
    awayML: ml?.away?.close?.odds ?? fmtML(o.awayTeamOdds?.moneyLine),
    overOdds: tot?.over?.close?.odds,
    underOdds: tot?.under?.close?.odds,
  }
  if (!odds.details && !odds.overUnder && !odds.homeML) return undefined
  return odds
}

function parseSide(c: Any, league: LeagueId): Side {
  const t = c.team ?? {}
  const rec = Array.isArray(c.records) ? c.records : Array.isArray(c.record) ? c.record : []
  const total = rec.find((r: Any) => r.type === 'total' || r.name === 'overall') ?? rec[0]
  return {
    id: String(t.id ?? c.id),
    abbr: t.abbreviation ?? '',
    name: t.shortDisplayName ?? t.name ?? t.displayName ?? '',
    displayName: t.displayName ?? '',
    logo: teamLogo(league, t.abbreviation),
    color: t.color ? `#${t.color}` : '#333333',
    altColor: t.alternateColor ? `#${t.alternateColor}` : '#666666',
    score: c.score?.displayValue ?? (typeof c.score === 'string' ? c.score : undefined),
    record: total?.summary ?? total?.displayValue,
    winner: c.winner,
    linescores: (c.linescores ?? []).map((l: Any) => String(l.displayValue ?? l.value ?? '')),
  }
}

export function parseEvent(e: Any, league: LeagueId): Game {
  const comp = e.competitions?.[0] ?? {}
  const status = comp.status ?? e.status ?? {}
  const type = status.type ?? {}
  const cs = comp.competitors ?? []
  const home = cs.find((c: Any) => c.homeAway === 'home') ?? cs[0]
  const away = cs.find((c: Any) => c.homeAway === 'away') ?? cs[1]
  const bc =
    comp.broadcast ||
    (comp.broadcasts ?? []).flatMap((b: Any) => b.names ?? (b.media?.shortName ? [b.media.shortName] : [])).join(', ')
  const sit = comp.situation
  return {
    id: String(e.id),
    league,
    date: e.date ?? comp.date,
    state: (type.state ?? 'pre') as GameState,
    detail: type.detail ?? type.description ?? '',
    shortDetail: type.shortDetail ?? type.detail ?? '',
    period: status.period ?? 0,
    clock: status.displayClock ?? '',
    home: parseSide(home, league),
    away: parseSide(away, league),
    broadcast: bc || undefined,
    odds: parseOdds(comp.odds?.[0]),
    situation: sit
      ? {
          downDistance: sit.shortDownDistanceText ?? sit.downDistanceText,
          possessionId: sit.possession ? String(sit.possession) : undefined,
          isRedZone: sit.isRedZone,
          lastPlay: sit.lastPlay?.text,
        }
      : undefined,
    venue: comp.venue?.fullName,
    note: comp.notes?.[0]?.headline ?? comp.series?.summary,
    timeTBD: comp.timeValid === false,
  }
}

/* ---------- scoreboard ---------- */

export interface CalendarWeek {
  seasonType: string
  seasonTypeLabel: string
  week: string
  label: string
  detail: string
  start: string
  end: string
}

export interface Scoreboard {
  games: Game[]
  week?: number
  seasonType?: number
  year?: number
  weeks?: CalendarWeek[]
  days?: string[]
}

export async function getScoreboard(
  league: LeagueId,
  q: { date?: string; week?: string; seasonType?: string; year?: number } = {},
): Promise<Scoreboard> {
  const p = new URLSearchParams({ limit: '100' })
  if (q.date) p.set('dates', q.date)
  if (q.week) {
    p.set('week', q.week)
    if (q.seasonType) p.set('seasontype', q.seasonType)
    if (q.year) p.set('dates', String(q.year))
  }
  const d = await get(`${base(league)}/scoreboard?${p}`)
  const cal = d.leagues?.[0]?.calendar ?? []
  const weeks: CalendarWeek[] | undefined =
    d.leagues?.[0]?.calendarType === 'list'
      ? cal.flatMap((t: Any) =>
          (t.entries ?? []).map((w: Any) => ({
            seasonType: String(t.value),
            seasonTypeLabel: t.label,
            week: String(w.value),
            label: w.label,
            detail: w.detail,
            start: w.startDate,
            end: w.endDate,
          })),
        )
      : undefined
  return {
    games: (d.events ?? []).map((e: Any) => parseEvent(e, league)),
    week: d.week?.number,
    seasonType: d.season?.type,
    year: d.season?.year,
    weeks,
    days: d.leagues?.[0]?.calendarType === 'day' ? cal : undefined,
  }
}

/* ---------- game summary ---------- */

export interface Summary {
  game: Game
  raw: Any
}

export async function getSummary(league: LeagueId, id: string): Promise<Summary> {
  const d = await get(`${base(league)}/summary?event=${id}`)
  const h = d.header ?? {}
  const game = parseEvent({ ...h, id: h.id ?? id, competitions: h.competitions }, league)
  // Header lacks odds; pull from pickcenter.
  game.odds = parseOdds(d.pickcenter?.[0]) ?? game.odds
  if (!game.venue) game.venue = d.gameInfo?.venue?.fullName
  const sit = d.situation
  if (sit && game.state === 'in')
    game.situation = {
      downDistance: sit.shortDownDistanceText ?? sit.downDistanceText,
      possessionId: sit.possession ? String(sit.possession) : undefined,
      isRedZone: sit.isRedZone,
      lastPlay: sit.lastPlay?.text,
    }
  return { game, raw: d }
}

/* ---------- standings ---------- */

export interface StandingRow {
  team: { id: string; abbr: string; name: string; displayName: string; logo?: string }
  stats: Record<string, string>
  note?: string
}

export interface StandingGroup {
  name: string
  short: string
  groups: { name: string; rows: StandingRow[] }[]
}

function parseEntries(entries: Any[], league: LeagueId): StandingRow[] {
  return entries.map((e: Any) => {
    const stats: Record<string, string> = {}
    for (const s of e.stats ?? []) {
      const k = s.name ?? s.type
      if (k) stats[k] = s.displayValue ?? s.summary ?? String(s.value ?? '')
    }
    return {
      team: {
        id: String(e.team.id),
        abbr: e.team.abbreviation,
        name: e.team.shortDisplayName ?? e.team.name,
        displayName: e.team.displayName,
        logo: teamLogo(league, e.team.abbreviation, 48),
      },
      stats,
      note: e.note?.description,
    }
  })
}

const sortRows = (rows: StandingRow[]) =>
  rows.sort((a, b) => {
    const seed = Number(a.stats.playoffSeed ?? 99) - Number(b.stats.playoffSeed ?? 99)
    if (seed) return seed
    return Number(b.stats.winPercent ?? 0) - Number(a.stats.winPercent ?? 0)
  })

export async function getStandings(league: LeagueId): Promise<StandingGroup[]> {
  const path = league === 'nfl' ? 'standings?level=3' : 'standings'
  const d = await get(`${SITE_V2}/${LEAGUES[league].sport}/${league}/${path}`)
  return (d.children ?? []).map((conf: Any) => ({
    name: conf.name,
    short: conf.abbreviation ?? conf.name,
    groups: conf.children?.length
      ? conf.children.map((div: Any) => ({ name: div.name, rows: sortRows(parseEntries(div.standings?.entries ?? [], league)) }))
      : [{ name: conf.name, rows: sortRows(parseEntries(conf.standings?.entries ?? [], league)) }],
  }))
}

/* ---------- teams ---------- */

export interface TeamLite {
  id: string
  league: LeagueId
  abbr: string
  name: string
  displayName: string
  logo?: string
}

// Note: `/teams` and `/teams/{id}` don't send CORS headers, so team data comes
// from standings (list) and the schedule endpoint (detail), which do.
export async function getTeams(league: LeagueId): Promise<TeamLite[]> {
  const confs = await getStandings(league)
  return confs
    .flatMap((c) => c.groups.flatMap((g) => g.rows))
    .map((r) => ({
      id: r.team.id,
      league,
      abbr: r.team.abbr,
      name: r.team.name,
      displayName: r.team.displayName,
      logo: teamLogo(league, r.team.abbr, 64),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}

export interface TeamSchedule {
  team: { id: string; abbr: string; location: string; name: string; displayName: string; color: string; record?: string; standing?: string }
  season?: string
  games: Game[]
}

export async function getTeamSchedule(league: LeagueId, id: string, seasonType?: string): Promise<TeamSchedule> {
  const d = await get(`${base(league)}/teams/${id}/schedule${seasonType ? `?seasontype=${seasonType}` : ''}`)
  const t = d.team ?? {}
  return {
    team: {
      id: String(t.id ?? id),
      abbr: t.abbreviation,
      location: t.location,
      name: t.name,
      displayName: t.displayName,
      color: t.color ? `#${t.color}` : '#333333',
      record: t.recordSummary,
      standing: t.standingSummary,
    },
    season: d.requestedSeason?.displayName ?? d.season?.displayName,
    games: (d.events ?? []).map((e: Any) => parseEvent(e, league)),
  }
}

export const getRoster = (league: LeagueId, id: string) => get(`${base(league)}/teams/${id}/roster`)

/* ---------- news ---------- */

export interface Article {
  id: string
  headline: string
  description?: string
  published: string
  image?: string
  url?: string
  teams: string[]
}

export async function getNews(league: LeagueId, teamId?: string, limit = 25): Promise<Article[]> {
  const p = new URLSearchParams({ limit: String(limit) })
  if (teamId) p.set('team', teamId)
  const d = await get(`${base(league)}/news?${p}`)
  return (d.articles ?? [])
    .filter((a: Any) => a.headline)
    .map((a: Any) => ({
      id: String(a.dataSourceIdentifier ?? a.id ?? a.headline),
      headline: a.headline,
      description: a.description,
      published: a.published,
      image: a.images?.[0]?.url,
      url: a.links?.web?.href,
      teams: (a.categories ?? []).filter((c: Any) => c.type === 'team').map((c: Any) => c.description),
    }))
}

/* ---------- athletes ---------- */

export const getAthlete = (league: LeagueId, id: string) =>
  get(`${COMMON}/${LEAGUES[league].sport}/${league}/athletes/${id}`).then((d) => d.athlete)

export const getAthleteOverview = (league: LeagueId, id: string) =>
  get(`${COMMON}/${LEAGUES[league].sport}/${league}/athletes/${id}/overview`)

export const getAthleteGamelog = (league: LeagueId, id: string) =>
  get(`${COMMON}/${LEAGUES[league].sport}/${league}/athletes/${id}/gamelog`)
