import clsx from 'clsx'
import { Link } from 'react-router'
import type { Game, Side } from '@/lib/espn'
import { time } from '@/lib/format'
import { useFavorites } from '@/lib/favorites'
import { Football, Logo } from './ui'

function Team({ side, game, align }: { side: Side; game: Game; align: 'left' | 'right' }) {
  const { isFav } = useFavorites()
  const hasBall = game.state === 'in' && game.situation?.possessionId === side.id
  return (
    <div className={clsx('flex w-16 shrink-0 flex-col items-center gap-1 sm:w-20')}>
      <div className="relative">
        <Logo src={side.logo} alt={side.displayName} size={36} />
        {hasBall && (
          <span
            className={clsx('absolute top-1/2 -translate-y-1/2', align === 'left' ? 'left-full ml-0.5' : 'right-full mr-0.5')}
            aria-label="Has possession"
          >
            <Football className="h-2 w-3.5" />
          </span>
        )}
      </div>
      <div className={clsx('flex max-w-full items-center gap-1 text-[12px] leading-tight text-muted', align === 'right' && 'flex-row-reverse')}>
        <span className="truncate">
          {side.rank && <span className="mr-1 text-[10px] text-faint tnum">{side.rank}</span>}
          {side.name}
        </span>
        {isFav(game.league, side.id) && <span className="text-[9px] text-fg">★</span>}
      </div>
    </div>
  )
}

function Score({ side, other, game }: { side: Side; other: Side; game: Game }) {
  if (game.state === 'pre') return <span className="w-14 text-center text-[13px] text-faint tnum sm:w-16">{side.record}</span>
  const lost = game.state === 'post' && (side.winner === false || Number(side.score) < Number(other.score))
  return (
    <span className={clsx('w-14 text-center font-score text-[34px] leading-none font-semibold tnum sm:w-16', lost && 'text-faint')}>
      {side.score ?? '-'}
    </span>
  )
}

function Status({ game }: { game: Game }) {
  if (game.state === 'in')
    return (
      <>
        <span className="text-[13px] font-semibold text-live">{game.shortDetail.replace(/ - /, ' · ')}</span>
        {game.situation?.downDistance && <span className="mt-0.5 text-[11px] text-muted">{game.situation.downDistance}</span>}
      </>
    )
  if (game.state === 'post') return <span className="text-[13px] font-semibold">{game.shortDetail}</span>
  return (
    <>
      <span className="text-[14px] font-semibold">
        {game.timeTBD ? 'TBD' : /postponed|canceled|delayed/i.test(game.detail) ? game.shortDetail : time(game.date)}
      </span>
      {game.odds?.details && <span className="mt-0.5 text-[11px] text-faint">{game.odds.details}</span>}
    </>
  )
}

export function GameRow({ game }: { game: Game }) {
  return (
    <Link
      to={`/${game.league}/game/${game.id}`}
      className="flex items-center justify-between gap-1 px-3 py-3 transition-colors hover:bg-raised/60 active:bg-raised"
    >
      <Team side={game.away} game={game} align="left" />
      <Score side={game.away} other={game.home} game={game} />
      <div className="flex min-w-0 flex-1 flex-col items-center text-center">
        <Status game={game} />
        {game.broadcast && game.state === 'pre' && <span className="mt-0.5 max-w-full truncate text-[11px] text-faint">{game.broadcast}</span>}
      </div>
      <Score side={game.home} other={game.away} game={game} />
      <Team side={game.home} game={game} align="right" />
    </Link>
  )
}

export function GameList({ games }: { games: Game[] }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-card bg-surface">
      {games.map((g) => (
        <GameRow key={g.id} game={g} />
      ))}
    </div>
  )
}
