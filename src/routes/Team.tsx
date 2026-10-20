/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Article } from '@/components/Article'
import { Back } from '@/components/Layout'
import { Card, Empty, ErrorState, FavButton, Headshot, Loading, Logo, Tabs, Watermark } from '@/components/ui'
import { getNews, getRoster, getTeamSchedule, headshot, teamLogo, type Game, type LeagueId } from '@/lib/espn'
import { readable, time } from '@/lib/format'

type Any = any
type Tab = 'schedule' | 'roster' | 'news'

export function TeamPage() {
  const { league, id } = useParams() as { league: LeagueId; id: string }
  const team = useQuery({ queryKey: ['schedule', league, id, '2'], queryFn: () => getTeamSchedule(league, id, '2'), staleTime: 60_000 })
  const [tab, setTab] = useState<Tab>('schedule')

  if (team.isPending) return <div className="p-4 lg:px-0"><Loading /></div>
  if (team.isError) return <div className="p-4 lg:px-0"><ErrorState error={team.error} retry={team.refetch} /></div>

  const t = team.data.team
  const color = readable(t.color)

  return (
    <div>
      <header
        className="relative overflow-hidden pt-safe lg:mt-4 lg:rounded-card"
        style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${color} 60%, black) 0%, #000 85%)` }}
      >
        <Watermark src={teamLogo(league, t.abbr, 400)} />
        <div className="relative flex items-center justify-between px-3 pt-3">
          <Back />
          <FavButton fav={{ league, id, abbr: t.abbr, name: t.displayName }} className="bg-black/30 backdrop-blur" />
        </div>
        <div className="relative flex items-center gap-4 px-5 pt-2 pb-6">
          <Logo src={teamLogo(league, t.abbr, 160)} alt={t.displayName} size={80} className="drop-shadow-lg" />
          <div className="min-w-0">
            <div className="text-[13px] text-fg/70">{t.location}</div>
            <h1 className="text-[28px] leading-tight font-bold tracking-tight">{t.name}</h1>
            <div className="mt-0.5 text-[13px] text-fg/70">{[t.record, t.standing].filter(Boolean).join(' · ')}</div>
          </div>
        </div>
      </header>
      <div className="sticky top-[env(safe-area-inset-top)] z-30 mb-3 bg-bg/85 backdrop-blur-xl">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'schedule', label: 'Schedule' },
            { value: 'roster', label: 'Roster' },
            { value: 'news', label: 'News' },
          ]}
        />
      </div>
      <div className="px-3 lg:px-0">
        {tab === 'schedule' && <Schedule league={league} id={id} />}
        {tab === 'roster' && <Roster league={league} id={id} />}
        {tab === 'news' && <TeamNews league={league} id={id} />}
      </div>
    </div>
  )
}

function Schedule({ league, id }: { league: LeagueId; id: string }) {
  const [type, setType] = useState<'2' | '3'>('2')
  const q = useQuery({ queryKey: ['schedule', league, id, type], queryFn: () => getTeamSchedule(league, id, type), staleTime: 60_000 })
  if (q.isPending) return <Loading rows={6} />
  if (q.isError) return <ErrorState error={q.error} retry={q.refetch} />
  const games = q.data.games
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['2', '3'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setType(v)}
            className={clsx('rounded-full px-3 py-1.5 text-[13px] font-medium', type === v ? 'bg-fg text-bg' : 'bg-surface text-muted')}
          >
            {v === '2' ? 'Regular season' : 'Postseason'}
          </button>
        ))}
      </div>
      {!games.length ? (
        <Empty>No {type === '3' ? 'postseason' : ''} games scheduled.</Empty>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {games.map((g) => (
              <ScheduleRow key={g.id} g={g} teamId={id} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function ScheduleRow({ g, teamId }: { g: Game; teamId: string }) {
  const home = g.home.id === teamId
  const us = home ? g.home : g.away
  const opp = home ? g.away : g.home
  const won = us.winner ?? Number(us.score) > Number(opp.score)
  return (
    <li>
      <Link to={`/${g.league}/game/${g.id}`} className="flex items-center gap-3 px-4 py-2.5 text-[14px] hover:bg-raised/60">
        <span className="w-14 shrink-0 text-[12px] text-faint tnum">
          {new Date(g.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
        <span className="w-4 shrink-0 text-[12px] text-faint">{home ? 'vs' : '@'}</span>
        <Logo src={opp.logo} alt="" size={22} />
        <span className="min-w-0 flex-1 truncate font-medium">{opp.name}</span>
        {g.state === 'post' ? (
          <span className="tnum">
            <span className={clsx('mr-1.5 font-semibold', won ? 'text-win' : 'text-live')}>{won ? 'W' : 'L'}</span>
            {us.score}-{opp.score}
          </span>
        ) : g.state === 'in' ? (
          <span className="text-[13px] font-semibold text-live tnum">
            {us.score}-{opp.score} · {g.shortDetail}
          </span>
        ) : (
          <span className="text-[13px] text-muted">{g.timeTBD ? 'TBD' : time(g.date)}</span>
        )}
      </Link>
    </li>
  )
}

const GROUPS: Record<string, string> = { offense: 'Offense', defense: 'Defense', specialTeam: 'Special teams' }

function Roster({ league, id }: { league: LeagueId; id: string }) {
  const q = useQuery({ queryKey: ['roster', league, id], queryFn: () => getRoster(league, id), staleTime: 10 * 60_000 })
  if (q.isPending) return <Loading rows={8} />
  if (q.isError) return <ErrorState error={q.error} retry={q.refetch} />
  const athletes: Any[] = q.data.athletes ?? []
  const groups: { name?: string; items: Any[] }[] = athletes[0]?.items
    ? athletes.map((g) => ({ name: GROUPS[g.position] ?? g.position, items: g.items }))
    : [{ items: athletes }]
  const coach = q.data.coach?.[0]

  return (
    <div className="space-y-3">
      {coach && <p className="px-1 text-[13px] text-muted">Head coach: <span className="text-fg">{coach.firstName} {coach.lastName}</span></p>}
      {groups.map((g) => (
        <Card key={g.name ?? 'all'} title={g.name}>
          <ul className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
            {g.items.map((a) => (
              <li key={a.id} className="sm:border-b sm:border-line">
                <Link to={`/${league}/player/${a.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-raised/60">
                  <Headshot src={headshot(league, a.id, 40)} alt="" size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium">
                      {a.displayName}
                      {a.injuries?.length > 0 && <span className="ml-1.5 text-[11px] font-semibold text-live">{a.injuries[0].status === 'Out' ? 'O' : a.injuries[0].status?.[0]}</span>}
                    </div>
                    <div className="text-[12px] text-muted">
                      {[a.jersey && `#${a.jersey}`, a.position?.abbreviation, a.displayHeight, a.displayWeight].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  )
}

function TeamNews({ league, id }: { league: LeagueId; id: string }) {
  const q = useQuery({ queryKey: ['news', league, id], queryFn: () => getNews(league, id, 15), staleTime: 2 * 60_000 })
  if (q.isPending) return <Loading rows={4} />
  if (q.isError) return <ErrorState error={q.error} retry={q.refetch} />
  if (!q.data.length) return <Empty>No recent stories.</Empty>
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {q.data.map((a) => (
        <Article key={a.id} a={a} />
      ))}
    </div>
  )
}
