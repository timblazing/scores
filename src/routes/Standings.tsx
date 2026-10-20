import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useState } from 'react'
import { Link } from 'react-router'
import { Card, ErrorState, Loading, Logo, PageHeader, Segmented } from '@/components/ui'
import { getStandings, type LeagueId, type StandingGroup } from '@/lib/espn'
import { useFavorites } from '@/lib/favorites'
import { useLeagueParam } from '@/lib/useLeague'

const COLS: Record<LeagueId, { key: string; label: string; wide?: boolean }[]> = {
  nfl: [
    { key: 'wins', label: 'W' },
    { key: 'losses', label: 'L' },
    { key: 'ties', label: 'T' },
    { key: 'winPercent', label: 'PCT' },
    { key: 'pointsFor', label: 'PF', wide: true },
    { key: 'pointsAgainst', label: 'PA', wide: true },
    { key: 'differential', label: 'DIFF', wide: true },
    { key: 'vs. Div.', label: 'DIV', wide: true },
    { key: 'streak', label: 'STRK' },
  ],
  nba: [
    { key: 'wins', label: 'W' },
    { key: 'losses', label: 'L' },
    { key: 'winPercent', label: 'PCT' },
    { key: 'gamesBehind', label: 'GB' },
    { key: 'Home', label: 'HOME', wide: true },
    { key: 'Road', label: 'AWAY', wide: true },
    { key: 'vs. Conf.', label: 'CONF', wide: true },
    { key: 'streak', label: 'STRK' },
  ],
}

export function StandingsPage() {
  const [league, setLeague] = useLeagueParam()
  const q = useQuery({ queryKey: ['standings', league], queryFn: () => getStandings(league), staleTime: 5 * 60_000 })
  const [conf, setConf] = useState(0)

  return (
    <div>
      <PageHeader title="Standings">
        <LeagueToggle league={league} onChange={(l) => (setLeague(l), setConf(0))} />
      </PageHeader>
      <div className="space-y-3 px-3 lg:px-0">
        {q.isPending && <Loading rows={6} />}
        {q.isError && <ErrorState error={q.error} retry={q.refetch} />}
        {q.data && (
          <>
            <Segmented value={String(conf)} onChange={(v) => setConf(Number(v))} options={q.data.map((c, i) => ({ value: String(i), label: c.short }))} />
            <Conference conf={q.data[conf]} league={league} />
          </>
        )}
      </div>
    </div>
  )
}

export function LeagueToggle({ league, onChange }: { league: LeagueId; onChange: (l: LeagueId) => void }) {
  return (
    <Segmented
      className="w-32"
      value={league}
      onChange={onChange}
      options={[
        { value: 'nfl', label: 'NFL' },
        { value: 'nba', label: 'NBA' },
      ]}
    />
  )
}

function Conference({ conf, league }: { conf?: StandingGroup; league: LeagueId }) {
  const { isFav } = useFavorites()
  if (!conf) return null
  const cols = COLS[league]
  return (
    <>
      {conf.groups.map((g) => (
        <Card key={g.name} title={conf.groups.length > 1 ? g.name : undefined}>
          <div className="no-scrollbar overflow-x-auto pb-2">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-[11px] text-faint">
                  <th className="py-2 pl-4 text-left font-normal">Team</th>
                  {cols.map((c) => (
                    <th key={c.key} className={clsx('px-2 py-2 font-normal last:pr-4', c.wide && 'hidden sm:table-cell')}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r, i) => {
                  const showLine = league === 'nba' && i === 6 // play-in cutoff after 6th seed
                  return (
                    <tr key={r.team.id} className={clsx('border-t', showLine ? 'border-line-strong border-dashed' : 'border-line')}>
                      <td className="py-2 pl-4">
                        <Link to={`/${league}/team/${r.team.id}`} className="flex items-center gap-2.5">
                          <span className="w-4 text-right text-[12px] text-faint tnum">{i + 1}</span>
                          <Logo src={r.team.logo} alt="" size={22} />
                          <span className="font-medium">
                            <span className="sm:hidden">{r.team.abbr}</span>
                            <span className="hidden sm:inline">{r.team.name}</span>
                          </span>
                          {isFav(league, r.team.id) && <span className="text-[10px]">★</span>}
                          {r.stats.clincher && <span className="text-[11px] text-faint">{r.stats.clincher}</span>}
                        </Link>
                      </td>
                      {cols.map((c) => (
                        <td key={c.key} className={clsx('px-2 py-2 text-center text-muted tnum last:pr-4', c.wide && 'hidden sm:table-cell', c.key === 'winPercent' && 'text-fg')}>
                          {r.stats[c.key] ?? '-'}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </>
  )
}
