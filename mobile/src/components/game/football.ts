// Football play-by-play helpers: field positions, the live drive, play titles and the players named in a play.
// Field positions are yards from the away team's goal line (0) to the home team's (100), so the away
// team always attacks to the right, the way ESPN draws its field.
import type { Game, Side } from '@/lib/espn'

type Any = any

export const isFootball = (game: Game) => game.league !== 'nba'

/** "ARIZ 47" → 47, "TTU 28" → 72, "50" → 50. Falls back to ESPN's yardLine (yards from the home goal line). */
export function spotX(text: string | undefined, game: Game, yardLine?: number): number | undefined {
  const m = text?.trim().match(/^([A-Z&.' ]+?)\s*(\d{1,2})$/i)
  if (m) {
    const n = Number(m[2])
    const abbr = m[1].trim().toUpperCase()
    if (!abbr || n === 50) return 50
    if (abbr === game.away.abbr.toUpperCase()) return n
    if (abbr === game.home.abbr.toUpperCase()) return 100 - n
  }
  if (text?.trim() === '50') return 50
  return typeof yardLine === 'number' && yardLine >= 0 && yardLine <= 100 ? 100 - yardLine : undefined
}

export type PlayKind = 'pass' | 'run' | 'kick' | 'other'

export function playKind(p: Any): PlayKind {
  const t = String(p.type?.text ?? '')
  if (/kickoff|punt|field goal|extra point/i.test(t)) return 'kick'
  if (/pass|interception|sack/i.test(t)) return 'pass'
  if (/rush/i.test(t)) return 'run'
  return 'other'
}

/** Short ESPN-style headline for a play: "12-yd Pass", "Incompletion", "Touchdown". */
export function playTitle(p: Any): string {
  const t = String(p.type?.text ?? '')
  const y = Number(p.statYardage ?? 0)
  if (/touchdown/i.test(t)) return 'Touchdown'
  if (/field goal good/i.test(t)) return 'Field Goal'
  if (/field goal|missed fg/i.test(t)) return 'Missed FG'
  if (/two.?point/i.test(t)) return '2-pt Conversion'
  if (/extra point/i.test(t)) return 'Extra Point'
  if (/incompletion/i.test(t)) return 'Incompletion'
  if (/interception/i.test(t)) return 'Interception'
  if (/sack/i.test(t)) return y ? `${Math.abs(y)}-yd Sack` : 'Sack'
  if (/fumble/i.test(t)) return 'Fumble'
  if (/penalty/i.test(t)) return y ? `${Math.abs(y)}-yd Penalty` : 'Penalty'
  if (/pass reception|^pass$/i.test(t)) return y > 0 ? `${y}-yd Pass` : y < 0 ? `${-y}-yd Loss` : 'No Gain'
  if (/rush/i.test(t)) return y > 0 ? `${y}-yd Run` : y < 0 ? `${-y}-yd Loss` : 'No Gain'
  if (/kickoff/i.test(t)) return 'Kickoff'
  if (/punt/i.test(t)) return 'Punt'
  if (/end period/i.test(t)) return 'End of Quarter'
  if (/end of half/i.test(t)) return 'Halftime'
  return t || 'Play'
}

/** Big moments for the Key Plays filter. */
export function isKeyPlay(p: Any) {
  const t = String(p.type?.text ?? '')
  if (p.scoringPlay || p.isTurnover) return true
  if (/interception|fumble|blocked|safety|sack/i.test(t)) return true
  if (/penalty/i.test(t)) return false
  if (/kickoff|punt/i.test(t)) return /return|touchdown/i.test(String(p.text)) && Math.abs(Number(p.statYardage ?? 0)) >= 30
  return Math.abs(Number(p.statYardage ?? 0)) >= 20 || (p.start?.down === 4 && /rush|pass/i.test(t))
}

export interface Drive {
  id: string
  teamId?: string
  description?: string
  title: string
  period: number
  plays: Any[]
  current: boolean
  isScore?: boolean
}

/** All drives in order, the live one (if any) last. */
export function allDrives(raw: Any, game: Game): Drive[] {
  const prev: Any[] = raw.drives?.previous ?? []
  const cur = raw.drives?.current
  const list = cur && !prev.some((d) => d.id === cur.id) ? [...prev, cur] : prev
  return list.map((d) => {
    const current = game.state === 'in' && cur?.id === d.id && !d.result
    return {
      id: String(d.id),
      teamId: d.team?.id ? String(d.team.id) : undefined,
      description: d.description,
      title: current ? 'Current Drive' : (d.displayResult ?? d.result ?? 'Drive'),
      period: d.start?.period?.number ?? d.plays?.[0]?.period?.number ?? 0,
      plays: d.plays ?? [],
      current,
      isScore: d.isScore,
    }
  })
}

export const sideById = (game: Game, id?: string): Side | undefined => (id === game.home.id ? game.home : id === game.away.id ? game.away : undefined)

export interface LiveDrive {
  team?: Side
  /** +1 when the team with the ball attacks to the right (away), −1 for the home team. */
  dir: 1 | -1
  description?: string
  down?: string
  spot?: string
  downDistance?: string
  ball?: number
  firstDown?: number
  start?: number
  plays: Any[]
  last?: Any
}

/** Where the ball is now, from the live drive's last play (ESPN's football summary has no top-level situation). */
export function liveDrive(raw: Any, game: Game): LiveDrive | undefined {
  if (game.state !== 'in' || !isFootball(game)) return undefined
  const cur = raw.drives?.current
  const plays: Any[] = cur?.plays ?? []
  const last = plays[plays.length - 1]
  const possId = game.situation?.possessionId ?? (cur?.team?.id ? String(cur.team.id) : undefined)
  const team = sideById(game, possId)
  if (!team || !last) return team ? { team, dir: team === game.away ? 1 : -1, plays } : undefined
  const dir = team === game.away ? 1 : -1
  const end = last.end ?? {}
  const sameTeam = !end.team?.id || String(end.team.id) === team.id
  const ball = spotX(end.possessionText, game, end.yardLine)
  const down = sameTeam && end.down > 0 ? end.shortDownDistanceText : undefined
  const goal = /goal/i.test(down ?? '')
  const fd = ball != null && down && !goal && end.distance > 0 ? ball + dir * end.distance : undefined
  const sameDrive = String(cur?.team?.id) === team.id
  return {
    team,
    dir,
    description: sameDrive ? cur?.description : undefined,
    down,
    spot: end.possessionText,
    downDistance: sameTeam ? end.downDistanceText : undefined,
    ball,
    firstDown: fd != null && fd > 0 && fd < 100 ? fd : undefined,
    start: sameDrive ? spotX(cur?.start?.text, game, cur?.start?.yardLine) : undefined,
    plays: sameDrive ? plays : [],
    last,
  }
}

/** Win probability after a play, as the leading team and its percentage. */
export function winAfter(raw: Any, game: Game, playId?: string): { side: Side; pct: number } | undefined {
  const wp: Any[] = raw.winprobability ?? []
  const w = (playId && wp.find((x) => String(x.playId) === playId)) || wp[wp.length - 1]
  if (!w) return undefined
  const home = Number(w.homeWinPercentage)
  return home >= 0.5 ? { side: game.home, pct: home * 100 } : { side: game.away, pct: (1 - home) * 100 }
}

/* ---------- players named in a play ---------- */

export interface PlayPlayer {
  id: string
  name: string
  side: Side
  position?: string
  line?: string
}

const SUMMARY: Record<string, [string, string][]> = {
  passing: [['C/ATT', ''], ['YDS', 'YDS'], ['TD', 'TD'], ['INT', 'INT']],
  rushing: [['CAR', 'CAR'], ['YDS', 'YDS'], ['TD', 'TD']],
  receiving: [['REC', 'REC'], ['YDS', 'YDS'], ['TD', 'TD']],
  kicking: [['FG', 'FG'], ['XP', 'XP']],
  punting: [['NO', 'PUNTS'], ['AVG', 'AVG']],
  defensive: [['TOT', 'TCKL'], ['SACKS', 'SACK']],
  interceptions: [['INT', 'INT'], ['YDS', 'YDS']],
  kickReturns: [['NO', 'KR'], ['YDS', 'YDS']],
  puntReturns: [['NO', 'PR'], ['YDS', 'YDS']],
}

const ORDER: Record<PlayKind, string[]> = {
  pass: ['passing', 'receiving', 'rushing', 'interceptions', 'defensive'],
  run: ['rushing', 'receiving', 'passing', 'defensive'],
  kick: ['kicking', 'punting', 'kickReturns', 'puntReturns'],
  other: ['passing', 'rushing', 'receiving', 'defensive', 'kicking'],
}

const nameKey = (first: string, last: string) => `${first.charAt(0)}${last}`.toLowerCase().replace(/[^a-z]/g, '')

/** One stat line, e.g. "6 REC, 167 YDS, 1 TD". */
function statLine(group: string, labels: string[], stats: string[]) {
  const parts = (SUMMARY[group] ?? [])
    .map(([l, suffix]) => {
      const v = stats[labels.indexOf(l)]
      if (v == null || (l === 'INT' && group === 'passing' && Number(v) === 0)) return undefined
      return suffix ? `${v} ${suffix}` : v
    })
    .filter(Boolean)
  return parts.length ? parts.join(', ') : undefined
}

/** Match "#1 N.Fifita" / "T.McKee" in the play text to box score athletes. */
export function playPlayers(raw: Any, game: Game, play: Any, positions: Map<string, string>): PlayPlayer[] {
  const text = String(play?.text ?? '').replace(/\([^)]*\)/g, ' ').replace(/\.\s+(?=[A-Z])/g, '.')
  type Ath = { id: string; name: string; key: string; jersey?: string; side: Side; groups: Map<string, string | undefined> }
  const athletes = new Map<string, Ath>()
  for (const t of raw.boxscore?.players ?? []) {
    const side = sideById(game, String(t.team?.id))
    if (!side) continue
    for (const g of t.statistics ?? []) {
      for (const a of g.athletes ?? []) {
        const id = String(a.athlete?.id)
        const ath = a.athlete ?? {}
        let entry = athletes.get(id)
        if (!entry) {
          const [first = '', ...rest] = String(ath.displayName ?? '').split(' ')
          entry = { id, name: ath.displayName, key: nameKey(ath.firstName ?? first, ath.lastName ?? rest.join(' ')), jersey: ath.jersey, side, groups: new Map() }
          athletes.set(id, entry)
        }
        entry.groups.set(g.name, statLine(g.name, g.labels ?? [], a.stats ?? []))
      }
    }
  }
  const leaderPos = new Map<string, string>()
  for (const t of raw.leaders ?? []) for (const c of t.leaders ?? []) for (const l of c.leaders ?? []) if (l.athlete?.position?.abbreviation) leaderPos.set(String(l.athlete.id), l.athlete.position.abbreviation)

  const offense = String(play?.teamParticipants?.find((p: Any) => p.type === 'offense')?.id ?? play?.team?.id ?? '')
  const order = ORDER[playKind(play)]
  const found: PlayPlayer[] = []
  const re = /(?:#(\d+)\s+)?\b([A-Z])\.([A-Z][A-Za-z'’-]+(?:-[A-Z][A-Za-z'’]+)?)/g
  for (const m of text.matchAll(re)) {
    const key = nameKey(m[2], m[3])
    const cands = [...athletes.values()].filter((a) => a.key === key)
    const pick = cands.find((a) => m[1] && a.jersey === m[1]) ?? cands.find((a) => a.side.id === offense) ?? cands[0]
    if (!pick || found.some((f) => f.id === pick.id)) continue
    const group = order.find((g) => pick.groups.get(g)) ?? [...pick.groups.keys()].find((g) => pick.groups.get(g))
    found.push({
      id: pick.id,
      name: pick.name,
      side: pick.side,
      position: positions.get(pick.id) ?? leaderPos.get(pick.id) ?? (pick.groups.has('passing') ? 'QB' : undefined),
      line: group ? pick.groups.get(group) : undefined,
    })
    if (found.length === 3) break
  }
  return found
}

/** Position abbreviations from a team roster response. */
export function rosterPositions(roster: Any, into: Map<string, string>) {
  for (const g of roster?.athletes ?? []) {
    for (const a of g.items ?? (g.id ? [g] : [])) if (a?.id && a.position?.abbreviation) into.set(String(a.id), a.position.abbreviation)
  }
  return into
}
