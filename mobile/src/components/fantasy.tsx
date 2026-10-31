import { Image } from 'expo-image'
import { Link } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { createContext, useContext } from 'react'
import { Pressable, View } from 'react-native'
import { Card, Divider, Muted, Text } from './ui'
import type { Game } from '@/lib/espn'
import { BOOKS, linesFor, statFor, type PlayerLines } from '@/lib/propline'
import { RA_URL, type HeadToHeadRecord, type PlayerValue } from '@/lib/rosteraudit'
import { fmtPts, record, slotLabel, starterSlots, type FantasyLeague, type FantasyMatchup, type FantasyPlayer, type FantasyTeam } from '@/lib/sleeper'
import { scoreMatchup, type Slot } from '@/lib/useFantasy'
import { card, colors, scoreFont } from '@/theme'

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

/** Extra data for lineup rows: RosterAudit values and PropLine lines. Either may be missing; rows then show less. */
interface LineupExtras {
  league?: string
  values?: Map<string, PlayerValue>
  slate?: Map<string, PlayerLines[]>
}
const Extras = createContext<LineupExtras>({})
export const LineupExtrasProvider = Extras.Provider

export const BOOK_COLORS: Record<string, string> = { draftkings: '#61b510', underdog: '#f5c518', prizepicks: '#a77bff' }
/** Week-over-week value moves smaller than this aren't worth an arrow. */
const TREND_MIN = 150

const gameTeamIds = (g?: Game) => (g ? [g.home.id, g.away.id] : [])

/** "D84.5 U79.5 P80.5": each book's main yardage line, book initial in its color. Books without a line are left out. */
function BookLines({ lines, align }: { lines: Partial<Record<string, number>>; align: 'left' | 'right' }) {
  const books = BOOKS.filter((b) => lines[b.key] != null)
  if (!books.length) return null
  return (
    <Text numberOfLines={1} tnum style={{ fontSize: 11, color: colors.muted, textAlign: align }}>
      {books.map((b, i) => (
        <Text key={b.key} tnum style={{ fontSize: 11, color: colors.muted }}>
          {i > 0 ? ' ' : ''}
          <Text style={{ fontSize: 10, fontWeight: '700', color: BOOK_COLORS[b.key] }}>{b.short[0]}</Text>
          {lines[b.key]}
        </Text>
      ))}
    </Text>
  )
}

/** One side of a lineup row: name, the player's game, and pregame sportsbook lines. Tapping opens the player. */
function PlayerCell({ slot, player, align, label }: { slot?: Slot; player?: FantasyPlayer; align: 'left' | 'right'; label: string }) {
  const { league, values, slate } = useContext(Extras)
  const right = align === 'right'
  if (!slot || slot.id === '0') return <Muted style={{ flex: 1, fontSize: 13, color: colors.faint, textAlign: align }}>Empty</Muted>
  const info = gameInfo(player?.team, slot.game)
  const injury = player?.injury ? player.injury.slice(0, 1) === 'Q' ? 'Q' : player.injury.slice(0, 3).toUpperCase() : null
  const trend = values?.get(slot.id)?.trend7d ?? 0
  const stat = statFor(player?.position)
  const lines = stat && slot.game?.state === 'pre' ? linesFor(slate, player?.name, gameTeamIds(slot.game))?.yards[stat] : undefined
  return (
    <Link href={`/fplayer/${slot.id}?league=${league ?? ''}` as never} asChild>
      <Pressable style={{ flex: 1, alignItems: right ? 'flex-end' : 'flex-start' }}>
        <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600' }}>
          {shortName(player)}
          {injury ? <Text style={{ fontSize: 10, color: colors.live }}> {injury}</Text> : null}
          {Math.abs(trend) >= TREND_MIN ? <Text style={{ fontSize: 9, color: trend > 0 ? colors.win : colors.live }}> {trend > 0 ? '▲' : '▼'}</Text> : null}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 11, color: info.live ? colors.live : colors.faint }}>
          {/* The slot label already names the position, except in flex and bench slots. */}
          {[player?.position !== label && player?.position, info.text].filter(Boolean).join(' · ')}
        </Text>
        {lines ? <BookLines lines={lines} align={align} /> : null}
      </Pressable>
    </Link>
  )
}

/** Legend under the starters: what the lines and arrows mean, and the RosterAudit credit their terms ask for. */
function LineupLegend({ lines, trends }: { lines: boolean; trends: boolean }) {
  if (!lines && !trends) return null
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 2, paddingBottom: 12, gap: 2 }}>
      {lines ? (
        <Muted style={{ fontSize: 11, color: colors.faint }}>
          Lines: pass yds (QB), rush yds (RB), rec yds (WR/TE) at{' '}
          {BOOKS.map((b, i) => (
            <Text key={b.key} style={{ fontSize: 11, color: colors.faint }}>
              {i > 0 ? ', ' : ''}
              <Text style={{ fontSize: 11, fontWeight: '700', color: BOOK_COLORS[b.key] }}>{b.short[0]}</Text> {b.name}
            </Text>
          ))}
        </Muted>
      ) : null}
      {trends ? <RosterAuditCredit prefix="▲▼ dynasty value moved this week. " /> : null}
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

export const hasLineData = (stats: Slot[], players: Map<string, FantasyPlayer>, slate?: Map<string, PlayerLines[]>) =>
  stats.some((s) => {
    const p = players.get(s.id)
    const st = statFor(p?.position)
    return !!st && s.game?.state === 'pre' && !!linesFor(slate, p?.name, gameTeamIds(s.game))?.yards[st]
  })

function Points({ slot, align }: { slot?: Slot; align: 'left' | 'right' }) {
  const started = slot?.game && slot.game.state !== 'pre'
  const show = !slot || slot.id === '0' ? undefined : started || slot.points ? slot.points : slot.projection
  return (
    <View style={{ width: 46, alignItems: align === 'left' ? 'flex-end' : 'flex-start' }}>
      <Text tnum style={{ fontFamily: scoreFont, fontSize: 19, color: started || slot?.points ? colors.fg : colors.faint }}>
        {show == null ? '–' : show.toFixed(1)}
      </Text>
    </View>
  )
}

function LineupRow({ label, a, b, players }: { label: string; a?: Slot; b?: Slot; players: Map<string, FantasyPlayer> }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 9, gap: 4 }}>
      <PlayerCell slot={a} player={a && players.get(a.id)} align="left" label={label} />
      <Points slot={a} align="left" />
      <View style={{ width: 34, alignItems: 'center' }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.muted }}>{label}</Text>
      </View>
      <Points slot={b} align="right" />
      <PlayerCell slot={b} player={b && players.get(b.id)} align="right" label={label} />
    </View>
  )
}

function TeamSide({ team }: { team?: FantasyTeam }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <Avatar src={team?.avatar} size={48} />
      <Text numberOfLines={2} style={{ fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
        {team?.name ?? 'TBD'}
      </Text>
      <Muted tnum style={{ fontSize: 12, marginTop: -4 }}>
        {team ? record(team) : ''}
      </Muted>
    </View>
  )
}

/** Scoreboard card for a head-to-head: both teams, live scores, projections and win odds. */
export function MatchupHero({ a, b, teamA, teamB, projA, projB, done }: { a: FantasyMatchup; b?: FantasyMatchup; teamA?: FantasyTeam; teamB?: FantasyTeam; projA?: number; projB?: number; done?: boolean }) {
  // Once every starter's game is over, the result is known: no odds, and the loser's score is dimmed.
  const odds = !done && projA != null && projB != null && b ? winProbability(projA, projB) : undefined
  const dim = (x: number, y?: number) => (done && y != null && x < y ? colors.faint : colors.fg)
  return (
    <View style={[card, { padding: 16, gap: 14 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TeamSide team={teamA} />
        <View style={{ alignItems: 'center', paddingHorizontal: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <Text tnum style={{ fontFamily: scoreFont, fontSize: 34, color: dim(a.points, b?.points) }}>{fmtPts(a.points)}</Text>
            <Muted style={{ fontSize: 13 }}>–</Muted>
            <Text tnum style={{ fontFamily: scoreFont, fontSize: 34, color: b ? dim(b.points, a.points) : colors.fg }}>{b ? fmtPts(b.points) : '–'}</Text>
          </View>
          {done ? (
            <Muted style={{ fontSize: 11 }}>Final</Muted>
          ) : projA != null ? (
            <Muted tnum style={{ fontSize: 11 }}>
              Proj {projA.toFixed(1)} – {projB != null ? projB.toFixed(1) : '–'}
            </Muted>
          ) : null}
        </View>
        <TeamSide team={teamB} />
      </View>
      {odds != null ? (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: colors.raised }}>
            <View style={{ width: `${odds}%`, backgroundColor: colors.win }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Muted tnum style={{ fontSize: 11 }}>{odds}% win</Muted>
            <Muted tnum style={{ fontSize: 11 }}>{100 - odds}% win</Muted>
          </View>
        </View>
      ) : null}
    </View>
  )
}

const POS_ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
const posRank = (p?: FantasyPlayer) => {
  const i = POS_ORDER.indexOf(p?.position ?? '')
  return i < 0 ? 99 : i
}

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
  const { values, slate } = useContext(Extras)
  const sa = scoreMatchup(a, league, proj, team, players)
  const sb = b ? scoreMatchup(b, league, proj, team, players) : undefined
  const slots = starterSlots(league)
  const benchA = [...sa.bench].sort((x, y) => posRank(players.get(x.id)) - posRank(players.get(y.id)))
  const benchB = [...(sb?.bench ?? [])].sort((x, y) => posRank(players.get(x.id)) - posRank(players.get(y.id)))
  const benchRows = Math.max(benchA.length, benchB.length)
  const starters = [...sa.starters, ...(sb?.starters ?? [])]
  const showLines = hasLineData(starters, players, slate)
  const showTrends = starters.some((s) => Math.abs(values?.get(s.id)?.trend7d ?? 0) >= TREND_MIN)
  const teamA = teams?.find((t) => t.rosterId === a.rosterId)
  const teamB = b && teams?.find((t) => t.rosterId === b.rosterId)

  return (
    <>
      <MatchupHero a={a} b={b} teamA={teamA} teamB={teamB} projA={sa.projected} projB={sb?.projected} done={sa.done && (sb?.done ?? true)} />
      <Card title="Starters">
        {slots.map((slot, i) => (
          <View key={i}>
            {i > 0 && <Divider />}
            <LineupRow label={slotLabel(slot)} a={sa.starters[i]} b={sb?.starters[i]} players={players} />
          </View>
        ))}
        <LineupLegend lines={showLines} trends={showTrends} />
      </Card>
      {benchRows > 0 && (
        <Card title="Bench">
          {Array.from({ length: benchRows }, (_, i) => (
            <View key={i}>
              {i > 0 && <Divider />}
              <LineupRow label="BN" a={benchA[i]} b={benchB[i]} players={players} />
            </View>
          ))}
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

function TeamLine({ team, points, proj, mine, leading }: { team?: FantasyTeam; points: number; proj?: number; mine?: boolean; leading?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 }}>
      <Avatar src={team?.avatar} size={30} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: mine ? '700' : '500' }}>
          {team?.name ?? 'TBD'}
        </Text>
        <Muted tnum style={{ fontSize: 11 }}>
          {team ? record(team) : ''}
          {team?.manager && team.manager !== team.name ? ` · ${team.manager}` : ''}
        </Muted>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text tnum style={{ fontFamily: scoreFont, fontSize: 24, color: leading === false ? colors.muted : colors.fg }}>
          {fmtPts(points)}
        </Text>
        {proj != null ? (
          <Muted tnum style={{ fontSize: 10, marginTop: -2 }}>
            Proj {proj.toFixed(1)}
          </Muted>
        ) : null}
      </View>
    </View>
  )
}

/** Compact two-team card for the league's matchup list; tapping it opens the head-to-head. */
export function MatchupCard({ href, a, b, teams, projA, projB, mine }: { href: string; a: FantasyMatchup; b?: FantasyMatchup; teams?: FantasyTeam[]; projA?: number; projB?: number; mine?: boolean }) {
  const lead = b && a.points !== b.points ? a.points > b.points : undefined
  return (
    <Link href={href as never} asChild>
      <Pressable>
        {({ pressed }) => (
          <View style={[card, mine && { borderWidth: 1, borderColor: colors.lineStrong }, pressed && { backgroundColor: colors.raised }]}>
            <TeamLine team={teams?.find((t) => t.rosterId === a.rosterId)} points={a.points} proj={projA} mine={mine} leading={lead} />
            <Divider />
            {b ? <TeamLine team={teams?.find((t) => t.rosterId === b.rosterId)} points={b.points} proj={projB} leading={lead === undefined ? undefined : !lead} /> : <Muted style={{ padding: 14, fontSize: 13 }}>Bye</Muted>}
          </View>
        )}
      </Pressable>
    </Link>
  )
}
