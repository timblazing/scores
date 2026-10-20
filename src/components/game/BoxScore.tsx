/* eslint-disable @typescript-eslint/no-explicit-any */
import clsx from 'clsx'
import { useState } from 'react'
import { Link } from 'react-router'
import type { Game } from '@/lib/espn'
import { Card, Empty, Logo, Segmented } from '../ui'

type Any = any

const GROUP_TITLES: Record<string, string> = {
  passing: 'Passing',
  rushing: 'Rushing',
  receiving: 'Receiving',
  fumbles: 'Fumbles',
  defensive: 'Defense',
  interceptions: 'Interceptions',
  kickReturns: 'Kick returns',
  puntReturns: 'Punt returns',
  kicking: 'Kicking',
  punting: 'Punting',
}

export function BoxScore({ raw, game }: { raw: Any; game: Game }) {
  const [side, setSide] = useState<'away' | 'home'>('away')
  const players: Any[] = raw.boxscore?.players ?? []
  const s = side === 'away' ? game.away : game.home
  const team = players.find((p) => String(p.team?.id) === s.id)
  if (!players.length) return <Empty>Box score will appear once the game starts.</Empty>

  return (
    <div className="space-y-3">
      <Segmented
        value={side}
        onChange={setSide}
        options={[game.away, game.home].map((t, i) => ({
          value: (i ? 'home' : 'away') as 'home' | 'away',
          label: (
            <>
              <Logo src={t.logo} alt="" size={18} />
              {t.name}
            </>
          ),
        }))}
      />
      {(team?.statistics ?? [])
        .filter((g: Any) => g.athletes?.length)
        .map((g: Any, i: number) => (
          <StatTable key={g.name ?? i} group={g} league={game.league} title={GROUP_TITLES[g.name] ?? (game.league === 'nba' ? undefined : g.name)} />
        ))}
    </div>
  )
}

function StatTable({ group, league, title }: { group: Any; league: string; title?: string }) {
  const labels: string[] = group.labels ?? group.names ?? []
  const athletes: Any[] = group.athletes ?? []
  const isNba = league === 'nba'
  const starters = isNba ? athletes.filter((a) => a.starter) : athletes
  const bench = isNba ? athletes.filter((a) => !a.starter) : []

  const rows = (list: Any[]) =>
    list.map((a) => (
      <tr key={a.athlete?.id} className="border-t border-line">
        <td className="sticky left-0 z-10 max-w-[150px] bg-surface py-2 pr-2 pl-4">
          <Link to={`/${league}/player/${a.athlete?.id}`} className="block truncate">
            <span className="font-medium">{a.athlete?.shortName ?? a.athlete?.displayName}</span>
            <span className="ml-1.5 text-[11px] text-faint">{a.athlete?.position?.abbreviation ?? (a.athlete?.jersey ? `#${a.athlete.jersey}` : '')}</span>
          </Link>
        </td>
        {a.didNotPlay || !a.stats?.length ? (
          <td colSpan={labels.length} className="py-2 pr-4 text-left text-[12px] text-faint">
            {a.reason ? titleCase(a.reason) : 'Did not play'}
          </td>
        ) : (
          a.stats.map((v: string, i: number) => (
            <td key={i} className={clsx('px-2 py-2 text-center tnum', i === labels.length - 1 && 'pr-4', labels[i] === 'PTS' && 'font-semibold')}>
              {v}
            </td>
          ))
        )}
      </tr>
    ))

  return (
    <Card title={title}>
      <div className="no-scrollbar overflow-x-auto pb-2">
        <table className="w-full min-w-max text-[13px]">
          <thead>
            <tr className="text-[11px] text-faint">
              <th className="sticky left-0 z-10 bg-surface py-1.5 pl-4 text-left font-normal">{isNba ? 'Starters' : ''}</th>
              {labels.map((l) => (
                <th key={l} className="px-2 py-1.5 font-normal last:pr-4">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows(starters)}
            {bench.length > 0 && (
              <tr className="border-t border-line text-[11px] text-faint">
                <td className="sticky left-0 bg-surface pt-3 pb-1 pl-4" colSpan={1}>
                  Bench
                </td>
                <td colSpan={labels.length} />
              </tr>
            )}
            {rows(bench)}
            {group.totals?.some(Boolean) && (
              <tr className="border-t border-line-strong font-semibold">
                <td className="sticky left-0 bg-surface py-2 pl-4">Team</td>
                {group.totals.map((v: string, i: number) => (
                  <td key={i} className="px-2 py-2 text-center tnum last:pr-4">
                    {v}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())
