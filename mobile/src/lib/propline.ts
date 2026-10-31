// Pregame player prop lines from PropLine (https://prop-line.com/docs), free tier: 1,000 requests a day.
// One request covers the whole NFL slate for the books we show (~230 KB gzipped), refetched at most every 30 minutes.

type Any = any

const API = 'https://api.prop-line.com/v1'
export const PROPLINE_KEY = process.env.EXPO_PUBLIC_PROPLINE_KEY

export const BOOKS = [
  { key: 'draftkings', short: 'DK', name: 'DraftKings' },
  { key: 'underdog', short: 'UD', name: 'Underdog' },
  { key: 'prizepicks', short: 'PP', name: 'PrizePicks' },
] as const
export type BookKey = (typeof BOOKS)[number]['key']

export const STATS = [
  { key: 'pass', market: 'player_pass_yds', label: 'Pass yds' },
  { key: 'rush', market: 'player_rush_yds', label: 'Rush yds' },
  { key: 'rec', market: 'player_reception_yds', label: 'Rec yds' },
] as const
export type StatKey = (typeof STATS)[number]['key']

export interface PlayerLines {
  /** ESPN team ids of the game, to tell apart two players with the same name. */
  teams: string[]
  yards: Partial<Record<StatKey, Partial<Record<BookKey, number>>>>
  /** Anytime TD price in American odds; PrizePicks posts no price, so it never has one. */
  td: Partial<Record<BookKey, number>>
}

/** "D.J. Moore", "DJ Moore" and "Kenneth Walker III" → "dj moore", "dj moore", "kenneth walker". */
export const normName = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s*\([a-z]{2,4}\)\s*$/, '')
    .replace(/[.'’]/g, '')
    .replace(/-/g, ' ')
    .replace(/\s+(jr|sr|ii|iii|iv|v)$/, '')
    .replace(/\s+/g, ' ')
    .trim()

const MARKET_STAT = new Map<string, StatKey>(STATS.map((s) => [s.market, s.key]))

/** The book's main line among its Over/Under pairs: PrizePicks' standard line, otherwise the one priced closest to even. */
function mainLine(book: string, outcomes: Any[]): number | undefined {
  const overs = outcomes.filter((o) => o.name === 'Over' && o.point != null && (book !== 'prizepicks' || o.dfs_odds_type === 'standard'))
  let best: { point: number; gap: number } | undefined
  for (const o of overs) {
    const under = outcomes.find((u) => u.name === 'Under' && u.point === o.point && u.description === o.description)
    if (!under) continue
    const gap = Math.abs(Number(o.price) - Number(under.price))
    if (!best || gap < best.gap) best = { point: Number(o.point), gap }
  }
  return best?.point
}

export async function getSlateLines(): Promise<Map<string, PlayerLines[]>> {
  const q = new URLSearchParams({ markets: [...STATS.map((s) => s.market), 'player_anytime_td'].join(','), bookmakers: BOOKS.map((b) => b.key).join(',') })
  const res = await fetch(`${API}/sports/football_nfl/odds?${q}`, { headers: { 'X-API-Key': PROPLINE_KEY ?? '' } })
  if (!res.ok) throw new Error(`PropLine returned ${res.status}`)
  const events: Any[] = await res.json()
  const out = new Map<string, PlayerLines[]>()
  for (const e of events) {
    if (e.live) continue
    const teams = [e.home_team_id, e.away_team_id].filter(Boolean).map((t: string) => t.split(':').pop()!)
    const byPlayer = new Map<string, PlayerLines>()
    const entry = (name: string) => {
      const k = normName(name)
      let p = byPlayer.get(k)
      if (!p) byPlayer.set(k, (p = { teams, yards: {}, td: {} }))
      return p
    }
    for (const b of e.bookmakers ?? []) {
      const book = b.key as BookKey
      for (const m of b.markets ?? []) {
        if (m.period && m.period !== 'full_game') continue
        const players = new Map<string, Any[]>()
        for (const o of m.outcomes ?? []) if (o.description) players.set(o.description, [...(players.get(o.description) ?? []), o])
        for (const [name, os] of players) {
          const stat = MARKET_STAT.get(m.key)
          if (stat) {
            const line = mainLine(book, os)
            if (line == null) continue
            const p = entry(name)
            const y = (p.yards[stat] ??= {})
            // A book can list several O/U markets for one player; keep the first main one.
            if (y[book] == null) y[book] = line
          } else if (m.key === 'player_anytime_td' && book !== 'prizepicks') {
            // DraftKings lists "Yes" prices under the player's name; Underdog uses Over 0.5.
            const yes = os.find((o) => o.name === name || o.name === 'Yes' || (o.name === 'Over' && Number(o.point) === 0.5))
            if (yes?.price != null) entry(name).td[book] ??= Number(yes.price)
          }
        }
      }
    }
    for (const [k, p] of byPlayer) out.set(k, [...(out.get(k) ?? []), p])
  }
  return out
}

/** A player's lines, matched by name and, when the name is shared, by the ESPN ids of the player's game. */
export function linesFor(slate: Map<string, PlayerLines[]> | undefined, name: string | undefined, gameTeamIds: string[] = []) {
  if (!slate || !name) return undefined
  const all = slate.get(normName(name))
  if (!all?.length) return undefined
  return all.find((p) => p.teams.some((t) => gameTeamIds.includes(t))) ?? (all.length === 1 ? all[0] : undefined)
}

/** The yardage stat that matters for a position. */
export const statFor = (position?: string): StatKey | undefined => (position === 'QB' ? 'pass' : position === 'RB' ? 'rush' : position === 'WR' || position === 'TE' ? 'rec' : undefined)

export const american = (n: number) => (n > 0 ? `+${n}` : `${n}`.replace('-', '−'))
