import { Image } from 'expo-image'
import { Link } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { createContext, useContext } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Card, Divider, Muted, Text } from './ui'
import type { Game } from '@/lib/espn'
import { RA_URL, type HeadToHeadRecord, type PlayerValue } from '@/lib/rosteraudit'
import { isDefense, record, slotLabel, starterSlots, type FantasyLeague, type FantasyMatchup, type FantasyPlayer, type FantasyTeam } from '@/lib/sleeper'
import { scoreMatchup, type Slot } from '@/lib/useFantasy'
import { card, colors, positions } from '@/theme'

export function Avatar({ src, size = 40 }: { src?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.raised, overflow: 'hidden' }}>
      {src ? <Image source={src} style={{ width: size, height: size }} cachePolicy="memory-disk" /> : null}
    </View>
  )
}

/** Normal CDF of the projected margin; a rough estimate with 28% team variance, as in sleeper-fantasy-dashboard. */
function winProbability(a: number, b: number) {
  const sd = Math.max(12, 0.28 * Math.hypot(a, b))
  const x = (a - b) / sd / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * Math.abs(x))
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)
  const p = (1 + Math.sign(x) * erf) / 2
  return Math.round(Math.min(0.99, Math.max(0.01, p)) * 100)
}

const shortName = (p?: FantasyPlayer) => {
  if (!p) return ''
  if (p.position === 'DEF') return p.name
  const [first, ...rest] = p.name.split(' ')
  return rest.length ? `${first[0]}. ${rest.join(' ')}` : first
}

/** "Sun 1p", "Mon 8:15p": short enough to sit beside the opponent in a narrow lineup cell. */
function kickoff(iso: string) {
  const d = new Date(iso)
  const h = d.getHours() % 12 || 12
  const m = d.getMinutes()
  return `${d.toLocaleDateString(undefined, { weekday: 'short' })} ${h}${m ? `:${String(m).padStart(2, '0')}` : ''}${d.getHours() < 12 ? 'a' : 'p'}`
}

function gameInfo(team: string | null | undefined, game?: Game): { text: string; live?: boolean } {
  if (!team) return { text: '' }
  if (!game) return { text: 'BYE' }
  const home = game.home.abbr === team || (team === 'WAS' && game.home.abbr === 'WSH')
  const opp = home ? `vs ${game.away.abbr}` : `@${game.home.abbr}`
  if (game.state === 'pre') return { text: `${opp} ${kickoff(game.date)}` }
  if (game.state === 'in') return { text: `${opp} ${game.shortDetail.replace(/ - /, ' ')}`, live: true }
  const us = home ? game.home : game.away
  const them = home ? game.away : game.home
  const result = Number(us.score) > Number(them.score) ? 'W' : Number(us.score) < Number(them.score) ? 'L' : 'T'
  return { text: `${opp} ${result} ${us.score}-${them.score}` }
}

/** Extra data for lineup rows: RosterAudit values. May be missing; rows then show less. */
interface LineupExtras {
  league?: string
  values?: Map<string, PlayerValue>
}
const Extras = createContext<LineupExtras>({})
export const LineupExtrasProvider = Extras.Provider

export const BOOK_COLORS: Record<string, string> = { draftkings: '#61b510', underdog: '#f5c518', prizepicks: '#a77bff' }
/** Week-over-week value moves smaller than this aren't worth an arrow. */
const TREND_MIN = 150

const photoUrl = (id: string, p?: FantasyPlayer) =>
  p?.position === 'DEF' || isDefense(id) ? `https://sleepercdn.com/images/team_logos/nfl/${id.toLowerCase()}.png` : `https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`

function PlayerPhoto({ id, player, size = 30 }: { id: string; player?: FantasyPlayer; size?: number }) {
  const def = player?.position === 'DEF' || isDefense(id)
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: def ? 'transparent' : colors.raised, overflow: 'hidden' }}>
      <Image source={photoUrl(id, player)} style={{ width: size, height: size }} contentFit={def ? 'contain' : 'cover'} contentPosition="top" cachePolicy="memory-disk" recyclingKey={id} />
    </View>
  )
}

/** Slot marker between the two players, colored by position like the Sleeper dashboard; flex and bench slots are outlined. */
function PositionBadge({ label }: { label: string }) {
  const tone = positions[label]
  return (
    <View style={{ minWidth: 34, paddingHorizontal: 4, paddingVertical: 3, borderRadius: 6, alignItems: 'center', backgroundColor: tone?.bg, borderWidth: tone ? 0 : 1, borderColor: colors.lineStrong }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: tone?.fg ?? colors.muted }}>{label}</Text>
    </View>
  )
}

const hasStarted = (slot: Slot) => (!!slot.game && slot.game.state !== 'pre') || slot.points > 0
/** Points for a slot once its game has started, otherwise null. */
const scored = (slot?: Slot) => (slot && slot.id !== '0' && hasStarted(slot) ? slot.points : null)

const cellStyle = { flex: 1, minHeight: 46, borderRadius: 10, borderCurve: 'continuous' as const, backgroundColor: 'rgba(255,255,255,0.045)', paddingHorizontal: 7, paddingVertical: 6, justifyContent: 'center' as const, gap: 3 }

/** One side of a lineup row: photo, name, the player's game, and points over projection. Tapping opens the player. */
function PlayerCell({ slot, player, align, label, trailing }: { slot?: Slot; player?: FantasyPlayer; align: 'left' | 'right'; label: string; trailing?: boolean }) {
  const { league, values } = useContext(Extras)
  const right = align === 'right'
  if (!slot || slot.id === '0')
    return (
      <View style={[cellStyle, { alignItems: right ? 'flex-end' : 'flex-start' }]}>
        <Muted style={{ fontSize: 13, color: colors.faint }}>Empty</Muted>
      </View>
    )
  const info = gameInfo(player?.team, slot.game)
  const injury = player?.injury ? player.injury.slice(0, 1) === 'Q' ? 'Q' : player.injury.slice(0, 3).toUpperCase() : null
  const trend = values?.get(slot.id)?.trend7d ?? 0
  const started = hasStarted(slot)
  return (
    <Link href={`/fplayer/${slot.id}?league=${league ?? ''}` as never} asChild>
      <Pressable style={cellStyle}>
        <View style={{ flexDirection: right ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
          <PlayerPhoto id={slot.id} player={player} size={28} />
          <View style={{ flex: 1, alignItems: right ? 'flex-end' : 'flex-start' }}>
            <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600' }}>
              {shortName(player)}
              {injury ? <Text style={{ fontSize: 10, color: colors.live }}> {injury}</Text> : null}
              {Math.abs(trend) >= TREND_MIN ? <Text style={{ fontSize: 9, color: trend > 0 ? colors.win : colors.live }}> {trend > 0 ? '▲' : '▼'}</Text> : null}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 11, color: info.live ? colors.live : colors.faint }}>
              {/* The slot label already names the position, except in flex and bench slots. */}
              {[player?.position !== label && player?.position, info.text].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <View style={{ alignItems: right ? 'flex-start' : 'flex-end' }}>
            <Text tnum style={{ fontSize: 14, fontWeight: trailing ? '400' : '700', color: trailing ? colors.muted : started ? colors.fg : colors.faint }}>
              {started ? slot.points.toFixed(1) : '–'}
            </Text>
            <Text tnum style={{ fontSize: 11, color: colors.faint }}>{slot.projection != null ? slot.projection.toFixed(1) : '–'}</Text>
          </View>
        </View>
      </Pressable>
    </Link>
  )
}
/** Legend under the starters: what the arrows mean, and the RosterAudit credit their terms ask for. */
function LineupLegend({ trends }: { trends: boolean }) {
  if (!trends) return null
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 2, paddingBottom: 12 }}>
      <RosterAuditCredit prefix="▲▼ dynasty value moved this week. " />
    </View>
  )
}

export function RosterAuditCredit({ prefix = '' }: { prefix?: string }) {
  return (
    <Muted style={{ fontSize: 11, color: colors.faint }}>
      {prefix}
      <Text style={{ fontSize: 11, color: colors.muted }} onPress={() => WebBrowser.openBrowserAsync(RA_URL)}>
        Values by RosterAudit.com
      </Text>
    </Muted>
  )
}

/** Two players in the same slot. The lower score is dimmed once either has points. */
function LineupRow({ label, a, b, players }: { label: string; a?: Slot; b?: Slot; players: Map<string, FantasyPlayer> }) {
  const pa = scored(a)
  const pb = scored(b)
  const decided = (pa != null || pb != null) && pa !== pb
  const aTrails = decided && (pa ?? 0) < (pb ?? 0)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <PlayerCell slot={a} player={a && players.get(a.id)} align="left" label={label} trailing={aTrails} />
      <View style={{ width: 38, alignItems: 'center' }}>
        <PositionBadge label={label} />
      </View>
      <PlayerCell slot={b} player={b && players.get(b.id)} align="right" label={label} trailing={decided && !aTrails} />
    </View>
  )
}

const DIM = 'rgba(245,245,245,0.65)'
const LOST = 'rgba(245,245,245,0.45)'

function TeamColumn({ team, size, width }: { team?: FantasyTeam; size: number; width: number }) {
  return (
    <View style={{ width, alignItems: 'center', gap: 4 }}>
      <Avatar src={team?.avatar} size={size} />
      <Text numberOfLines={2} style={{ fontSize: size > 40 ? 13 : 12, lineHeight: size > 40 ? 15 : 14, fontWeight: '700', textAlign: 'center' }}>
        {team?.name ?? 'TBD'}
      </Text>
      {team ? <Text tnum style={{ fontSize: 11, color: DIM, marginTop: -2 }}>{record(team)}</Text> : null}
    </View>
  )
}

function BigPoints({ points, proj, lost, size }: { points?: number; proj?: number; lost?: boolean; size: number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text tnum numberOfLines={1} adjustsFontSizeToFit style={{ alignSelf: 'stretch', textAlign: 'center', fontSize: size, lineHeight: size * 1.1, fontWeight: '800', letterSpacing: -1, color: lost ? LOST : colors.fg }}>
        {points == null ? '–' : points.toFixed(1)}
      </Text>
      {proj != null ? <Text tnum style={{ fontSize: 11, color: DIM }}>{proj.toFixed(1)}</Text> : null}
    </View>
  )
}

function Status({ done, live }: { done?: boolean; live?: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      {done ? (
        <Text style={{ fontSize: 13, fontWeight: '700' }}>Final</Text>
      ) : live ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.live }} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.live }}>Live</Text>
        </View>
      ) : null}
      <Text style={{ fontSize: 10, fontWeight: '800', color: DIM, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 5 }}>VS</Text>
    </View>
  )
}

const tone = (p: number) => (p === 50 ? colors.muted : p > 50 ? colors.win : colors.live)

/** Tug-of-war win probability: the favorite's share in green, the underdog's in red, a tick at 50%. */
function WinBar({ pct }: { pct: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text tnum style={{ width: 34, fontSize: 11, fontWeight: '700', color: tone(pct) }}>{pct}%</Text>
      <View style={{ flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' }}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tone(100 - pct), opacity: 0.65 }]} />
        <View style={{ width: `${pct}%`, height: '100%', borderRadius: 3, backgroundColor: tone(pct) }} />
        <View style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(245,245,245,0.4)' }} />
      </View>
      <Text tnum style={{ width: 34, fontSize: 11, fontWeight: '700', textAlign: 'right', color: tone(100 - pct) }}>{100 - pct}%</Text>
    </View>
  )
}

interface ScoreboardProps {
  a: FantasyMatchup
  b?: FantasyMatchup
  teamA?: FantasyTeam
  teamB?: FantasyTeam
  projA?: number
  projB?: number
  done?: boolean
  live?: boolean
}

/** Avatar columns either side of big scores and the status, with the win bar under it. `compact` is the league list size. */
function Scoreboard({ a, b, teamA, teamB, projA, projB, done, live, compact }: ScoreboardProps & { compact?: boolean }) {
  // Once every starter's game is over the result is known: no odds, and the loser's score is dimmed.
  const odds = !done && projA != null && projB != null && b ? winProbability(projA, projB) : undefined
  const lost = (x: number, y?: number) => !!done && y != null && x < y
  const col = compact ? { size: 38, width: 78 } : { size: 48, width: 80 }
  const size = compact ? 26 : 30
  return (
    <View style={{ padding: compact ? 12 : 14, paddingTop: compact ? 14 : 18, gap: compact ? 12 : 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TeamColumn team={teamA} {...col} />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 }}>
          <BigPoints points={a.points} proj={done ? undefined : projA} lost={lost(a.points, b?.points)} size={size} />
          {/* Absolutely centered so uneven score widths can't push the status off the card's midline. */}
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Status done={done} live={live} />
          </View>
          <View style={{ width: 40 }} />
          <BigPoints points={b?.points} proj={done ? undefined : projB} lost={b ? lost(b.points, a.points) : false} size={size} />
        </View>
        {b ? <TeamColumn team={teamB} {...col} /> : <View style={{ width: col.width, alignItems: 'center' }}><Muted style={{ fontSize: 13 }}>Bye</Muted></View>}
      </View>
      {odds != null ? <WinBar pct={odds} /> : null}
    </View>
  )
}

/** Scoreboard card at the top of a head-to-head. */
export function MatchupHero(props: ScoreboardProps) {
  return (
    <View style={card}>
      <Scoreboard {...props} />
    </View>
  )
}

const isLive = (slots: Slot[]) => slots.some((s) => s.game?.state === 'in')
const POS_ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
const posRank = (p?: FantasyPlayer) => {
  const i = POS_ORDER.indexOf(p?.position ?? '')
  return i < 0 ? 99 : i
}

const rowsStyle = { paddingHorizontal: 8, paddingBottom: 10, gap: 4 }

/** Full head-to-head: score card, starters side by side, then both benches. */
export function HeadToHead({
  league,
  a,
  b,
  teams,
  proj,
  players,
  team,
  series,
}: {
  league: FantasyLeague
  a: FantasyMatchup
  b?: FantasyMatchup
  teams?: FantasyTeam[]
  proj?: Map<string, Record<string, number>>
  players: Map<string, FantasyPlayer>
  team: (abbr: string | null | undefined) => Game | undefined
  /** All-time series from a's side, when RosterAudit has the league's history. */
  series?: HeadToHeadRecord
}) {
  const { values } = useContext(Extras)
  const sa = scoreMatchup(a, league, proj, team, players)
  const sb = b ? scoreMatchup(b, league, proj, team, players) : undefined
  const slots = starterSlots(league)
  const benchA = [...sa.bench].sort((x, y) => posRank(players.get(x.id)) - posRank(players.get(y.id)))
  const benchB = [...(sb?.bench ?? [])].sort((x, y) => posRank(players.get(x.id)) - posRank(players.get(y.id)))
  const benchRows = Math.max(benchA.length, benchB.length)
  const starters = [...sa.starters, ...(sb?.starters ?? [])]
  const showTrends = starters.some((s) => Math.abs(values?.get(s.id)?.trend7d ?? 0) >= TREND_MIN)
  const teamA = teams?.find((t) => t.rosterId === a.rosterId)
  const teamB = b && teams?.find((t) => t.rosterId === b.rosterId)

  return (
    <>
      <MatchupHero a={a} b={b} teamA={teamA} teamB={teamB} projA={sa.projected} projB={sb?.projected} done={sa.done && (sb?.done ?? true)} live={isLive(starters)} />
      <Card title="Starters">
        <View style={rowsStyle}>
          {slots.map((slot, i) => (
            <LineupRow key={i} label={slotLabel(slot)} a={sa.starters[i]} b={sb?.starters[i]} players={players} />
          ))}
        </View>
        <LineupLegend trends={showTrends} />
      </Card>
      {benchRows > 0 && (
        <Card title="Bench">
          <View style={rowsStyle}>
            {Array.from({ length: benchRows }, (_, i) => (
              <LineupRow key={i} label="BN" a={benchA[i]} b={benchB[i]} players={players} />
            ))}
          </View>
        </Card>
      )}
      {series && series.games > 0 ? <SeriesCard series={series} teamA={teamA} teamB={teamB} /> : null}
    </>
  )
}

/** All-time head-to-head between the two managers, newest meeting first. */
function SeriesCard({ series, teamA, teamB }: { series: HeadToHeadRecord; teamA?: FantasyTeam; teamB?: FantasyTeam }) {
  const { wins, losses, draws } = series
  const score = `${Math.max(wins, losses)}–${Math.min(wins, losses)}${draws ? `–${draws}` : ''}`
  const summary = wins === losses ? `Tied ${score}` : `${(wins > losses ? teamA : teamB)?.name ?? 'TBD'} leads ${score}`
  return (
    <Card title="All-time series" action={<Muted style={{ fontSize: 13, flexShrink: 1, marginLeft: 12 }} numberOfLines={1}>{summary}</Muted>}>
      {series.meetings.slice(0, 5).map((m, i) => (
        <View key={i}>
          <Divider />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 }}>
            <Muted style={{ flex: 1, fontSize: 13 }}>
              {m.season} {m.label}
            </Muted>
            <Text tnum style={{ fontSize: 14, fontWeight: m.won ? '600' : '400', color: m.won ? colors.fg : colors.muted }}>
              {m.score.toFixed(2)}
            </Text>
            <Muted style={{ fontSize: 13, paddingHorizontal: 8 }}>–</Muted>
            <Text tnum style={{ fontSize: 14, fontWeight: m.won ? '400' : '600', color: m.won ? colors.muted : colors.fg }}>
              {m.oppScore.toFixed(2)}
            </Text>
          </View>
        </View>
      ))}
    </Card>
  )
}

/** Compact scoreboard card for the league's matchup list; tapping it opens the head-to-head. */
export function MatchupCard({ href, a, b, teams, sa, sb, mine }: { href: string; a: FantasyMatchup; b?: FantasyMatchup; teams?: FantasyTeam[]; sa: ReturnType<typeof scoreMatchup>; sb?: ReturnType<typeof scoreMatchup>; mine?: boolean }) {
  return (
    <Link href={href as never} asChild>
      <Pressable>
        {({ pressed }) => (
          <View style={[card, mine && { borderWidth: 1, borderColor: colors.lineStrong }, pressed && { opacity: 0.7 }]}>
            <Scoreboard
              compact
              a={a}
              b={b}
              teamA={teams?.find((t) => t.rosterId === a.rosterId)}
              teamB={b && teams?.find((t) => t.rosterId === b.rosterId)}
              projA={sa.projected}
              projB={sb?.projected}
              done={sa.done && (sb?.done ?? true)}
              live={isLive([...sa.starters, ...(sb?.starters ?? [])])}
            />
          </View>
        )}
      </Pressable>
    </Link>
  )
}
