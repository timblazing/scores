import { Image } from 'expo-image'
import { Link } from 'expo-router'
import { SymbolView, type SymbolViewProps } from 'expo-symbols'
import { useId, useState, type ReactNode } from 'react'
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native'
import Svg, { Defs, Pattern, Rect } from 'react-native-svg'
import type { Game, LeagueId, OddsLine, Side } from '@/lib/espn'
import { headshot, img, teamLogo } from '@/lib/espn'
import { monthDay, readable } from '@/lib/format'
import { Divider, Headshot, Logo, Muted, Text } from '../ui'
import { card, colors, scoreFont } from '@/theme'

type Any = any

export function periodLabel(league: LeagueId, p: number) {
  if (p <= 4) return ['1st', '2nd', '3rd', '4th'][p - 1]
  return league === 'nba' ? (p === 5 ? 'OT' : `${p - 4}OT`) : 'OT'
}

export const quarterName = (league: LeagueId, p: number) => (p <= 4 ? `${periodLabel(league, p)} Quarter` : periodLabel(league, p) === 'OT' ? 'Overtime' : periodLabel(league, p))

/** ESPN-style section: an uppercase heading over a hairline, then the content. */
export function Section({ title, sub, icon, action, children, style, divider = true }: { title: string; sub?: string; icon?: ReactNode; action?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle>; divider?: boolean }) {
  return (
    <View style={[card, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 }}>
        {icon}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', letterSpacing: 0.4 }}>{title.toUpperCase()}</Text>
          {sub ? <Muted style={{ fontSize: 12, marginTop: 1 }}>{sub}</Muted> : null}
        </View>
        {action}
      </View>
      {divider && <Divider />}
      {children}
    </View>
  )
}

/** Small rounded label, e.g. "Last Play" or "In Progress". */
export function Chip({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'live' }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '700',
        color: tone === 'live' ? colors.live : colors.fg,
        backgroundColor: tone === 'live' ? 'rgba(255,69,58,0.16)' : 'rgba(255,255,255,0.12)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      {children}
    </Text>
  )
}

/** Full-width text button at the bottom of a section ("Full Team Stats"). */
export function MoreLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <>
      <Divider />
      <Pressable onPress={onPress} style={({ pressed }) => ({ paddingVertical: 13, alignItems: 'center', opacity: pressed ? 0.6 : 1 })}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#5aa9ff' }}>{label}</Text>
      </Pressable>
    </>
  )
}

const TeamTag = ({ side, size = 20, full }: { side: Side; size?: number; full?: boolean }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <Logo src={side.logo} size={size} />
    <Text numberOfLines={1} style={{ fontWeight: '600', fontSize: 14, flexShrink: 1 }}>
      {full ? side.name : side.abbr}
    </Text>
  </View>
)

/* ---------- line score ---------- */

export function LineScore({ game }: { game: Game }) {
  const n = Math.max(4, game.home.linescores.length, game.away.linescores.length)
  if (!game.home.linescores.length) return null
  const cols = Array.from({ length: n }, (_, i) => i + 1)
  const cell = { width: 30, textAlign: 'center' as const }
  const row = (s: Side) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
      <View style={{ flex: 1, minWidth: 64, paddingRight: 8 }}>
        <TeamTag side={s} full />
      </View>
      {cols.map((c) => (
        <Text key={c} tnum style={[cell, { color: colors.muted, fontSize: 14 }]}>
          {s.linescores[c - 1] ?? '-'}
        </Text>
      ))}
      <Text tnum style={[cell, { fontWeight: '700', width: 38, fontSize: 15 }]}>
        {s.score}
      </Text>
    </View>
  )
  return (
    <View style={card}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <View style={{ flexDirection: 'row', paddingBottom: 4 }}>
          <View style={{ flex: 1 }} />
          {cols.map((c) => (
            <Text key={c} style={[cell, { fontSize: 12, fontWeight: '600', color: colors.faint }]}>
              {c <= 4 ? c : periodLabel(game.league, c)}
            </Text>
          ))}
          <Text style={[cell, { fontSize: 12, fontWeight: '600', color: colors.faint, width: 38 }]}>T</Text>
        </View>
        <Divider />
        {row(game.away)}
        <Divider />
        {row(game.home)}
      </View>
    </View>
  )
}

/* ---------- odds ---------- */

export function OddsCard({ game }: { game: Game }) {
  const o = game.odds
  if (!o) return null
  const close: { away: OddsLine; home: OddsLine } = {
    away: { spread: o.awaySpread, spreadOdds: o.awaySpreadOdds, total: o.overUnder != null ? `o${o.overUnder}` : undefined, totalOdds: o.overOdds, ml: o.awayML },
    home: { spread: o.homeSpread, spreadOdds: o.homeSpreadOdds, total: o.overUnder != null ? `u${o.overUnder}` : undefined, totalOdds: o.underOdds, ml: o.homeML },
  }
  // Live lines fill the main columns while a game is on; the first column keeps the closing (or opening) line, ESPN-style:
  // the favorite's row shows its spread, the underdog's row the total.
  const live = game.state === 'in' && o.live ? o.live : undefined
  const main = live ?? close
  const ref = live ? close : o.open
  const refLabel = live ? 'Close' : 'Open'
  const fav = (s: 'away' | 'home') => String(ref?.[s].spread ?? close[s].spread ?? '').startsWith('-')
  const refCell = (s: 'away' | 'home') => {
    const l = ref?.[s]
    if (!l) return {}
    const other = s === 'away' ? 'home' : 'away'
    if (fav(s) || !fav(other)) return fav(s) ? { v: l.spread, sub: l.spreadOdds } : { v: l.total, sub: l.totalOdds }
    return { v: l.total, sub: l.totalOdds }
  }
  const cols = [...(ref ? [refLabel] : []), 'Spread', 'Total', 'ML']
  const Cell = ({ v, sub, dim }: { v?: string; sub?: string; dim?: boolean }) => (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text tnum style={{ fontSize: 14, fontWeight: dim ? '400' : '600', color: dim ? colors.muted : colors.fg }}>{v ?? '-'}</Text>
      {sub ? <Text tnum style={{ fontSize: 11, color: colors.faint, marginTop: 1 }}>{sub}</Text> : null}
    </View>
  )
  const status = game.state === 'in' ? game.shortDetail.toUpperCase() : game.state === 'post' ? 'FINAL' : ''
  return (
    <Section title="Game odds" action={o.provider ? <Muted style={{ fontSize: 12 }}>Odds by {o.provider}</Muted> : null}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
        <Text style={{ width: 112, fontSize: 11, fontWeight: '700', color: colors.faint }}>{status}</Text>
        {cols.map((h) => (
          <Text key={h} style={{ flex: 1, fontSize: 11, fontWeight: '700', color: colors.faint, textAlign: 'center' }}>
            {h.toUpperCase()}
          </Text>
        ))}
      </View>
      {(['away', 'home'] as const).map((s) => {
        const side = game[s]
        const rec = [side.record, side.confRecord ? `${side.confRecord} Conf` : undefined].filter(Boolean).join(', ')
        const r = refCell(s)
        return (
          <View key={s}>
            <Divider />
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11 }}>
              <View style={{ width: 112, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Logo src={side.logo} size={24} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700' }}>{side.abbr}</Text>
                  {rec ? <Muted numberOfLines={1} style={{ fontSize: 10 }}>({rec})</Muted> : null}
                </View>
              </View>
              {ref && <Cell v={r.v} sub={r.sub} dim />}
              <Cell v={main[s].spread} sub={main[s].spreadOdds} />
              <Cell v={main[s].total} sub={main[s].totalOdds} />
              <Cell v={main[s].ml} />
            </View>
          </View>
        )
      })}
      <Text style={{ paddingHorizontal: 16, paddingTop: 2, paddingBottom: 14, fontSize: 11, color: colors.faint }}>
        Note: Odds and lines subject to change.{live ? ' Live lines.' : ''}
      </Text>
    </Section>
  )
}

/* ---------- matchup predictor ---------- */

export function Predictor({ raw, game }: { raw: Any; game: Game }) {
  const p = raw.predictor
  if (!p?.homeTeam?.gameProjection) return null
  const home = Number(p.homeTeam.gameProjection)
  const away = Number(p.awayTeam?.gameProjection ?? 100 - home)
  return (
    <Section title="Matchup predictor" sub="According to ESPN Analytics">
      <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Logo src={game.away.logo} size={28} />
            <Text tnum style={{ fontFamily: scoreFont, fontSize: 30, lineHeight: 32 }}>{away.toFixed(1)}%</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text tnum style={{ fontFamily: scoreFont, fontSize: 30, lineHeight: 32 }}>{home.toFixed(1)}%</Text>
            <Logo src={game.home.logo} size={28} />
          </View>
        </View>
        <SplitBar share={away / (away + home)} away={readable(game.away.color)} home={readable(game.home.color)} />
      </View>
    </Section>
  )
}

/* ---------- leaders ---------- */

export function Leaders({ raw, game, title }: { raw: Any; game: Game; title: string }) {
  const teams: Any[] = raw.leaders ?? []
  const away = teams.find((t) => String(t.team?.id) === game.away.id)
  const home = teams.find((t) => String(t.team?.id) === game.home.id)
  const cats: string[] = (away?.leaders ?? home?.leaders ?? []).filter((c: Any) => c.leaders?.length).map((c: Any) => c.name)
  if (!cats.length) return null
  const pick = (t: Any, name: string) => t?.leaders?.find((c: Any) => c.name === name)
  return (
    <Section title={title}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 }}>
        <TeamTag side={game.away} size={22} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontWeight: '600', fontSize: 14 }}>{game.home.abbr}</Text>
          <Logo src={game.home.logo} size={22} />
        </View>
      </View>
      {cats.slice(0, 5).map((name) => {
        const a = pick(away, name)
        const h = pick(home, name)
        return (
          <View key={name}>
            <Divider />
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <LeaderShot league={game.league} l={a?.leaders?.[0]} />
                <Text tnum style={{ width: 56, marginLeft: 10, fontSize: 22, fontWeight: '800' }}>{a?.leaders?.[0]?.mainStat?.value ?? a?.leaders?.[0]?.displayValue ?? ''}</Text>
                <Muted numberOfLines={2} style={{ flex: 1, textAlign: 'center', fontSize: 12 }}>{(a ?? h)?.displayName}</Muted>
                <Text tnum style={{ width: 56, marginRight: 10, fontSize: 22, fontWeight: '800', textAlign: 'right' }}>{h?.leaders?.[0]?.mainStat?.value ?? h?.leaders?.[0]?.displayValue ?? ''}</Text>
                <LeaderShot league={game.league} l={h?.leaders?.[0]} />
              </View>
              <View style={{ flexDirection: 'row', marginTop: 6, gap: 12 }}>
                <LeaderName l={a?.leaders?.[0]} />
                <LeaderName l={h?.leaders?.[0]} right />
              </View>
            </View>
          </View>
        )
      })}
    </Section>
  )
}

function LeaderShot({ l, league }: { l: Any; league: LeagueId }) {
  if (!l) return <View style={{ width: 44 }} />
  return (
    <Link href={`/player/${league}/${l.athlete?.id}`} asChild>
      <Pressable>
        <Headshot src={headshot(league, l.athlete?.id, 44)} size={44} />
      </Pressable>
    </Link>
  )
}

function LeaderName({ l, right }: { l: Any; right?: boolean }) {
  if (!l) return <View style={{ flex: 1 }} />
  const a = l.athlete ?? {}
  return (
    <View style={{ flex: 1, alignItems: right ? 'flex-end' : 'flex-start' }}>
      <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600' }}>
        {a.shortName ?? a.displayName} <Text style={{ fontSize: 11, fontWeight: '400', color: colors.faint }}>{a.position?.abbreviation ?? ''}</Text>
      </Text>
      <Muted numberOfLines={1} style={{ fontSize: 12 }}>{l.summary || l.displayValue}</Muted>
    </View>
  )
}

/* ---------- team stats ---------- */

const num = (s: string) => {
  const m = String(s).match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : NaN
}

const LOWER_IS_BETTER = /turnover|penalt|sack|interception|fumble|foul|lost/i

/** Comparable number for a stat: seconds for possession, a rate for "8-16" efficiencies, yards for penalties. */
function statValue(name: string, v: string) {
  if (name === 'possessionTime') {
    const [m, s] = v.split(':').map(Number)
    return m * 60 + (s || 0)
  }
  if (/Eff$/.test(name)) {
    const [a, b] = v.split('-').map(Number)
    return b ? a / b : 0
  }
  if (name === 'totalPenaltiesYards') return Number(v.split('-')[1])
  return num(v)
}

/** Two-team bar: the away share hatched, the home share solid, like ESPN's team stats. */
export function SplitBar({ share, away, home, height = 8 }: { share: number; away: string; home: string; height?: number }) {
  const [W, setW] = useState(0)
  const id = `h${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const gap = 4
  const aW = Math.max(0, Math.min(1, share)) * (W - gap)
  const hW = W - gap - aW
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
      {W > 0 && (
        <Svg width={W} height={height}>
          <Defs>
            <Pattern id={id} patternUnits="userSpaceOnUse" width={5} height={5} patternTransform="rotate(45)">
              <Rect x={0} y={0} width={2} height={5} fill={away} />
            </Pattern>
          </Defs>
          {aW > 0.5 && (
            <>
              <Rect width={aW} height={height} rx={2} fill={away} opacity={0.28} />
              <Rect width={aW} height={height} rx={2} fill={`url(#${id})`} />
            </>
          )}
          {hW > 0.5 && <Rect x={aW + gap} width={hW} height={height} rx={2} fill={home} />}
        </Svg>
      )}
    </View>
  )
}

function Swatch({ color, hatched }: { color: string; hatched?: boolean }) {
  return (
    <View style={{ width: 14, height: 10 }}>
      {hatched ? <SplitBar share={1} away={color} home={color} height={10} /> : <View style={{ flex: 1, borderRadius: 2, backgroundColor: color }} />}
    </View>
  )
}

function teamStats(raw: Any, game: Game) {
  const teams: Any[] = raw.boxscore?.teams ?? []
  const away = teams.find((t) => String(t.team?.id) === game.away.id)
  const home = teams.find((t) => String(t.team?.id) === game.home.id)
  if (!away?.statistics?.length || !home?.statistics?.length) return undefined
  const get = (t: Any, name: string) => t.statistics.find((s: Any) => s.name === name)
  return { away, home, get }
}

const FOOTBALL_BARS: [string, string][] = [
  ['totalYards', 'Total Yards'],
  ['turnovers', 'Turnovers'],
  ['firstDowns', '1st Downs'],
  ['totalPenaltiesYards', 'Penalties'],
  ['thirdDownEff', '3rd Down'],
  ['fourthDownEff', '4th Down'],
  ['possessionTime', 'Possession'],
]

/** Gamecast team stats: key numbers with a split bar under each. */
export function TeamStatsBars({ raw, game, onMore }: { raw: Any; game: Game; onMore?: () => void }) {
  const ts = teamStats(raw, game)
  if (!ts) return null
  const football = game.league !== 'nba'
  const seen = new Set<string>()
  const rows: { name: string; label: string; a: string; h: string }[] = football
    ? FOOTBALL_BARS.map(([name, label]) => ({ name, label, a: ts.get(ts.away, name)?.displayValue, h: ts.get(ts.home, name)?.displayValue })).filter((r) => r.a != null && r.h != null)
    : ts.away.statistics
        .filter((s: Any) => !seen.has(s.label) && seen.add(s.label) && !/technical|flagrant|team turnovers/i.test(s.label))
        .slice(0, 7)
        .map((s: Any) => ({ name: s.name, label: s.label, a: s.displayValue, h: ts.get(ts.home, s.name)?.displayValue ?? '-' }))
  const ac = readable(game.away.color)
  const hc = readable(game.home.color)
  return (
    <Section title="Team stats">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Logo src={game.away.logo} size={22} />
          <Swatch color={ac} hatched />
          <Muted style={{ fontSize: 12, fontWeight: '600' }}>{game.away.abbr}</Muted>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Muted style={{ fontSize: 12, fontWeight: '600' }}>{game.home.abbr}</Muted>
          <Swatch color={hc} />
          <Logo src={game.home.logo} size={22} />
        </View>
      </View>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 16 }}>
        {rows.map((s) => {
          const a = statValue(s.name, s.a)
          const h = statValue(s.name, s.h)
          const ok = !Number.isNaN(a) && !Number.isNaN(h) && a + h > 0
          const lower = LOWER_IS_BETTER.test(s.label)
          const aWins = ok && (lower ? a < h : a > h)
          const hWins = ok && (lower ? h < a : h > a)
          return (
            <View key={s.name}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 }}>
                <Text tnum style={{ fontSize: 15, fontWeight: aWins ? '800' : '500', color: aWins ? colors.fg : colors.muted }}>{s.a}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600' }}>{s.label}</Text>
                <Text tnum style={{ fontSize: 15, fontWeight: hWins ? '800' : '500', color: hWins ? colors.fg : colors.muted }}>{s.h}</Text>
              </View>
              <SplitBar share={ok ? a / (a + h) : 0.5} away={ac} home={hc} />
            </View>
          )
        })}
      </View>
      {onMore && <MoreLink label="Full Team Stats" onPress={onMore} />}
    </Section>
  )
}

const FOOTBALL_TABLE: { name: string; label: string; subs?: [string, string][] }[] = [
  { name: 'firstDowns', label: '1st Downs', subs: [['thirdDownEff', '3rd down efficiency'], ['fourthDownEff', '4th down efficiency']] },
  { name: 'totalYards', label: 'Total Yards' },
  { name: 'netPassingYards', label: 'Passing', subs: [['completionAttempts', 'Comp/Att'], ['yardsPerPass', 'Yards per pass'], ['interceptions', 'Interceptions thrown']] },
  { name: 'rushingYards', label: 'Rushing', subs: [['rushingAttempts', 'Rushing Attempts'], ['yardsPerRushAttempt', 'Yards per rush']] },
  { name: 'totalPenaltiesYards', label: 'Penalties' },
  { name: 'turnovers', label: 'Turnovers', subs: [['fumblesLost', 'Fumbles lost'], ['interceptions', 'Interceptions thrown']] },
  { name: 'possessionTime', label: 'Possession' },
]

/** Team Stats tab: every team stat, football grouped like ESPN (sub-stats indented under their total). */
export function TeamStatsTable({ raw, game }: { raw: Any; game: Game }) {
  const ts = teamStats(raw, game)
  if (!ts) return null
  type Row = { key: string; label: string; a: string; h: string; sub?: boolean }
  const rows: Row[] = []
  const val = (t: Any, name: string) => ts.get(t, name)?.displayValue ?? '-'
  if (game.league !== 'nba') {
    const used = new Set<string>()
    for (const g of FOOTBALL_TABLE) {
      if (!ts.get(ts.away, g.name)) continue
      used.add(g.name)
      rows.push({ key: g.name, label: g.label, a: val(ts.away, g.name), h: val(ts.home, g.name) })
      for (const [name, label] of g.subs ?? []) {
        if (!ts.get(ts.away, name)) continue
        used.add(name)
        rows.push({ key: `${g.name}.${name}`, label, a: val(ts.away, name), h: val(ts.home, name), sub: true })
      }
    }
    for (const s of ts.away.statistics) if (!used.has(s.name)) rows.push({ key: s.name, label: s.label, a: s.displayValue, h: val(ts.home, s.name) })
  } else {
    const seen = new Set<string>()
    for (const s of ts.away.statistics) if (!seen.has(s.label) && seen.add(s.label)) rows.push({ key: s.name, label: s.label, a: s.displayValue, h: val(ts.home, s.name) })
  }
  return (
    <Section title="Team stats" divider={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={{ flex: 1 }} />
        <View style={{ width: 64, alignItems: 'center' }}>
          <Logo src={game.away.logo} size={22} />
        </View>
        <View style={{ width: 64, alignItems: 'center' }}>
          <Logo src={game.home.logo} size={22} />
        </View>
      </View>
      {rows.map((r) => (
        <View key={r.key}>
          {!r.sub && <Divider />}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: r.sub ? 7 : 11, paddingLeft: r.sub ? 32 : 16 }}>
            <Text style={{ flex: 1, fontSize: r.sub ? 13 : 14, fontWeight: r.sub ? '400' : '600', color: r.sub ? colors.muted : colors.fg }}>{r.label}</Text>
            <Text tnum style={{ width: 64, textAlign: 'center', fontSize: r.sub ? 13 : 14, fontWeight: r.sub ? '400' : '700', color: r.sub ? colors.muted : colors.fg }}>{r.a}</Text>
            <Text tnum style={{ width: 64, textAlign: 'center', fontSize: r.sub ? 13 : 14, fontWeight: r.sub ? '400' : '700', color: r.sub ? colors.muted : colors.fg }}>{r.h}</Text>
          </View>
        </View>
      ))}
      <View style={{ height: 6 }} />
    </Section>
  )
}

/* ---------- standings ---------- */

const STANDING_COLS: [string, string][] = [
  ['CONF', 'CONF'],
  ['overall', 'OVR'],
  ['W', 'W'],
  ['L', 'L'],
  ['T', 'T'],
  ['PCT', 'PCT'],
  ['GB', 'GB'],
]

export function Standings({ raw, game }: { raw: Any; game: Game }) {
  const s = raw.standings
  const groups: Any[] = (s?.groups ?? []).filter((g: Any) => g.standings?.entries?.length)
  if (!groups.length) return null
  return (
    <Section title={s.header ?? 'Standings'} divider={false}>
      {groups.map((g, gi) => {
        const entries: Any[] = g.standings.entries
        const statOf = (e: Any, key: string) => e.stats?.find((x: Any) => x.abbreviation === key)?.displayValue
        const cols = STANDING_COLS.filter(([key]) => entries.some((e) => statOf(e, key) != null)).filter(([key]) => key !== 'T' || entries.some((e) => Number(statOf(e, 'T')) > 0))
        return (
          <View key={gi} style={{ marginTop: gi ? 8 : 0 }}>
            {g.conferenceHeader && g.conferenceHeader !== g.divisionHeader ? <Muted style={{ paddingHorizontal: 16, paddingBottom: 6, fontSize: 12, fontWeight: '600' }}>{g.conferenceHeader}</Muted> : null}
            <Divider />
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 9 }}>
              <Text style={{ flex: 1, fontSize: 12, fontWeight: '800', letterSpacing: 0.3 }}>{String(g.divisionHeader ?? g.header ?? '').toUpperCase()}</Text>
              {cols.map(([key, label]) => (
                <Text key={key} style={{ width: 46, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.faint }}>
                  {label}
                </Text>
              ))}
            </View>
            {entries.map((e) => {
              const mine = String(e.id) === game.home.id || String(e.id) === game.away.id
              const logo = e.logo?.find((l: Any) => l.rel?.includes('dark'))?.href ?? e.logo?.[0]?.href
              return (
                <Link key={e.id} href={`/team/${game.league}/${e.id}`} asChild>
                  <Pressable style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: colors.line, backgroundColor: mine ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                    <Logo src={img(logo, 40)} size={20} />
                    <Text numberOfLines={1} style={{ flex: 1, marginLeft: 10, fontSize: 14, fontWeight: mine ? '700' : '400', color: mine ? colors.fg : colors.muted }}>
                      {e.team}
                    </Text>
                    {cols.map(([key]) => (
                      <Text key={key} tnum style={{ width: 46, textAlign: 'center', fontSize: 13, fontWeight: mine ? '700' : '400', color: mine ? colors.fg : colors.muted }}>
                        {statOf(e, key) ?? '-'}
                      </Text>
                    ))}
                  </Pressable>
                </Link>
              )
            })}
          </View>
        )
      })}
      <View style={{ height: 8 }} />
    </Section>
  )
}

/* ---------- last five ---------- */

export function LastFive({ raw, game }: { raw: Any; game: Game }) {
  const teams: Any[] = raw.lastFiveGames ?? []
  if (!teams.length) return null
  return (
    <Section title="Last five games" divider={false}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 14 }}>
        {[game.away, game.home].map((side) => {
          const t = teams.find((x) => String(x.team?.id) === side.id)
          if (!t?.events?.length) return null
          return (
            <View key={side.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Logo src={side.logo} size={18} />
                <Text style={{ fontSize: 13, fontWeight: '600' }}>{side.displayName}</Text>
              </View>
              {t.events.map((e: Any) => (
                <Link key={e.id} href={`/game/${game.league}/${e.id}`} asChild>
                  <Pressable style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: colors.lineStrong }}>
                    <Text tnum style={{ width: 48, fontSize: 13, color: colors.faint }}>{monthDay(e.gameDate)}</Text>
                    <Text style={{ width: 22, fontSize: 13, color: colors.faint }}>{e.atVs}</Text>
                    <Logo src={teamLogo(game.league, e.opponent?.abbreviation, 32, e.opponent?.id)} size={18} />
                    <Text style={{ flex: 1, marginLeft: 6, fontSize: 13 }}>{e.opponent?.abbreviation}</Text>
                    <Text tnum style={{ fontSize: 13 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: e.gameResult === 'W' ? colors.win : e.gameResult === 'L' ? colors.live : colors.muted }}>{e.gameResult}</Text> {e.score}
                    </Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          )
        })}
      </View>
    </Section>
  )
}

/* ---------- season series ---------- */

export function SeasonSeries({ raw, game }: { raw: Any; game: Game }) {
  const s = (raw.seasonseries ?? [])[0]
  if (!s?.events?.length || s.events.length < 2) return null
  return (
    <Section title={s.title ?? 'Season series'} action={s.summary ? <Muted style={{ fontSize: 12 }}>{s.summary}</Muted> : null}>
      {s.events.map((e: Any, i: number) => {
        const away = e.competitors?.find((c: Any) => c.homeAway === 'away')
        const home = e.competitors?.find((c: Any) => c.homeAway === 'home')
        const done = e.statusType?.completed ?? e.status?.type?.completed
        const current = String(e.id) === game.id
        return (
          <View key={e.id}>
            {i > 0 && <Divider />}
            <Link href={`/game/${game.league}/${e.id}`} asChild>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 11, backgroundColor: current ? colors.raised : 'transparent' }}>
                <View style={{ width: 84, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Logo src={teamLogo(game.league, away?.team?.abbreviation, 32, away?.team?.id)} size={22} />
                  <Text tnum style={{ fontSize: 14, fontWeight: done || Number(away?.score) > 0 ? '600' : '400' }}>
                    {done || Number(away?.score) > 0 ? away?.score : away?.team?.abbreviation}
                  </Text>
                </View>
                <Muted style={{ fontSize: 12 }}>{e.statusType?.shortDetail ?? e.status?.type?.shortDetail ?? ''}</Muted>
                <View style={{ width: 84, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                  <Text tnum style={{ fontSize: 14, fontWeight: done || Number(home?.score) > 0 ? '600' : '400' }}>
                    {done || Number(home?.score) > 0 ? home?.score : home?.team?.abbreviation}
                  </Text>
                  <Logo src={teamLogo(game.league, home?.team?.abbreviation, 32, home?.team?.id)} size={22} />
                </View>
              </Pressable>
            </Link>
          </View>
        )
      })}
    </Section>
  )
}

/* ---------- injuries ---------- */

export function Injuries({ raw, game }: { raw: Any; game: Game }) {
  const teams: Any[] = (raw.injuries ?? []).filter((t: Any) => t.injuries?.length)
  if (!teams.length) return null
  return (
    <Section title="Injury report" divider={false}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 14 }}>
        {[game.away, game.home].map((side) => {
          const t = teams.find((x) => String(x.team?.id) === side.id)
          if (!t) return null
          return (
            <View key={side.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <Logo src={side.logo} size={18} />
                <Text style={{ fontSize: 13, fontWeight: '600' }}>{side.displayName}</Text>
              </View>
              {t.injuries.map((i: Any, idx: number) => (
                <Link key={`${i.athlete?.id}${i.status}${idx}`} href={`/player/${game.league}/${i.athlete?.id}`} asChild>
                  <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderTopWidth: 0.5, borderTopColor: colors.lineStrong }}>
                    <Headshot src={headshot(game.league, i.athlete?.id, 32)} size={32} />
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '500' }}>
                        {i.athlete?.displayName} <Text style={{ fontSize: 12, color: colors.faint, fontWeight: '400' }}>{i.athlete?.position?.abbreviation}</Text>
                      </Text>
                      <Muted numberOfLines={1} style={{ fontSize: 12 }}>{[i.details?.type, i.details?.detail].filter(Boolean).join(' · ') || i.type?.description}</Muted>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 13, fontWeight: '500', color: /out|injured reserve/i.test(i.status) ? colors.live : colors.warn }}>{i.status}</Text>
                      {i.details?.returnDate ? <Text style={{ fontSize: 11, color: colors.faint }}>Est. {monthDay(i.details.returnDate)}</Text> : null}
                    </View>
                  </Pressable>
                </Link>
              ))}
            </View>
          )
        })}
      </View>
    </Section>
  )
}

/* ---------- game info ---------- */

function weatherSymbol(condition = ''): SymbolViewProps['name'] {
  const c = condition.toLowerCase()
  if (/thunder|storm/.test(c)) return 'cloud.bolt.rain.fill'
  if (/snow|flurr|sleet/.test(c)) return 'cloud.snow.fill'
  if (/rain|shower|drizzle/.test(c)) return 'cloud.rain.fill'
  if (/fog|haze|mist/.test(c)) return 'cloud.fog.fill'
  if (/partly|mostly sunny|intermittent|some clouds/.test(c)) return 'cloud.sun.fill'
  if (/cloud|overcast/.test(c)) return 'cloud.fill'
  if (/clear|sunny|fair/.test(c)) return 'sun.max.fill'
  return 'thermometer.medium'
}

function InfoRow({ icon, children, right }: { icon: SymbolViewProps['name']; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
      <SymbolView name={icon} size={18} tintColor={colors.muted} style={{ width: 22 }} />
      <View style={{ flex: 1 }}>{children}</View>
      {right}
    </View>
  )
}

export function GameInfo({ raw, game }: { raw: Any; game: Game }) {
  const gi = raw.gameInfo ?? {}
  const v = gi.venue
  const where = [v?.address?.city, v?.address?.state].filter(Boolean).join(', ')
  const officials = (gi.officials ?? []).map((o: Any) => o.displayName).filter(Boolean)
  const photo = v?.images?.find((i: Any) => i.rel?.includes('interior'))?.href ?? v?.images?.[0]?.href
  const networks = (game.broadcast ?? '').split(/,\s*/).filter(Boolean)
  const w = gi.weather
  const when = new Date(game.date)
  const date = game.timeTBD
    ? `TBD, ${when.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`
    : `${when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}, ${when.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`
  return (
    <Section title="Game information">
      <InfoRow icon="calendar">
        <Text style={{ fontSize: 14 }}>{date}</Text>
      </InfoRow>
      {v?.fullName ? (
        <>
          <Divider inset={50} />
          <InfoRow
            icon="mappin.and.ellipse"
            right={
              w?.temperature != null ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text tnum style={{ fontSize: 15, fontWeight: '600' }}>{w.temperature}°</Text>
                  <SymbolView name={weatherSymbol(w.conditionId ?? w.displayValue)} size={18} type="multicolor" />
                </View>
              ) : null
            }
          >
            <Text style={{ fontSize: 14, fontWeight: '600' }}>{v.fullName}</Text>
            {where ? <Muted style={{ fontSize: 13 }}>{where}</Muted> : null}
          </InfoRow>
        </>
      ) : null}
      {photo ? <Image source={img(photo, 800, 450)} contentFit="cover" style={{ marginHorizontal: 16, marginBottom: 12, aspectRatio: 16 / 9, borderRadius: 12 }} /> : null}
      {networks.length ? (
        <>
          <Divider inset={50} />
          <InfoRow icon="tv">
            <Text style={{ fontSize: 14, marginBottom: 6 }}>Where to Watch</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {networks.map((n) => (
                <Text key={n} style={{ fontSize: 11, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', borderRadius: 3 }}>
                  {n}
                </Text>
              ))}
            </View>
          </InfoRow>
        </>
      ) : null}
      {gi.attendance ? (
        <>
          <Divider inset={50} />
          <InfoRow icon="person.3.fill">
            <Text style={{ fontSize: 14 }}>
              Attendance <Text style={{ fontSize: 14, color: colors.muted }}>{Number(gi.attendance).toLocaleString()}</Text>
            </Text>
          </InfoRow>
        </>
      ) : null}
      {officials.length ? (
        <>
          <Divider inset={50} />
          <InfoRow icon="flag.fill">
            <Text style={{ fontSize: 14 }}>Officials</Text>
            <Muted style={{ fontSize: 13 }}>{officials.join(', ')}</Muted>
          </InfoRow>
        </>
      ) : null}
    </Section>
  )
}
