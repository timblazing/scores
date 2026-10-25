/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Back } from '@/components/Layout'
import { Card, Empty, ErrorState, Loading, Logo, Tabs, Watermark } from '@/components/ui'
import { getAthlete, getAthleteGamelog, getAthleteOverview, headshot, teamLogo, type LeagueId } from '@/lib/espn'
import { ago, readable } from '@/lib/format'

type Any = any
type Tab = 'overview' | 'log' | 'news'

export function PlayerPage() {
  const { league, id } = useParams() as { league: LeagueId; id: string }
  const athlete = useQuery({ queryKey: ['athlete', league, id], queryFn: () => getAthlete(league, id), staleTime: 10 * 60_000 })
  const overview = useQuery({ queryKey: ['athlete-ov', league, id], queryFn: () => getAthleteOverview(league, id), staleTime: 5 * 60_000 })
  const [tab, setTab] = useState<Tab>('overview')

  if (athlete.isPending) return <div className="p-4 lg:px-0"><Loading /></div>
  if (athlete.isError) return <div className="p-4 lg:px-0"><ErrorState error={athlete.error} retry={athlete.refetch} /></div>

  const a = athlete.data
  const color = readable(a.team?.color ? `#${a.team.color}` : '#333333')
  const bio = [
    ['Height/weight', [a.displayHeight, a.displayWeight].filter(Boolean).join(', ')],
    ['Born', a.displayDOB ? `${a.displayDOB}${a.age ? ` (${a.age})` : ''}` : undefined],
    ['College', a.college?.name],
    ['Draft', a.displayDraft],
    ['Experience', a.displayExperience],
  ].filter(([, v]) => v)
  const injury = a.injuries?.[0]

  return (
    <div>
      <header className="relative overflow-hidden pt-safe lg:mt-4 lg:rounded-card" style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${color} 60%, black) 0%, #000 90%)` }}>
        <Watermark src={a.team && teamLogo(league, a.team.abbreviation, 400, a.team.id)} />
        <div className="relative flex items-center px-3 pt-3">
          <Back />
        </div>
        <div className="relative flex items-end gap-2 px-4">
          <img src={headshot(league, id, 180)} alt={a.displayName} className="h-40 w-auto shrink-0 object-contain sm:h-48" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
          <div className="min-w-0 pb-5">
            <div className="text-[15px] leading-tight text-fg/80">{a.firstName}</div>
            <h1 className="text-[28px] leading-none font-bold tracking-tight">{a.lastName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] text-fg/70">
              {a.team && (
                <Link to={`/${league}/team/${a.team.id}`} className="flex items-center gap-1.5 font-medium text-fg">
                  <Logo src={teamLogo(league, a.team.abbreviation, 40, a.team.id)} alt="" size={18} />
                  {a.team.abbreviation}
                </Link>
              )}
              <span className="whitespace-nowrap">{[a.jersey && `#${a.jersey}`, a.position?.displayName ?? a.position?.abbreviation].filter(Boolean).join(' · ')}</span>
            </div>
            {injury && (
              <div className="mt-1.5 text-[12px] font-medium text-live">
                {injury.status}
                {injury.details?.type ? ` · ${injury.details.type}` : ''}
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="sticky top-[env(safe-area-inset-top)] z-30 mb-3 bg-bg/85 backdrop-blur-xl">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'overview', label: 'Overview' },
            { value: 'log', label: 'Game log' },
            { value: 'news', label: 'News' },
          ]}
        />
      </div>
      <div className="space-y-3 px-3 lg:px-0">
        {tab === 'overview' && (
          <>
            {overview.isPending && <Loading rows={2} />}
            {overview.data?.statistics && <StatSplits stats={overview.data.statistics} />}
            <Card title="Bio">
              <dl className="divide-y divide-line px-4 pb-2 text-[14px]">
                {bio.map(([k, v]) => (
                  <div key={k} className="flex gap-4 py-2.5">
                    <dt className="w-28 shrink-0 text-muted">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </>
        )}
        {tab === 'log' && <GameLog league={league} id={id} />}
        {tab === 'news' && <PlayerNews news={overview.data?.news} />}
      </div>
    </div>
  )
}

function StatSplits({ stats }: { stats: Any }) {
  const labels: string[] = stats.labels ?? []
  const splits: Any[] = (stats.splits ?? []).filter((s: Any) => s.displayName !== 'Projected')
  if (!splits.length) return null
  const headline = splits[0]
  // Show a few big numbers from the first split, then the full table.
  const keyIdx = pickKeyStats(labels)
  return (
    <Card title={stats.displayName ?? 'Stats'}>
      <div className="grid grid-cols-4 gap-2 px-4 pb-3">
        {keyIdx.map((i) => (
          <div key={i} className="rounded-xl bg-raised px-2 py-2.5 text-center">
            <div className="font-score text-[26px] leading-none font-semibold tnum">{headline.stats[i]}</div>
            <div className="mt-1 text-[11px] text-muted">{labels[i]}</div>
          </div>
        ))}
      </div>
      <div className="no-scrollbar overflow-x-auto pb-2">
        <table className="w-full min-w-max text-[13px]">
          <thead>
            <tr className="text-[11px] text-faint">
              <th className="sticky left-0 bg-surface py-1.5 pl-4 text-left font-normal" />
              {labels.map((l, i) => (
                <th key={i} className="px-2 py-1.5 font-normal last:pr-4">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {splits.map((s) => (
              <tr key={s.displayName} className="border-t border-line">
                <td className="sticky left-0 bg-surface py-2 pr-3 pl-4 font-medium whitespace-nowrap">{s.displayName}</td>
                {s.stats.map((v: string, i: number) => (
                  <td key={i} className="px-2 py-2 text-center tnum last:pr-4">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

const PREFERRED = ['PTS', 'REB', 'AST', 'FG%', 'YDS', 'TD', 'REC', 'INT', 'RTG', 'CAR', 'TOT', 'SACK']

function pickKeyStats(labels: string[]) {
  const out: number[] = []
  for (const p of PREFERRED) {
    const i = labels.indexOf(p)
    if (i >= 0 && !out.includes(i)) out.push(i)
    if (out.length === 4) break
  }
  return out
}

function GameLog({ league, id }: { league: LeagueId; id: string }) {
  const q = useQuery({ queryKey: ['gamelog', league, id], queryFn: () => getAthleteGamelog(league, id), staleTime: 5 * 60_000 })
  if (q.isPending) return <Loading rows={6} />
  if (q.isError) return <ErrorState error={q.error} retry={q.refetch} />
  const d = q.data
  const labels: string[] = d.labels ?? []
  const events = d.events ?? {}
  const seasons: Any[] = d.seasonTypes ?? []
  if (!seasons.length) return <Empty>No games played yet.</Empty>

  return (
    <>
      {seasons.map((st) => {
        const rows = (st.categories ?? []).filter((c: Any) => c.type === 'event').flatMap((c: Any) => c.events ?? [])
        if (!rows.length) return null
        return (
          <Card key={st.displayName} title={st.displayName}>
            <div className="no-scrollbar overflow-x-auto pb-2">
              <table className="w-full min-w-max text-[13px]">
                <thead>
                  <tr className="text-[11px] text-faint">
                    <th className="sticky left-0 bg-surface py-1.5 pl-4 text-left font-normal">Game</th>
                    <th className="px-2 py-1.5 text-left font-normal">Result</th>
                    {labels.map((l, i) => (
                      <th key={i} className="px-2 py-1.5 font-normal last:pr-4">
                        {l}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: Any) => {
                    const e = events[r.eventId] ?? {}
                    return (
                      <tr key={r.eventId} className="border-t border-line">
                        <td className="sticky left-0 bg-surface py-2 pr-2 pl-4 whitespace-nowrap">
                          <Link to={`/${league}/game/${r.eventId}`} className="flex items-center gap-1.5">
                            <span className="w-10 text-faint tnum">{e.gameDate ? new Date(e.gameDate).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }) : ''}</span>
                            <span className="w-3 text-faint">{e.atVs}</span>
                            <Logo src={teamLogo(league, e.opponent?.abbreviation, 32, e.opponent?.id)} alt="" size={16} />
                            <span className="font-medium">{e.opponent?.abbreviation}</span>
                          </Link>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap tnum">
                          <span className={clsx('mr-1 font-semibold', e.gameResult === 'W' ? 'text-win' : 'text-live')}>{e.gameResult}</span>
                          {e.score}
                        </td>
                        {r.stats.map((v: string, i: number) => (
                          <td key={i} className="px-2 py-2 text-center tnum last:pr-4">
                            {v}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      })}
    </>
  )
}

function PlayerNews({ news }: { news?: Any[] }) {
  if (!news?.length) return <Empty>No recent stories.</Empty>
  return (
    <Card>
      <ul className="divide-y divide-line">
        {news.map((n) => (
          <li key={n.id ?? n.headline}>
            <a href={n.links?.web?.href} target="_blank" rel="noreferrer" className="flex gap-3 px-4 py-3 hover:bg-raised/60">
              {n.images?.[0]?.url && <img src={n.images[0].url} alt="" loading="lazy" className="aspect-video w-28 shrink-0 rounded-lg object-cover" />}
              <div className="min-w-0">
                <div className="text-[14px] leading-snug font-medium">{n.headline}</div>
                {n.published && <div className="mt-1 text-[12px] text-faint">{ago(n.published)}</div>}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </Card>
  )
}
