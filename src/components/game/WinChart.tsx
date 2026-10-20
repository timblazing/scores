import { useMemo, useState } from 'react'
import type { Side } from '@/lib/espn'
import { readable } from '@/lib/format'
import { Segmented } from '../ui'

export interface ChartPlay {
  id: string
  period: number
  clock: string
  text: string
  awayScore: number
  homeScore: number
}

interface Props {
  winprob: { homeWinPercentage: number; playId: string }[]
  plays: ChartPlay[]
  home: Side
  away: Side
  periodLabel: (p: number) => string
}

const W = 600
const H = 200
const PAD = 8

export function WinChart({ winprob, plays, home, away, periodLabel }: Props) {
  const hasProb = winprob.length > 1
  const [mode, setMode] = useState<'prob' | 'flow'>(hasProb ? 'prob' : 'flow')
  const [hover, setHover] = useState<number | null>(null)

  const byId = useMemo(() => new Map(plays.map((p) => [p.id, p])), [plays])

  // Series value is the home team's share in [-1, 1]: win prob mapped, or score margin normalized.
  const series = useMemo(() => {
    if (mode === 'prob')
      return winprob.map((w) => ({ v: w.homeWinPercentage * 2 - 1, raw: w.homeWinPercentage, play: byId.get(w.playId) }))
    const pts = plays.filter((p, i) => i === 0 || p.homeScore !== plays[i - 1].homeScore || p.awayScore !== plays[i - 1].awayScore)
    const max = Math.max(10, ...pts.map((p) => Math.abs(p.homeScore - p.awayScore)))
    return pts.map((p) => ({ v: (p.homeScore - p.awayScore) / max, raw: p.homeScore - p.awayScore, play: p, max }))
  }, [mode, winprob, plays, byId])

  if (series.length < 2) return null

  const x = (i: number) => (i / (series.length - 1)) * W
  const y = (v: number) => H / 2 - v * (H / 2 - PAD)
  const line = series.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s.v).toFixed(1)}`).join('')
  const area = `${line}L${W},${H / 2}L0,${H / 2}Z`

  // Period boundaries
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

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - r.left) / r.width) * (series.length - 1))
    setHover(Math.max(0, Math.min(series.length - 1, i)))
  }

  return (
    <div className="px-4 pb-4">
      {hasProb && (
        <Segmented
          className="mb-4"
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
      )}
      <div className="mb-3 flex items-end justify-between">
        <Stat side={away} value={label(cur, 'away')} color={awayC} />
        <div className="min-w-0 px-2 text-center text-[11px] text-faint">
          {cur.play ? `${periodLabel(cur.play.period)} · ${cur.play.clock}` : ''}
        </div>
        <Stat side={home} value={label(cur, 'home')} color={homeC} right />
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-44 w-full touch-none"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={mode === 'prob' ? 'Win probability chart' : 'Score margin chart'}
      >
        <defs>
          <clipPath id="top">
            <rect x="0" y="0" width={W} height={H / 2} />
          </clipPath>
          <clipPath id="bot">
            <rect x="0" y={H / 2} width={W} height={H / 2} />
          </clipPath>
        </defs>
        {marks.slice(1).map((m) => (
          <line key={m.i} x1={x(m.i)} x2={x(m.i)} y1={0} y2={H} stroke="rgb(255 255 255 / .08)" vectorEffect="non-scaling-stroke" />
        ))}
        <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="rgb(255 255 255 / .18)" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <path d={area} fill={homeC} opacity={0.22} clipPath="url(#top)" />
        <path d={area} fill={awayC} opacity={0.22} clipPath="url(#bot)" />
        <path d={line} fill="none" stroke={homeC} strokeWidth={2} clipPath="url(#top)" vectorEffect="non-scaling-stroke" />
        <path d={line} fill="none" stroke={awayC} strokeWidth={2} clipPath="url(#bot)" vectorEffect="non-scaling-stroke" />
        {hover != null && (
          <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="rgb(255 255 255 / .5)" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <div className="relative mt-1 h-4 text-[11px] text-faint">
        {marks.map((m) => (
          <span key={m.i} className="absolute" style={{ left: `${(m.i / (series.length - 1)) * 100}%` }}>
            {periodLabel(m.p)}
          </span>
        ))}
      </div>
      <p className="mt-3 min-h-10 text-[13px] leading-snug text-muted">
        {cur.play ? (
          <>
            <span className="mr-2 font-semibold text-fg tnum">
              {cur.play.awayScore}-{cur.play.homeScore}
            </span>
            {cur.play.text}
          </>
        ) : null}
      </p>
    </div>
  )
}

function Stat({ side, value, color, right }: { side: Side; value: string; color: string; right?: boolean }) {
  return (
    <div className={right ? 'text-right' : ''}>
      <div className="font-score text-[28px] leading-none font-semibold tnum">{value || ' '}</div>
      <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted" style={{ flexDirection: right ? 'row-reverse' : 'row' }}>
        <span className="h-0.5 w-3 rounded-full" style={{ background: color }} />
        {side.abbr}
      </div>
    </div>
  )
}
