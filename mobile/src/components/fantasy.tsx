import { Image } from 'expo-image'
import { Link } from 'expo-router'
import { Pressable, View } from 'react-native'
import { Card, Divider, Muted, Text } from './ui'
import type { Game } from '@/lib/espn'
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

/** One side of a lineup row: name, and the player's game. */
function PlayerCell({ slot, player, align, label }: { slot?: Slot; player?: FantasyPlayer; align: 'left' | 'right'; label: string }) {
  const right = align === 'right'
  if (!slot || slot.id === '0') return <Muted style={{ flex: 1, fontSize: 13, color: colors.faint, textAlign: align }}>Empty</Muted>
  const info = gameInfo(player?.team, slot.game)
  const injury = player?.injury ? player.injury.slice(0, 1) === 'Q' ? 'Q' : player.injury.slice(0, 3).toUpperCase() : null
  return (
    <View style={{ flex: 1, alignItems: right ? 'flex-end' : 'flex-start' }}>
      <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600' }}>
        {shortName(player)}
        {injury ? <Text style={{ fontSize: 10, color: colors.live }}> {injury}</Text> : null}
      </Text>
      <Text numberOfLines={1} style={{ fontSize: 11, color: info.live ? colors.live : colors.faint }}>
        {/* The slot label already names the position, except in flex and bench slots. */}
        {[player?.position !== label && player?.position, info.text].filter(Boolean).join(' · ')}
      </Text>
    </View>
  )
}

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
}: {
  league: FantasyLeague
  a: FantasyMatchup
  b?: FantasyMatchup
  teams?: FantasyTeam[]
  proj?: Map<string, Record<string, number>>
  players: Map<string, FantasyPlayer>
  team: (abbr: string | null | undefined) => Game | undefined
}) {
  const sa = scoreMatchup(a, league, proj, team, players)
  const sb = b ? scoreMatchup(b, league, proj, team, players) : undefined
  const slots = starterSlots(league)
  const benchA = [...sa.bench].sort((x, y) => posRank(players.get(x.id)) - posRank(players.get(y.id)))
  const benchB = [...(sb?.bench ?? [])].sort((x, y) => posRank(players.get(x.id)) - posRank(players.get(y.id)))
  const benchRows = Math.max(benchA.length, benchB.length)

  return (
    <>
      <MatchupHero a={a} b={b} teamA={teams?.find((t) => t.rosterId === a.rosterId)} teamB={b && teams?.find((t) => t.rosterId === b.rosterId)} projA={sa.projected} projB={sb?.projected} done={sa.done && (sb?.done ?? true)} />
      <Card title="Starters">
        {slots.map((slot, i) => (
          <View key={i}>
            {i > 0 && <Divider />}
            <LineupRow label={slotLabel(slot)} a={sa.starters[i]} b={sb?.starters[i]} players={players} />
          </View>
        ))}
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
    </>
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
