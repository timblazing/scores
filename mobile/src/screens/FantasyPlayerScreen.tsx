// A fantasy player, opened from a lineup: this week's sportsbook lines, dynasty value, outlook and usage.
// Every section hides itself when its source has nothing (no key, no lines posted, player not ranked).
import { Stack, useLocalSearchParams } from 'expo-router'
import { ScrollView, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { BOOK_COLORS, RosterAuditCredit } from '@/components/fantasy'
import { StatTable, type TableRow } from '@/components/StatTable'
import { Card, Divider, Headshot, Loading, Muted, Text } from '@/components/ui'
import { american, BOOKS, linesFor, STATS, type PlayerLines } from '@/lib/propline'
import { isSuperflex, type PlayerValue, type RaPlayerPage } from '@/lib/rosteraudit'
import { useFantasyLeague, useFantasyPlayer, useNflState, useNflWeekGames, usePlayerValues, useRaPlayerPage, useSlateLines } from '@/lib/useFantasy'
import { colors } from '@/theme'

const signed = (n: number) => (n > 0 ? `+${n.toLocaleString()}` : n < 0 ? `−${Math.abs(n).toLocaleString()}` : '0')

export default function FantasyPlayerScreen() {
  const { id, league: leagueId } = useLocalSearchParams<{ id: string; league?: string }>()
  const player = useFantasyPlayer(id)
  const league = useFantasyLeague(leagueId ?? '')
  const state = useNflState()
  const games = useNflWeekGames(state.data?.season, Number(state.data?.week) || 1)
  const slate = useSlateLines()
  const values = usePlayerValues(league.data)
  const page = useRaPlayerPage(id)
  const sf = league.data ? isSuperflex(league.data.rosterPositions) : true

  const p = player.data
  const game = p?.team ? games.byTeam.get(p.team) : undefined
  const lines = game?.state === 'pre' ? linesFor(slate.data, p?.name, [game.home.id, game.away.id]) : undefined
  const photo = page.data?.photo ?? `https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 120, gap: 12 }}>
      <Stack.Screen options={{ title: p?.name ?? '' }} />
      {player.isPending && <Loading />}
      {p && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 4 }}>
          <Headshot src={photo} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '700' }} numberOfLines={1}>
              {p.name}
            </Text>
            <Muted style={{ fontSize: 14 }}>
              {[p.position, p.team ?? 'FA', page.data?.age && `Age ${page.data.age.toFixed(1)}`, p.injury].filter(Boolean).join(' · ')}
            </Muted>
          </View>
        </View>
      )}
      {lines && <LinesCard lines={lines} />}
      {page.data ? <ValueCard page={page.data} sf={sf} /> : values.data?.get(id) ? <BasicValueCard v={values.data.get(id)!} /> : null}
      {page.data && <OutlookCard page={page.data} sf={sf} />}
      {page.data && <UsageCard page={page.data} />}
    </ScrollView>
  )
}

/** Main yardage lines per book, plus the anytime-TD price. Books and rows without a line are left out. */
function LinesCard({ lines }: { lines: PlayerLines }) {
  const rows = [
    ...STATS.filter((s) => lines.yards[s.key]).map((s) => ({ label: s.label, by: lines.yards[s.key]!, fmt: (n: number) => String(n) })),
    ...(Object.keys(lines.td).length ? [{ label: 'Anytime TD', by: lines.td, fmt: american }] : []),
  ]
  const books = BOOKS.filter((b) => rows.some((r) => r.by[b.key] != null))
  if (!rows.length || !books.length) return null
  const table: TableRow[] = rows.map((r) => ({ key: r.label, left: <Text style={{ fontSize: 14 }}>{r.label}</Text>, cells: books.map((b) => (r.by[b.key] != null ? r.fmt(r.by[b.key]!) : '–')) }))
  return (
    <Card title="This week’s lines">
      <StatTable
        headLeft=""
        headers={books.map((b) => b.short)}
        rows={table}
        leftWidth={130}
        minCol={60}
      />
      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
        {books.map((b) => (
          <Muted key={b.key} style={{ fontSize: 11, color: colors.faint }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: BOOK_COLORS[b.key] }}>{b.short}</Text> {b.name}
          </Muted>
        ))}
      </View>
    </Card>
  )
}

function Badges({ buyLow, sellHigh, breakout }: { buyLow: boolean; sellHigh: boolean; breakout: boolean }) {
  const list = [buyLow && { t: 'Buy low', c: colors.win }, sellHigh && { t: 'Sell high', c: colors.live }, breakout && { t: 'Breakout', c: colors.warn }].filter(Boolean) as { t: string; c: string }[]
  if (!list.length) return null
  return (
    <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 12 }}>
      {list.map((b) => (
        <View key={b.t} style={{ borderRadius: 6, borderWidth: 1, borderColor: b.c, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: b.c }}>{b.t}</Text>
        </View>
      ))}
    </View>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Muted style={{ fontSize: 12 }}>{label}</Muted>
      <Text tnum style={{ fontSize: 17, fontWeight: '600', color }}>
        {value}
      </Text>
    </View>
  )
}

const trendColor = (n: number) => (n > 0 ? colors.win : n < 0 ? colors.live : colors.fg)

/** Keyless fallback: the value row from RosterAudit's rankings. */
function BasicValueCard({ v }: { v: PlayerValue }) {
  return (
    <Card title="Dynasty value">
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12 }}>
        <Stat label="Value" value={v.value.toLocaleString()} />
        <Stat label="Rank" value={`#${v.rankOverall}`} />
        <Stat label="7 days" value={signed(v.trend7d)} color={trendColor(v.trend7d)} />
        <Stat label="30 days" value={signed(v.trend30d)} color={trendColor(v.trend30d)} />
      </View>
      <Badges {...v} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <RosterAuditCredit />
      </View>
    </Card>
  )
}

function ValueCard({ page, sf }: { page: RaPlayerPage; sf: boolean }) {
  const v = page.value
  const value = sf ? v.sf : v.oneQb
  const rank = sf ? v.rankSf : v.rank1qb
  const posRank = sf ? v.rankPosSf : v.rankPos1qb
  const history = page.history.map((h) => (sf ? h.sf : h.oneQb)).filter((n) => n > 0)
  if (!value) return null
  return (
    <Card title="Dynasty value" action={<Muted style={{ fontSize: 13 }}>{[sf ? 'Superflex' : '1QB', v.tierLabel].filter(Boolean).join(' · ')}</Muted>}>
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12 }}>
        <Stat label="Value" value={value.toLocaleString()} />
        {rank ? <Stat label="Overall" value={`#${rank}`} /> : null}
        {posRank ? <Stat label="Position" value={`#${posRank}`} /> : null}
      </View>
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12 }}>
        <Stat label="7 days" value={signed(v.trend7d)} color={trendColor(v.trend7d)} />
        <Stat label="30 days" value={signed(v.trend30d)} color={trendColor(v.trend30d)} />
        <Stat label="90 days" value={signed(v.trend90d)} color={trendColor(v.trend90d)} />
      </View>
      <Badges {...v} />
      {history.length > 2 && <Sparkline points={history} />}
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <RosterAuditCredit prefix={history.length > 2 ? `Value over the last ${history.length} weeks. ` : ''} />
      </View>
    </Card>
  )
}

function Sparkline({ points, height = 56 }: { points: number[]; height?: number }) {
  const width = 320
  const lo = Math.min(...points)
  const hi = Math.max(...points)
  const span = hi - lo || 1
  const d = points.map((n, i) => `${i ? 'L' : 'M'}${((i / (points.length - 1)) * width).toFixed(1)},${(height - 4 - ((n - lo) / span) * (height - 8)).toFixed(1)}`).join(' ')
  const up = points[points.length - 1] >= points[0]
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Path d={d} stroke={up ? colors.win : colors.live} strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke" />
      </Svg>
    </View>
  )
}

function OutlookCard({ page, sf }: { page: RaPlayerPage; sf: boolean }) {
  const o = page.outcome
  const summary = (sf ? page.outlook : page.outlook1qb) ?? page.outlook
  const years = page.years.filter((y) => (sf ? y.sf : y.oneQb))
  if (!o && !summary && !page.ppgPpr && !years.length) return null
  return (
    <Card title="Outlook">
      {page.ppgPpr || page.ppgHalf ? (
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12 }}>
          {page.ppgPpr ? <Stat label="PPG (PPR)" value={page.ppgPpr.toFixed(1)} /> : null}
          {page.ppgHalf ? <Stat label="Half" value={page.ppgHalf.toFixed(1)} /> : null}
          {page.ppgStd ? <Stat label="Standard" value={page.ppgStd.toFixed(1)} /> : null}
        </View>
      ) : null}
      {o && (
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12 }}>
          <Stat label="Floor" value={o.p10.finish ?? '–'} />
          <Stat label="Median" value={o.p50.finish ?? '–'} />
          <Stat label="Ceiling" value={o.p90.finish ?? '–'} />
          {o.breakoutPct != null ? <Stat label="Breakout" value={`${Math.round(o.breakoutPct)}%`} /> : null}
          {o.bustPct != null ? <Stat label="Bust" value={`${Math.round(o.bustPct)}%`} /> : null}
        </View>
      )}
      {summary ? <Text style={{ fontSize: 14, lineHeight: 20, paddingHorizontal: 16, paddingBottom: 12, color: colors.muted }}>{summary}</Text> : null}
      {page.cliff?.summary ? (
        <Text style={{ fontSize: 13, lineHeight: 18, paddingHorizontal: 16, paddingBottom: 12, color: colors.warn }}>
          Age cliff ({page.cliff.level}): {page.cliff.summary}
        </Text>
      ) : null}
      {years.length > 0 && (
        <>
          <Divider />
          <StatTable
            headLeft="Year"
            headers={['Value', 'Conf.']}
            rows={years.map((y) => ({ key: String(y.year), left: <Text tnum style={{ fontSize: 14 }}>{y.year}</Text>, cells: [(sf ? y.sf : y.oneQb!).toLocaleString(), y.confidence ?? ''] }))}
            leftWidth={90}
            minCol={70}
          />
        </>
      )}
    </Card>
  )
}

function UsageCard({ page }: { page: RaPlayerPage }) {
  const weeks = page.weekly.filter((w) => w.snapPct != null || w.targets != null || w.carries != null).slice(0, 8)
  if (!weeks.length) return null
  const has = (k: 'snapPct' | 'targets' | 'carries' | 'rzTouches') => weeks.some((w) => w[k])
  const cols = [
    has('snapPct') && { h: 'SNAP', f: (w: (typeof weeks)[number]) => (w.snapPct != null ? `${w.snapPct}%` : '–') },
    has('targets') && { h: 'TGT', f: (w: (typeof weeks)[number]) => String(w.targets ?? '–') },
    has('carries') && { h: 'CAR', f: (w: (typeof weeks)[number]) => String(w.carries ?? '–') },
    has('rzTouches') && { h: 'RZ', f: (w: (typeof weeks)[number]) => String(w.rzTouches ?? '–') },
  ].filter(Boolean) as { h: string; f: (w: (typeof weeks)[number]) => string }[]
  return (
    <Card title="Usage">
      <StatTable
        headLeft="Week"
        headers={cols.map((c) => c.h)}
        rows={weeks.map((w) => ({ key: String(w.week), left: <Text tnum style={{ fontSize: 14 }}>{[`Wk ${w.week}`, w.opp].filter(Boolean).join(' ')}</Text>, cells: cols.map((c) => c.f(w)) }))}
        leftWidth={110}
        minCol={52}
      />
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <RosterAuditCredit prefix="RZ red-zone targets + carries. " />
      </View>
    </Card>
  )
}
