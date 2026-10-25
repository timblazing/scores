/* eslint-disable @typescript-eslint/no-explicit-any */
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { teamLogo, type Game } from '@/lib/espn'
import { Card, Empty, Logo, Segmented } from '../ui'
import { periodLabel } from './sections'
import type { ChartPlay } from './WinChart'

type Any = any

/** Flatten ESPN plays (NBA: `plays`, NFL: `drives`) into a single chronological list. */
export function chartPlays(raw: Any): ChartPlay[] {
  const toPlay = (p: Any): ChartPlay => ({
    id: String(p.id),
    period: p.period?.number ?? 0,
    clock: p.clock?.displayValue ?? '',
    text: p.text ?? p.type?.text ?? '',
    awayScore: Number(p.awayScore ?? 0),
    homeScore: Number(p.homeScore ?? 0),
  })
  if (raw.plays?.length) return raw.plays.map(toPlay)
  const drives = [...(raw.drives?.previous ?? []), ...(raw.drives?.current ? [raw.drives.current] : [])]
  const seen = new Set<string>()
  return drives
    .flatMap((d: Any) => d.plays ?? [])
    .filter((p: Any) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .map(toPlay)
}

export function Plays({ raw, game }: { raw: Any; game: Game }) {
  if (raw.plays?.length) return <NbaPlays raw={raw} game={game} />
  if (raw.drives?.previous?.length || raw.drives?.current) return <NflDrives raw={raw} game={game} />
  return <Empty>Play-by-play will appear once the game starts.</Empty>
}

function NbaPlays({ raw, game }: { raw: Any; game: Game }) {
  const periods: number[] = useMemo(() => [...new Set<number>(raw.plays.map((p: Any) => p.period?.number))].filter(Boolean), [raw.plays])
  const [period, setPeriod] = useState<string>(String(periods[periods.length - 1] ?? 1))
  const [scoringOnly, setScoringOnly] = useState(false)
  const teamAbbr = (id?: string) => (id === game.home.id ? game.home.abbr : id === game.away.id ? game.away.abbr : undefined)

  const plays = raw.plays
    .filter((p: Any) => String(p.period?.number) === period && (!scoringOnly || p.scoringPlay))
    .slice()
    .reverse()

  return (
    <div className="space-y-3">
      <Segmented value={period} onChange={setPeriod} options={periods.map((p) => ({ value: String(p), label: periodLabel(game.league, p) }))} />
      <label className="flex items-center justify-end gap-2 px-1 text-[13px] text-muted">
        <input type="checkbox" checked={scoringOnly} onChange={(e) => setScoringOnly(e.target.checked)} className="accent-white" />
        Scoring plays only
      </label>
      <Card>
        <ul className="divide-y divide-line">
          {plays.map((p: Any) => {
            const abbr = teamAbbr(p.team?.id)
            return (
              <li key={p.id} className="flex items-start gap-3 px-4 py-2.5">
                <div className="w-11 shrink-0 pt-0.5 text-[12px] text-faint tnum">{p.clock?.displayValue}</div>
                <div className="w-5 shrink-0 pt-0.5">{abbr && <Logo src={teamLogo(game.league, abbr, 40, p.team?.id)} alt={abbr} size={18} />}</div>
                <div className={clsx('min-w-0 flex-1 text-[14px] leading-snug', p.scoringPlay ? 'font-medium' : 'text-muted')}>{p.text}</div>
                <div className={clsx('shrink-0 text-[13px] tnum', p.scoringPlay ? 'font-semibold' : 'text-faint')}>
                  {p.awayScore}-{p.homeScore}
                </div>
              </li>
            )
          })}
        </ul>
        {!plays.length && <p className="p-6 text-center text-sm text-muted">No plays.</p>}
      </Card>
    </div>
  )
}

function NflDrives({ raw, game }: { raw: Any; game: Game }) {
  const drives: Any[] = [...(raw.drives.previous ?? [])]
  const cur = raw.drives.current
  if (cur && !drives.some((d) => d.id === cur.id)) drives.push(cur)
  drives.reverse()
  const [open, setOpen] = useState<string | null>(drives[0]?.id ?? null)

  return (
    <Card>
      <ul className="divide-y divide-line">
        {drives.map((d) => {
          const isOpen = open === d.id
          const last = d.plays?.[d.plays.length - 1]
          return (
            <li key={d.id}>
              <button onClick={() => setOpen(isOpen ? null : d.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={isOpen}>
                <Logo src={teamLogo(game.league, d.team?.abbreviation, 48, d.team?.id)} alt={d.team?.abbreviation ?? ''} size={24} />
                <div className="min-w-0 flex-1">
                  <div className={clsx('text-[14px]', d.isScore ? 'font-semibold' : 'font-medium')}>{d.displayResult ?? d.result ?? 'In progress'}</div>
                  <div className="truncate text-[12px] text-muted">{d.description}</div>
                </div>
                {last && (
                  <span className="text-[13px] font-semibold tnum">
                    {last.awayScore}-{last.homeScore}
                  </span>
                )}
                <ChevronDown size={16} className={clsx('shrink-0 text-faint transition-transform', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <ol className="space-y-2.5 border-t border-line bg-bg/40 px-4 py-3">
                  {(d.plays ?? [])
                    .slice()
                    .reverse()
                    .map((p: Any) => (
                      <li key={p.id} className="text-[13px] leading-snug">
                        <div className="text-[11px] text-faint">
                          {[p.start?.downDistanceText, `${periodLabel(game.league, p.period?.number)} ${p.clock?.displayValue ?? ''}`].filter(Boolean).join(' · ')}
                        </div>
                        <div className={p.scoringPlay ? 'font-medium' : 'text-muted'}>{p.text}</div>
                      </li>
                    ))}
                </ol>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
