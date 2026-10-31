// ESPN Gamecast-style football field: a perspective field with team end zones, a logo pin on the ball,
// the drive so far, the first-down line, and the last play drawn as an animated arc.
import { useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated'
import Svg, { Defs, Ellipse, Line, LinearGradient, Path, Polygon, Rect, Stop, Text as SvgText } from 'react-native-svg'
import type { Game, Side } from '@/lib/espn'
import { readable } from '@/lib/format'
import { Logo } from '../ui'
import { colors } from '@/theme'
import { playKind, spotX, type LiveDrive } from './football'

const AnimatedLine = Animated.createAnimatedComponent(Line)
const AnimatedPath = Animated.createAnimatedComponent(Path)
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse)

const TOP = 26 // room above the field for the pin and goal posts
const FIELD_H = 88
const BOTTOM = 22 // yard labels
const TAPER = 0.075 // the far sideline is this share of the width narrower on each side
const BALL_T = 0.56 // the ball sits a little below the middle of the field
const PIN = 36
const YELLOW = '#f5c518'
const LOS = '#5aa9ff'

/** Screen x of a yard position (−10…110, end zones included) at depth t (0 = far sideline, 1 = near). */
const px = (x: number, t: number, W: number) => {
  'worklet'
  const inset = W * TAPER * (1 - t)
  return inset + ((x + 10) / 120) * (W - 2 * inset)
}
const py = (t: number) => TOP + t * FIELD_H

const ease = { duration: 850, easing: Easing.out(Easing.cubic) }

export function Field({ game, drive }: { game: Game; drive: LiveDrive }) {
  const [W, setW] = useState(0)
  return (
    <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))} style={{ height: TOP + FIELD_H + BOTTOM }}>
      {W > 0 && <FieldCanvas W={W} game={game} drive={drive} />}
    </View>
  )
}

function FieldCanvas({ W, game, drive }: { W: number; game: Game; drive: LiveDrive }) {
  const H = TOP + FIELD_H + BOTTOM
  const ym = py(BALL_T)
  const ball = drive.ball ?? 50
  const start = drive.start ?? ball
  const last = drive.last

  // Shared values animate the ball, the drive line and the first-down marker between updates.
  const ballX = useSharedValue(start)
  const startX = useSharedValue(start)
  const fdX = useSharedValue(drive.firstDown ?? ball)
  const fdOn = useSharedValue(drive.firstDown != null ? 1 : 0)
  const hop = useSharedValue(0)
  const draw = useSharedValue(0)

  useEffect(() => {
    ballX.value = withDelay(250, withTiming(ball, ease))
    startX.value = withTiming(start, ease)
    if (drive.firstDown != null) fdX.value = withTiming(drive.firstDown, ease)
    fdOn.value = withTiming(drive.firstDown != null ? 1 : 0, { duration: 300 })
    hop.value = withDelay(150, withSequence(withTiming(-9, { duration: 200 }), withSpring(0, { damping: 7, stiffness: 180 })))
    draw.value = 0
    draw.value = withDelay(200, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) }))
  }, [ball, start, drive.firstDown, last?.id, ballX, startX, fdX, fdOn, hop, draw])

  // The last play's path: an arc for passes and kicks, a straight line for runs.
  const arc = useMemo(() => {
    if (!last) return undefined
    const kind = playKind(last)
    const s = spotX(last.start?.possessionText, game, last.start?.yardLine)
    const e = spotX(last.end?.possessionText, game, last.end?.yardLine)
    if (s == null || e == null || Math.abs(e - s) < 1 || kind === 'other') return undefined
    const x1 = px(s, BALL_T, W)
    const x2 = px(e, BALL_T, W)
    const lift = kind === 'pass' ? 30 : kind === 'kick' ? 44 : 0
    const y = ym - 3
    const d = lift ? `M${x1},${y} Q${(x1 + x2) / 2},${y - lift * 2} ${x2},${y}` : `M${x1},${y} L${x2},${y}`
    // Approximate length for the draw-on dash animation.
    let len = 0
    let prev = [x1, y]
    for (let i = 1; i <= 24; i++) {
      const t = i / 24
      const cx = (x1 + x2) / 2
      const cy = y - lift * 2
      const qx = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * cx + t * t * x2
      const qy = (1 - t) ** 2 * y + 2 * (1 - t) * t * cy + t * t * y
      len += Math.hypot(qx - prev[0], qy - prev[1])
      prev = [qx, qy]
    }
    return { d, len: Math.ceil(len), x2, y }
  }, [last, game, W, ym])

  const driveLine = useAnimatedProps(() => ({ x1: px(startX.value, BALL_T, W), x2: px(ballX.value, BALL_T, W) }))
  const losLine = useAnimatedProps(() => ({ x1: px(ballX.value, 0, W), x2: px(ballX.value, 1, W) }))
  const fdLine = useAnimatedProps(() => ({ x1: px(fdX.value, 0, W), x2: px(fdX.value, 1, W), opacity: fdOn.value }))
  const ballDot = useAnimatedProps(() => ({ cx: px(ballX.value, BALL_T, W) }))
  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: (arc?.len ?? 0) * (1 - draw.value) }))
  const pinStyle = useAnimatedStyle(() => ({ transform: [{ translateX: px(ballX.value, BALL_T, W) - PIN / 2 }, { translateY: hop.value }] }))

  const zone = (from: number, to: number) => {
    const a = [px(from, 0, W), py(0)]
    const b = [px(to, 0, W), py(0)]
    const c = [px(to, 1, W), py(1)]
    const d = [px(from, 1, W), py(1)]
    return [a, b, c, d].map((p) => p.join(',')).join(' ')
  }
  const yardLine = (x: number, key: string, opacity: number) => <Line key={key} x1={px(x, 0, W)} y1={py(0)} x2={px(x, 1, W)} y2={py(1)} stroke="#fff" strokeOpacity={opacity} strokeWidth={1} />

  return (
    <>
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="depth" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#000" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {/* turf: alternating 10-yard bands */}
        {Array.from({ length: 10 }, (_, i) => (
          <Polygon key={i} points={zone(i * 10, i * 10 + 10)} fill={i % 2 ? '#333336' : '#2b2b2e'} />
        ))}
        <EndZone points={zone(-10, 0)} side={game.away} cx={(px(-5, 0, W) + px(-5, 1, W)) / 2} cy={py(0.5)} rotate={-90} width={px(0, BALL_T, W) - px(-10, BALL_T, W)} />
        <EndZone points={zone(100, 110)} side={game.home} cx={(px(105, 0, W) + px(105, 1, W)) / 2} cy={py(0.5)} rotate={90} width={px(110, BALL_T, W) - px(100, BALL_T, W)} />
        <Polygon points={zone(-10, 110)} fill="url(#depth)" />
        {Array.from({ length: 11 }, (_, i) => yardLine(i * 10, `l${i}`, i === 0 || i === 10 ? 0.55 : i === 5 ? 0.32 : 0.16))}
        {/* hash marks */}
        {Array.from({ length: 19 }, (_, i) => (i + 1) * 5)
          .filter((x) => x % 10)
          .map((x) =>
            [0.36, 0.64].map((t) => <Line key={`h${x}${t}`} x1={px(x, t - 0.03, W)} y1={py(t - 0.03)} x2={px(x, t + 0.03, W)} y2={py(t + 0.03)} stroke="#fff" strokeOpacity={0.12} strokeWidth={1} />),
          )}
        <GoalPost x={px(-10, 0, W) + 4} />
        <GoalPost x={px(110, 0, W) - 4} />

        {/* line of scrimmage, first-down line, the drive so far and the last play */}
        <AnimatedLine animatedProps={losLine} y1={py(0)} y2={py(1)} stroke={LOS} strokeWidth={2} strokeOpacity={0.85} />
        <AnimatedLine animatedProps={fdLine} y1={py(0)} y2={py(1)} stroke={YELLOW} strokeWidth={2.5} />
        {drive.start != null && <AnimatedLine animatedProps={driveLine} y1={ym} y2={ym} stroke="#fff" strokeOpacity={0.55} strokeWidth={4} strokeLinecap="round" />}
        {arc && <AnimatedPath d={arc.d} animatedProps={arcProps} stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" strokeDasharray={`${arc.len} ${arc.len}`} />}
        <AnimatedEllipse animatedProps={ballDot} cy={ym} rx={5.5} ry={3.6} fill="#8a4b22" stroke="#fff" strokeWidth={1} />

        {/* yard numbers along the near sideline */}
        {[
          { x: -5, label: game.away.abbr },
          { x: 20, label: '20' },
          { x: 50, label: '50' },
          { x: 80, label: '20' },
          { x: 105, label: game.home.abbr },
        ].map((l) => (
          <SvgText key={l.x} x={px(l.x, 1, W)} y={py(1) + 15} fill={colors.muted} fontSize={11} fontWeight="600" textAnchor="middle">
            {l.label}
          </SvgText>
        ))}
      </Svg>
      {drive.team && (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: ym - PIN - 12 }, pinStyle]}>
          <Pin side={drive.team} />
        </Animated.View>
      )}
    </>
  )
}

function EndZone({ points, side, cx, cy, rotate, width }: { points: string; side: Side; cx: number; cy: number; rotate: number; width: number }) {
  const label = side.name.toUpperCase()
  const size = Math.min(13, width * 0.55, (FIELD_H - 14) / (label.length * 0.72))
  return (
    <>
      <Polygon points={points} fill={readable(side.color)} />
      <SvgText x={cx} y={cy + size * 0.35} fill="#fff" fontSize={size} fontWeight="800" letterSpacing={1} textAnchor="middle" transform={`rotate(${rotate}, ${cx}, ${cy})`}>
        {label}
      </SvgText>
    </>
  )
}

function GoalPost({ x }: { x: number }) {
  const base = py(0) + 6
  const bar = py(0) - 7
  return (
    <>
      <Line x1={x} y1={base} x2={x} y2={bar} stroke={YELLOW} strokeWidth={2} />
      <Line x1={x - 6} y1={bar} x2={x + 6} y2={bar} stroke={YELLOW} strokeWidth={2} />
      <Line x1={x - 6} y1={bar} x2={x - 6} y2={bar - 15} stroke={YELLOW} strokeWidth={2} />
      <Line x1={x + 6} y1={bar} x2={x + 6} y2={bar - 15} stroke={YELLOW} strokeWidth={2} />
    </>
  )
}

/** Map-pin marker with the team logo, its tip on the ball. */
function Pin({ side }: { side: Side }) {
  return (
    <View style={{ width: PIN, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
      <View style={{ width: PIN, height: PIN, borderRadius: PIN / 2, borderWidth: 2.5, borderColor: '#fff', backgroundColor: '#1c1c1e', alignItems: 'center', justifyContent: 'center' }}>
        <Logo src={side.logo} size={PIN - 12} />
      </View>
      <View style={{ width: 0, height: 0, marginTop: -1, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#fff' }} />
    </View>
  )
}

/* ---------- header bar ---------- */

/** The thin yard-line strip under the score: ticks, a triangle on the ball pointing the way the offense is going, and the first-down line. */
export function MiniField({ drive, game }: { drive: LiveDrive; game: Game }) {
  const [W, setW] = useState(0)
  return (
    <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))} style={{ height: 26 }}>
      {W > 0 && <MiniCanvas W={W} drive={drive} game={game} />}
    </View>
  )
}

const mx = (x: number, W: number) => {
  'worklet'
  return ((x + 10) / 120) * W
}

function MiniCanvas({ W, drive, game }: { W: number; drive: LiveDrive; game: Game }) {
  const ball = drive.ball ?? 50
  const ballX = useSharedValue(ball)
  const fdX = useSharedValue(drive.firstDown ?? ball)
  const fdOn = useSharedValue(drive.firstDown != null ? 1 : 0)
  useEffect(() => {
    ballX.value = withTiming(ball, ease)
    if (drive.firstDown != null) fdX.value = withTiming(drive.firstDown, ease)
    fdOn.value = withTiming(drive.firstDown != null ? 1 : 0, { duration: 300 })
  }, [ball, drive.firstDown, ballX, fdX, fdOn])
  const marker = useAnimatedStyle(() => ({ transform: [{ translateX: mx(ballX.value, W) - 6 }] }))
  const fd = useAnimatedStyle(() => ({ opacity: fdOn.value, transform: [{ translateX: mx(fdX.value, W) - 1 }] }))
  const base = 11
  return (
    <>
      <Svg width={W} height={26}>
        <Rect x={0} y={base - 6} width={mx(0, W)} height={6} fill={readable(game.away.color)} opacity={0.5} />
        <Rect x={mx(100, W)} y={base - 6} width={W - mx(100, W)} height={6} fill={readable(game.home.color)} opacity={0.5} />
        <Line x1={0} x2={W} y1={base} y2={base} stroke="#fff" strokeOpacity={0.35} strokeWidth={1} />
        {Array.from({ length: 21 }, (_, i) => i * 5).map((x) => (
          <Line key={x} x1={mx(x, W)} x2={mx(x, W)} y1={base} y2={base - (x % 10 ? 3 : 6)} stroke="#fff" strokeOpacity={x % 10 ? 0.25 : 0.45} strokeWidth={1} />
        ))}
        {[20, 50, 80].map((x) => (
          <SvgText key={x} x={mx(x, W)} y={24} fill="rgba(245,245,245,0.55)" fontSize={10} fontWeight="600" textAnchor="middle">
            {x === 80 ? '20' : String(x)}
          </SvgText>
        ))}
      </Svg>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: base - 13, left: 0, width: 2, height: 14, backgroundColor: YELLOW, borderRadius: 1 }, fd]} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: base - 12, left: 0 }, marker]}>
        <Svg width={12} height={12}>
          <Path d={drive.dir === 1 ? 'M2,1 L11,6 L2,11 Z' : 'M10,1 L1,6 L10,11 Z'} fill="#fff" />
        </Svg>
      </Animated.View>
    </>
  )
}
