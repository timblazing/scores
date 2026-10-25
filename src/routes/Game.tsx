import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { BoxScore } from '@/components/game/BoxScore'
import { chartPlays, Plays } from '@/components/game/Plays'
import {
  GameInfo,
  Injuries,
  LastFive,
  Leaders,
  LineScore,
  OddsCard,
  periodLabel,
  Predictor,
  ScoringSummary,
  SeasonSeries,
  TeamStatsCompare,
} from '@/components/game/sections'
import { WinChart } from '@/components/game/WinChart'
import { Back } from '@/components/Layout'
import { Card, ErrorState, FavButton, LiveDot, Loading, Logo, Tabs, Watermark } from '@/components/ui'
import { getSummary, LEAGUES, teamLogo, type Game, type LeagueId, type Side } from '@/lib/espn'
import { dateTime, readable, time } from '@/lib/format'

type Tab = 'game' | 'box' | 'plays' | 'stats'

export function GamePage() {
  const { league, id } = useParams() as { league: LeagueId; id: string }
  const q = useQuery({
    queryKey: ['summary', league, id],
    queryFn: () => getSummary(league, id),
    refetchInterval: (query) => (query.state.data?.game.state === 'in' ? 15_000 : false),
  })
  const [tab, setTab] = useState<Tab>('game')

  if (q.isPending)
    return (
      <div className="space-y-3 p-4 lg:px-0">
        <div className="h-44 animate-pulse rounded-card bg-surface" />
        <Loading />
      </div>
    )
  if (q.isError) return <div className="p-4 lg:px-0"><ErrorState error={q.error} retry={q.refetch} /></div>

  const { game, raw } = q.data
  const started = game.state !== 'pre'
  const tabs: { value: Tab; label: string }[] = started
    ? [
        { value: 'game', label: 'Game' },
        { value: 'box', label: 'Box score' },
        { value: 'plays', label: 'Plays' },
        { value: 'stats', label: 'Team stats' },
      ]
    : [{ value: 'game', label: 'Preview' }]

  const plays = chartPlays(raw)
  const pl = (p: number) => periodLabel(league, p)

  return (
    <div>
      <Header game={game} />
      <div className="sticky top-[env(safe-area-inset-top)] z-30 mb-3 bg-bg/85 backdrop-blur-xl">
        <Tabs value={tab} onChange={setTab} options={tabs} />
      </div>
      <div className="space-y-3 px-3 lg:px-0">
        {tab === 'game' && (
          <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
            <div className="space-y-3">
              {game.state === 'in' && game.situation?.lastPlay && <Situation game={game} />}
              <LineScore game={game} />
              {started && (raw.winprobability?.length > 1 || plays.length > 1) && (
                <Card title={raw.winprobability?.length > 1 ? 'Win probability & game flow' : 'Game flow'}>
                  <WinChart winprob={raw.winprobability ?? []} plays={plays} home={game.home} away={game.away} periodLabel={pl} />
                </Card>
              )}
              {!started && <Predictor raw={raw} game={game} />}
              <Leaders raw={raw} game={game} title={started ? 'Game leaders' : 'Season leaders'} />
              <ScoringSummary raw={raw} game={game} />
              {started && <TeamStatsCompare raw={raw} game={game} limit={6} />}
            </div>
            <div className="space-y-3">
              <OddsCard game={game} />
              <LastFive raw={raw} game={game} />
              <SeasonSeries raw={raw} game={game} />
              <Injuries raw={raw} game={game} />
              <GameInfo raw={raw} game={game} />
            </div>
          </div>
        )}
        {tab === 'box' && <BoxScore raw={raw} game={game} />}
        {tab === 'plays' && <Plays raw={raw} game={game} />}
        {tab === 'stats' && <TeamStatsCompare raw={raw} game={game} />}
      </div>
    </div>
  )
}

function Header({ game }: { game: Game }) {
  const away = readable(game.away.color)
  const home = readable(game.home.color)
  return (
    <header
      className="relative overflow-hidden pt-safe lg:mt-4 lg:rounded-card"
      style={{
        background: `linear-gradient(105deg, color-mix(in srgb, ${away} 55%, black) 0%, #000 50%, color-mix(in srgb, ${home} 55%, black) 100%)`,
      }}
    >
      <Watermark src={teamLogo(game.league, game.away.abbr, 400, game.away.id)} side="left" />
      <Watermark src={teamLogo(game.league, game.home.abbr, 400, game.home.id)} side="right" />
      <div className="relative flex items-center justify-between px-3 pt-3">
        <Back />
        <span className="text-[12px] font-medium text-fg/70">{game.note ?? LEAGUES[game.league].name}</span>
        <span className="size-9" />
      </div>
      <div className="relative flex items-center justify-between gap-2 px-4 pt-2 pb-6 sm:px-8">
        <HeaderTeam side={game.away} game={game} />
        <div className="flex flex-1 items-center justify-center gap-3 sm:gap-6">
          <BigScore side={game.away} other={game.home} game={game} />
          <div className="min-w-20 text-center">
            {game.state === 'in' ? (
              <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-live">
                <LiveDot />
                {game.shortDetail.replace(/ - /, ' · ')}
              </span>
            ) : game.state === 'post' ? (
              <span className="text-[14px] font-semibold">{game.shortDetail}</span>
            ) : (
              <>
                <div className="text-[15px] font-semibold">{game.timeTBD ? 'TBD' : time(game.date)}</div>
                <div className="text-[12px] text-fg/60">{dateTime(game.date).split(',').slice(0, 2).join(',')}</div>
              </>
            )}
            {game.broadcast && <div className="mt-1 text-[11px] text-fg/60">{game.broadcast}</div>}
          </div>
          <BigScore side={game.home} other={game.away} game={game} />
        </div>
        <HeaderTeam side={game.home} game={game} />
      </div>
    </header>
  )
}

function HeaderTeam({ side, game }: { side: Side; game: Game }) {
  return (
    <div className="relative flex w-20 flex-col items-center gap-1.5 sm:w-28">
      <Link to={`/${game.league}/team/${side.id}`} className="flex flex-col items-center gap-1.5">
        <Logo src={side.logo} alt={side.displayName} size={56} className="drop-shadow-lg sm:size-16" />
        <span className="text-center text-[13px] leading-tight font-semibold">
          {side.rank && <span className="mr-1 text-[11px] font-normal text-fg/60 tnum">{side.rank}</span>}
          {side.name}
        </span>
      </Link>
      <div className="flex items-center text-[12px] text-fg/60">
        {side.record}
        <FavButton fav={{ league: game.league, id: side.id, abbr: side.abbr, name: side.displayName }} size={13} className="-my-2 p-1.5" />
      </div>
    </div>
  )
}

function BigScore({ side, other, game }: { side: Side; other: Side; game: Game }) {
  if (game.state === 'pre') return null
  const lost = game.state === 'post' && Number(side.score) < Number(other.score)
  return (
    <span className={clsx('font-score text-[48px] leading-none font-semibold tnum sm:text-[64px]', lost && 'text-fg/45')}>{side.score}</span>
  )
}

function Situation({ game }: { game: Game }) {
  const s = game.situation!
  return (
    <Card>
      <div className="px-4 py-3">
        {s.downDistance && (
          <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold">
            {s.downDistance}
            {s.isRedZone && <span className="rounded bg-live/20 px-1.5 py-0.5 text-[11px] text-live">Red zone</span>}
          </div>
        )}
        <p className="text-[13px] text-muted">{s.lastPlay}</p>
      </div>
    </Card>
  )
}
