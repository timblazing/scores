import { useMemo, useState } from 'react'
import { View } from 'react-native'
import Svg, { ClipPath, Defs, Line, Path, Rect } from 'react-native-svg'
import type { Side } from '@/lib/espn'
import { readable } from '@/lib/format'
import { Logo, Segmented, Text } from '../ui'
import { colors } from '@/theme'

export interface ChartPlay {
  id: string
  period: number
  clock: string
  text: string
  awayScore: number
  homeScore: number
  downDistance?: string
}

interface Props {
  winprob: { homeWinPercentage: number; playId: string }[]
  plays: ChartPlay[]
  home: Side
  away: Side
  periodLabel: (p: number) => string
}

const H = 176
const PAD = 8

export function WinChart({ winprob, plays, home, away, periodLabel }: Props) {
  const hasProb = winprob.length > 1
  const [mode, setMode] = useState<'prob' | 'flow'>(hasProb ? 'prob' : 'flow')
  const [hover, setHover] = useState<number | null>(null)
  const [W, setW] = useState(0)

  const byId = useMemo(() => new Map(plays.map((p) => [p.id, p])), [plays])

  // Series value is the home team's share in [-1, 1]: win prob mapped, or score margin normalized.
  const series = useMemo(() => {
    // Away is plotted above the midline and home below, like ESPN.
    if (mode === 'prob') return winprob.map((w) => ({ v: 1 - w.homeWinPercentage * 2, raw: w.homeWinPercentage, play: byId.get(w.playId) }))
    const pts = plays.filter((p, i) => i === 0 || p.homeScore !== plays[i - 1].homeScore || p.awayScore !== plays[i - 1].awayScore)
    const max = Math.max(10, ...pts.map((p) => Math.abs(p.homeScore - p.awayScore)))
    return pts.map((p) => ({ v: (p.awayScore - p.homeScore) / max, raw: p.homeScore - p.awayScore, play: p }))
  }, [mode, winprob, plays, byId])

  if (series.length < 2) return null

  const x = (i: number) => (i / (series.length - 1)) * W
  const y = (v: number) => H / 2 - v * (H / 2 - PAD)
  const line = W ? series.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s.v).toFixed(1)}`).join('') : ''
  const area = `${line}L${W},${H / 2}L0,${H / 2}Z`

  const marks: { i: number; p: number }[] = []
  series.forEach((s, i) => {
    const p = s.play?.period
    if (p && (!marks.length || marks[marks.length - 1].p !== p)) marks.push({ i, p })
  })

  const last = series[series.length - 1]
  const cur = hover != null ? series[hover] : last
  const homeC = readable(home.color)
  const awayC = readable(away.color)

  const label = (s: (typeof series)[number], side: 'home' | 'away') => {
    if (mode === 'prob') {
      const p = side === 'home' ? s.raw : 1 - s.raw
      return `${(p * 100).toFixed(p > 0.995 || p < 0.005 ? 0 : 1)}%`
    }
    const m = side === 'home' ? s.raw : -s.raw
    return m > 0 ? `+${m}` : m === 0 ? 'Tied' : ''
  }

  const touch = (locationX: number) => {
    if (!W) return
    const i = Math.round((locationX / W) * (series.length - 1))
    setHover(Math.max(0, Math.min(series.length - 1, i)))
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
      {hasProb && (
        <View style={{ marginBottom: 14 }}>
          <Segmented
            value={mode}
            onChange={(m) => {
              setMode(m)
              setHover(null)
            }}
            options={[
              { value: 'prob', label: 'Win probability' },
              { value: 'flow', label: 'Game flow' },
            ]}
          />
        </View>
      )}
      <TeamLine side={away} value={label(cur, 'away')} color={awayC} />
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => touch(e.nativeEvent.locationX)}
        onResponderMove={(e) => touch(e.nativeEvent.locationX)}
        onResponderRelease={() => setHover(null)}
        onResponderTerminate={() => setHover(null)}
        style={{ height: H }}
      >
        {W > 0 && (
          <Svg width={W} height={H} pointerEvents="none">
            <Defs>
              <ClipPath id="top">
                <Rect x="0" y="0" width={W} height={H / 2} />
              </ClipPath>
              <ClipPath id="bot">
                <Rect x="0" y={H / 2} width={W} height={H / 2} />
              </ClipPath>
            </Defs>
            {marks.slice(1).map((m) => (
              <Line key={m.i} x1={x(m.i)} x2={x(m.i)} y1={0} y2={H} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
            ))}
            <Line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="rgba(255,255,255,0.18)" strokeDasharray="4 4" strokeWidth={1} />
            <Path d={area} fill={awayC} opacity={0.22} clipPath="url(#top)" />
            <Path d={area} fill={homeC} opacity={0.22} clipPath="url(#bot)" />
            <Path d={line} fill="none" stroke={awayC} strokeWidth={2} clipPath="url(#top)" />
            <Path d={line} fill="none" stroke={homeC} strokeWidth={2} clipPath="url(#bot)" />
            {hover != null && <Line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="rgba(255,255,255,0.5)" strokeWidth={1} />}
          </Svg>
        )}
      </View>
      <View style={{ height: 16, marginTop: 4 }}>
        {W > 0 &&
          marks.map((m) => (
            <Text key={m.i} style={{ position: 'absolute', left: Math.min(x(m.i), W - 24), fontSize: 11, color: colors.faint }}>
              {periodLabel(m.p)}
            </Text>
          ))}
      </View>
      <TeamLine side={home} value={label(cur, 'home')} color={homeC} />
      {cur.play ? (
        <View style={{ marginTop: 12, padding: 12, gap: 4, backgroundColor: colors.raised, borderRadius: 14, borderCurve: 'continuous' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700' }}>{cur.play.downDistance ?? (mode === 'prob' ? 'Win probability' : 'Game flow')}</Text>
              <Text style={{ fontSize: 12, color: colors.faint }}>
                {cur.play.clock} - {periodLabel(cur.play.period)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { s: away, v: cur.play.awayScore },
                { s: home, v: cur.play.homeScore },
              ].map(({ s, v }) => (
                <View key={s.id} style={{ alignItems: 'center', minWidth: 30 }}>
                  <Text tnum style={{ fontSize: 15, fontWeight: '800' }}>{v}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: colors.faint }}>{s.abbr}</Text>
                </View>
              ))}
            </View>
          </View>
          <Text style={{ fontSize: 13, lineHeight: 18, color: colors.muted }}>{cur.play.text}</Text>
        </View>
      ) : null}
    </View>
  )
}

/** "[logo] ARIZ ── 17.1%": the team, its line style, and its value at the scrubbed point. */
function TeamLine({ side, value, color }: { side: Side; value: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 }}>
      <Logo src={side.logo} size={20} />
      <Text style={{ fontSize: 13, fontWeight: '700' }}>{side.abbr}</Text>
      <View style={{ width: 16, height: 2, borderRadius: 1, backgroundColor: color }} />
      <View style={{ flex: 1 }} />
      <Text tnum style={{ fontSize: 18, fontWeight: '800' }}>
        {value || ' '}
      </Text>
    </View>
  )
}
