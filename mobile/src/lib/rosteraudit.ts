// RosterAudit's dynasty data, keyed by Sleeper player id. Docs: https://rosteraudit.com/developers/
// Terms: show "Values by RosterAudit.com" with a link wherever these numbers appear (`RosterAuditCredit`).
// Values, history and grades are keyless; the player page needs the free key in EXPO_PUBLIC_ROSTERAUDIT_KEY.

type Any = any

const API = 'https://rosteraudit.com/wp-json/ra/v1'
export const RA_KEY = process.env.EXPO_PUBLIC_ROSTERAUDIT_KEY
export const RA_URL = 'https://rosteraudit.com'

async function get<T = Any>(path: string, keyed = false): Promise<T> {
  // Their firewall blocks default user agents.
  const headers: Record<string, string> = { 'User-Agent': 'Scores/1.0 (personal iOS app)' }
  if (keyed && RA_KEY) headers['X-RA-Key'] = RA_KEY
  const res = await fetch(`${API}${path}`, { headers })
  if (!res.ok) throw new Error(`RosterAudit returned ${res.status} for ${path.split('?')[0]}`)
  return res.json()
}

const num = (v: unknown) => (v == null || v === '' ? undefined : Number(v))
const flag = (v: unknown) => v === true || v === '1' || v === 1

/** Superflex when a league starts two QBs or has a superflex slot. */
export const isSuperflex = (rosterPositions: string[]) => rosterPositions.includes('SUPER_FLEX') || rosterPositions.filter((p) => p === 'QB').length > 1

/* ---------- values ---------- */

export interface PlayerValue {
  value: number
  rankOverall: number
  rankPos: number
  tier?: number
  trend7d: number
  trend30d: number
  buyLow: boolean
  sellHigh: boolean
  breakout: boolean
}

/** Every ranked player's value and trend in one format (5 pages of 100, refreshed daily on their side). */
export async function getValues(format: 'sf' | '1qb'): Promise<Map<string, PlayerValue>> {
  const first = await get(`/rankings?format=${format}&per_page=100&page=1`)
  const rest = await Promise.all(Array.from({ length: Math.max(0, (first.total_pages ?? 1) - 1) }, (_, i) => get(`/rankings?format=${format}&per_page=100&page=${i + 2}`)))
  const out = new Map<string, PlayerValue>()
  for (const page of [first, ...rest])
    for (const p of page.players ?? [])
      out.set(String(p.sleeper_id), {
        value: Number(p.value) || 0,
        rankOverall: Number(p.rank_overall) || 0,
        rankPos: Number(p.rank_pos) || 0,
        tier: num(p.tier),
        trend7d: Number(p.trend_7d) || 0,
        trend30d: Number(p.trend_30d) || 0,
        buyLow: flag(p.buy_low),
        sellHigh: flag(p.sell_high),
        breakout: flag(p.breakout),
      })
  return out
}

/* ---------- league history ---------- */

export interface HistoryManager {
  userId: string
  name: string
  avatar?: string
  seasons: number
  wins: number
  losses: number
  ties: number
  winPct: number
  pointsFor: number
  titles: number
  playoffs: number
}

export async function getHistoryManagers(league: string): Promise<HistoryManager[]> {
  const d = await get(`/league-history/${league}/managers`)
  return (d.managers ?? []).map((m: Any) => ({
    userId: String(m.user_id),
    name: m.display_name,
    avatar: m.avatar ? `https://sleepercdn.com/avatars/thumbs/${m.avatar}` : undefined,
    seasons: Number(m.seasons_played) || 0,
    wins: Number(m.total_wins) || 0,
    losses: Number(m.total_losses) || 0,
    ties: Number(m.total_ties) || 0,
    winPct: Number(m.win_pct) || 0,
    pointsFor: Number(m.total_pf) || 0,
    titles: Number(m.championships) || 0,
    playoffs: Number(m.playoff_appearances) || 0,
  }))
}

export interface Championship {
  season: string
  champion: string
  runnerUp?: string
}

export async function getChampionships(league: string): Promise<Championship[]> {
  const d = await get(`/league-history/${league}/championships`)
  return (d.championships ?? []).map((c: Any) => ({ season: String(c.season), champion: c.champion_name, runnerUp: c.runner_up_name ?? undefined }))
}

export interface LeagueRecord {
  label: string
  holder: string
  value: string
  when?: string
}

const when = (r: Any) => [r.season, r.round_label].filter(Boolean).join(' ')

/** The league's record book, flattened to label / holder / value rows. */
export async function getRecords(league: string): Promise<LeagueRecord[]> {
  const r = (await get(`/league-history/${league}/records`)).records ?? {}
  const out: (LeagueRecord | undefined)[] = [
    r.highest_week_score && { label: 'Highest week', holder: r.highest_week_score.name, value: Number(r.highest_week_score.score).toFixed(2), when: when(r.highest_week_score) },
    r.lowest_week_score && { label: 'Lowest week', holder: r.lowest_week_score.name, value: Number(r.lowest_week_score.score).toFixed(2), when: when(r.lowest_week_score) },
    r.biggest_blowout && { label: 'Biggest blowout', holder: r.biggest_blowout.name, value: `+${Number(r.biggest_blowout.margin).toFixed(2)}`, when: when(r.biggest_blowout) },
    r.closest_games?.[0] && { label: 'Closest game', holder: r.closest_games[0].winner_name, value: `+${Number(r.closest_games[0].margin).toFixed(2)}`, when: when(r.closest_games[0]) },
    r.highest_season_pf && { label: 'Most points, season', holder: r.highest_season_pf.name, value: Number(r.highest_season_pf.value).toFixed(1), when: r.highest_season_pf.season },
    r.best_season_record && { label: 'Best record', holder: r.best_season_record.name, value: r.best_season_record.record, when: r.best_season_record.season },
    r.longest_win_streak && { label: 'Longest win streak', holder: r.longest_win_streak.name, value: String(r.longest_win_streak.value) },
    r.longest_loss_streak && { label: 'Longest losing streak', holder: r.longest_loss_streak.name, value: String(r.longest_loss_streak.value) },
    r.most_playoff_wins && { label: 'Most playoff wins', holder: r.most_playoff_wins.name, value: String(r.most_playoff_wins.value) },
  ]
  return out.filter((x): x is LeagueRecord => !!x && !!x.holder)
}

export interface HeadToHeadRecord {
  games: number
  wins: number
  losses: number
  draws: number
  /** Most recent meeting first. */
  meetings: { season: number; label: string; score: number; oppScore: number; won: boolean }[]
}

/** All-time series between two managers, from `me`'s side. */
export async function getHeadToHead(league: string, me: string, them: string): Promise<HeadToHeadRecord> {
  const d = await get(`/league-history/${league}/h2h/${me}/${them}`)
  const flip = String(d.user_id_1) !== me
  return {
    games: Number(d.total_matchups) || 0,
    wins: Number(flip ? d.wins_2 : d.wins_1) || 0,
    losses: Number(flip ? d.wins_1 : d.wins_2) || 0,
    draws: Number(d.draws) || 0,
    meetings: (d.matchups ?? [])
      .map((m: Any) => ({ season: Number(m.season), label: m.round_label, score: Number(flip ? m.score_2 : m.score_1), oppScore: Number(flip ? m.score_1 : m.score_2), won: String(m.winner) === me }))
      .reverse(),
  }
}

/* ---------- power rankings (dynasty leagues only) ---------- */

export interface RosterGrade {
  rosterId: number
  ownerId: string
  powerRank: number
  dynastyRank: number
  contender: string
  dynasty: string
  totalValue: number
  projectedPpg: number
  weakness?: string
}

/** Throws "League not synced" for redraft leagues; callers hide the view on error. */
export async function getRosterGrades(league: string, userId: string): Promise<RosterGrade[]> {
  const d = await get(`/projections/roster-grades?league_id=${league}&user_id=${userId}`)
  return (d.teams ?? []).map((t: Any) => ({
    rosterId: Number(t.roster_id),
    ownerId: String(t.owner_id),
    powerRank: Number(t.power_rank),
    dynastyRank: Number(t.dynasty_rank),
    contender: t.contender_grade,
    dynasty: t.dynasty_grade,
    totalValue: Number(t.total_value) || 0,
    projectedPpg: Number(t.projected_ppg) || 0,
    weakness: t.weakness || undefined,
  }))
}

/* ---------- player page (key) ---------- */

export interface RaPlayerPage {
  photo?: string
  age?: number
  value: { sf: number; oneQb: number; tierLabel?: string; rankSf?: number; rank1qb?: number; rankPosSf?: number; rankPos1qb?: number; trend7d: number; trend30d: number; trend90d: number; buyLow: boolean; sellHigh: boolean; breakout: boolean }
  history: { date: string; sf: number; oneQb: number }[]
  outlook?: string
  outlook1qb?: string
  ppgPpr?: number
  ppgHalf?: number
  ppgStd?: number
  /** Value and positional finish at the 10th / 50th / 90th percentile outcome. */
  outcome?: { p10: Outcome; p50: Outcome; p90: Outcome; breakoutPct?: number; bustPct?: number }
  years: { year: number; sf: number; oneQb?: number; confidence: string }[]
  weekly: { week: number; opp?: string; snapPct?: number; targets?: number; carries?: number; rzTouches?: number; airYards?: number }[]
  cliff?: { level: string; summary?: string }
}

interface Outcome {
  finish?: string
  value: number
}

const outcome = (x: Any): Outcome => ({ finish: x?.finish || undefined, value: Number(x?.value) || 0 })

export async function getRaPlayerPage(id: string): Promise<RaPlayerPage> {
  const d = await get(`/player-page/${id}`, true)
  const v = d.value ?? {}
  const snaps = new Map<number, Any>((d.snaps_weekly ?? []).map((s: Any) => [Number(s.week), s]))
  const pbp: Any[] = d.pbp_weekly ?? []
  const weeks = [...new Set([...snaps.keys(), ...pbp.map((p) => Number(p.week))])].sort((a, b) => b - a)
  const oneQbYears = new Map<number, number>((d.projection_1qb ?? []).map((y: Any) => [Number(y.year), Number(y.value)]))
  const o = d.projection_outcome
  return {
    photo: d.player?.photo_url,
    age: num(d.player?.age),
    value: {
      sf: Number(v.sf) || 0,
      oneQb: Number(v.one_qb) || 0,
      tierLabel: v.tier_label || undefined,
      rankSf: num(v.rank_sf),
      rank1qb: num(v.rank_1qb),
      rankPosSf: num(v.rank_pos_sf),
      rankPos1qb: num(v.rank_pos_1qb),
      trend7d: Number(v.trend_7d) || 0,
      trend30d: Number(v.trend_30d) || 0,
      trend90d: Number(v.trend_90d) || 0,
      buyLow: flag(v.buy_low),
      sellHigh: flag(v.sell_high),
      breakout: flag(v.breakout),
    },
    history: (d.value_history ?? []).map((h: Any) => ({ date: h.date, sf: Number(h.sf) || 0, oneQb: Number(h.one_qb) || 0 })),
    outlook: d.projection_summary || undefined,
    outlook1qb: d.projection_1qb_summary || undefined,
    ppgPpr: num(d.projection_ppg_ppr),
    ppgHalf: num(d.projection_ppg),
    ppgStd: num(d.projection_ppg_std),
    outcome: o?.p50 ? { p10: outcome(o.p10), p50: outcome(o.p50), p90: outcome(o.p90), breakoutPct: num(o.breakout_pct), bustPct: num(o.bust_pct) } : undefined,
    years: (d.projection ?? []).map((y: Any) => ({ year: Number(y.year), sf: Number(y.value), oneQb: oneQbYears.get(Number(y.year)), confidence: y.confidence })),
    weekly: weeks.map((w) => {
      const s = snaps.get(w)
      const p = pbp.find((x) => Number(x.week) === w)
      return {
        week: w,
        opp: s?.opp,
        snapPct: s?.off_pct != null ? Math.round(Number(s.off_pct) * 100) : undefined,
        targets: num(p?.targets),
        carries: num(p?.carries),
        rzTouches: p ? (Number(p.targets_rz) || 0) + (Number(p.carries_rz) || 0) : undefined,
        airYards: num(p?.total_air_yards),
      }
    }),
    cliff: d.cliff_risk?.risk_level ? { level: d.cliff_risk.risk_level, summary: d.cliff_risk.recommendation?.summary || undefined } : undefined,
  }
}
