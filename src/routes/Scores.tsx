import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { GameList } from '@/components/GameRow'
import { SearchTrigger } from '@/components/Search'
import { Empty, ErrorState, Loading, PageHeader, Segmented } from '@/components/ui'
import { getScoreboard, LEAGUE_IDS, LEAGUES, type Game, type LeagueId, type Scoreboard } from '@/lib/espn'
import { useFavorites } from '@/lib/favorites'
import { addDays, dayLabel, fromYmd, shortDate, todayYmd, ymd } from '@/lib/format'

type View = 'all' | LeagueId

const liveInterval = (q: { data?: Scoreboard | Scoreboard[] }) => {
  const games = [q.data ?? []].flat().flatMap((s) => s.games)
  return games.some((g) => g.state === 'in') ? 15_000 : 60_000
}

export function ScoresPage() {
  const [params, setParams] = useSearchParams()
  const param = params.get('league')
  const view: View = LEAGUE_IDS.find((l) => l === param) ?? 'all'
  const date = params.get('d') || todayYmd()

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) (v == null ? next.delete(k) : next.set(k, v))
    setParams(next, { replace: true })
  }

  return (
    <div>
      <PageHeader title="Scores">
        <Segmented
          className="w-64"
          value={view}
          onChange={(v) => update({ league: v === 'all' ? null : v, w: null, st: null })}
          options={[
            { value: 'all', label: 'All' },
            ...LEAGUE_IDS.map((l) => ({ value: l, label: LEAGUES[l].name })),
          ]}
        />
      </PageHeader>
      <div className="px-3 pb-3 lg:hidden">
        <SearchTrigger />
      </div>
      {view === 'nfl' || view === 'cfb' ? (
        <WeekGames key={view} league={view} week={params.get('w')} seasonType={params.get('st')} onWeek={(w, st) => update({ w, st })} />
      ) : (
        <>
          <DateStrip value={date} onChange={(d) => update({ d: d === todayYmd() ? null : d })} />
          <DayGames date={date} leagues={view === 'all' ? LEAGUE_IDS : [view]} />
        </>
      )}
    </div>
  )
}

function DateStrip({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const days = useMemo(() => {
    const center = fromYmd(value)
    return Array.from({ length: 15 }, (_, i) => ymd(addDays(center, i - 7)))
  }, [value])
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [value])

  const step = (n: number) => onChange(ymd(addDays(fromYmd(value), n)))

  return (
    <div className="sticky top-[env(safe-area-inset-top)] z-30 mb-3 flex items-center border-b border-line bg-bg/85 backdrop-blur-xl">
      <button onClick={() => step(-1)} className="hidden p-2 text-muted hover:text-fg sm:block" aria-label="Previous day">
        <ChevronLeft size={18} />
      </button>
      <div ref={ref} role="tablist" className="no-scrollbar flex flex-1 snap-x overflow-x-auto">
        {days.map((d) => {
          const on = d === value
          return (
            <button
              key={d}
              role="tab"
              aria-selected={on}
              onClick={() => onChange(d)}
              className={clsx(
                'flex min-w-[76px] shrink-0 snap-center flex-col items-center border-b-2 py-2.5 transition-colors',
                on ? 'border-fg text-fg' : 'border-transparent text-faint hover:text-muted',
              )}
            >
              <span className="text-[13px] font-semibold">{dayLabel(d)}</span>
              <span className="text-[11px]">{shortDate(d)}</span>
            </button>
          )
        })}
      </div>
      <button onClick={() => step(1)} className="hidden p-2 text-muted hover:text-fg sm:block" aria-label="Next day">
        <ChevronRight size={18} />
      </button>
      {value !== todayYmd() && (
        <button onClick={() => onChange(todayYmd())} className="mx-2 shrink-0 rounded-full bg-raised px-3 py-1 text-xs font-medium">
          Today
        </button>
      )}
    </div>
  )
}

function useFavFirst(games: Game[]) {
  const { isFav } = useFavorites()
  const mine = games.filter((g) => isFav(g.league, g.home.id) || isFav(g.league, g.away.id))
  const rest = games.filter((g) => !mine.includes(g))
  return { mine, rest }
}

const ranked = (g: Game) => !!(g.home.rank || g.away.rank)

const byState = (a: Game, b: Game) => {
  const rank = { in: 0, pre: 1, post: 2 }
  return rank[a.state] - rank[b.state] || a.date.localeCompare(b.date)
}

function DayGames({ date, leagues }: { date: string; leagues: LeagueId[] }) {
  const q = useQuery({
    queryKey: ['day', date, leagues],
    queryFn: () => Promise.all(leagues.map((l) => getScoreboard(l, { date }))),
    refetchInterval: (query) => liveInterval(query.state),
  })
  const all = (q.data ?? []).flatMap((s) => s.games).sort(byState)
  const { mine, rest: others } = useFavFirst(all)
  // With several leagues on screen, college football is limited to Top 25 games.
  const shown = leagues.length > 1 ? others.filter((g) => g.league !== 'cfb' || ranked(g)) : others
  const live = shown.filter((g) => g.state === 'in')
  const rest = shown.filter((g) => g.state !== 'in')

  if (q.isPending) return <div className="px-4 lg:px-0"><Loading /></div>
  if (q.isError) return <div className="px-4 lg:px-0"><ErrorState error={q.error} retry={q.refetch} /></div>

  return (
    <div className="space-y-5 px-3 lg:px-0">
      {!mine.length && !shown.length && <Empty>No {leagues.length > 1 ? '' : `${LEAGUES[leagues[0]].name} `}games {dayLabel(date) === 'Today' ? 'today' : `on ${shortDate(date)}`}.</Empty>}
      {mine.length > 0 && <Group title="My Teams" games={mine} />}
      {live.length > 0 && <Group title="Live" games={live} />}
      {leagues.map((l) => {
        const games = rest.filter((g) => g.league === l)
        return games.length ? <Group key={l} title={leagues.length > 1 ? LEAGUES[l].name : undefined} games={games} /> : null
      })}
    </div>
  )
}

function Group({ title, games }: { title?: string; games: Game[] }) {
  return (
    <section>
      {title && <h2 className="mb-2 px-1 text-[15px] font-semibold">{title}</h2>}
      <GameList games={games} />
    </section>
  )
}

function WeekGames({
  league,
  week,
  seasonType,
  onWeek,
}: {
  league: LeagueId
  week: string | null
  seasonType: string | null
  onWeek: (w: string, st: string) => void
}) {
  // The default call tells us the current week and the full calendar.
  const current = useQuery({ queryKey: ['sb', league, 'current'], queryFn: () => getScoreboard(league), refetchInterval: (q) => liveInterval(q.state) })
  const selected = useQuery({
    queryKey: ['sb', league, week, seasonType, current.data?.year],
    queryFn: () => getScoreboard(league, { week: week!, seasonType: seasonType ?? '2', year: current.data?.year }),
    enabled: !!week && !!current.data,
    refetchInterval: (q) => liveInterval(q.state),
  })
  const data = week ? selected.data : current.data
  const weeks = (current.data?.weeks ?? []).filter((w) => w.seasonType !== '1' && w.seasonType !== '4')
  const activeWeek = week ?? String(current.data?.week ?? '')
  const activeType = seasonType ?? String(current.data?.seasonType ?? '2')

  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [activeWeek, weeks.length])

  const games = [...(data?.games ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  const { mine, rest } = useFavFirst(games)
  mine.sort(byState)
  // Live games first, then (college) Top 25, then everything else by day.
  const live = rest.filter((g) => g.state === 'in')
  const top = league === 'cfb' ? rest.filter((g) => g.state !== 'in' && ranked(g)) : []
  const days = new Map<string, Game[]>()
  for (const g of rest.filter((g) => !live.includes(g) && !top.includes(g))) {
    const key = new Date(g.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
    days.set(key, [...(days.get(key) ?? []), g])
  }

  const q = week ? selected : current
  return (
    <>
      <div className="sticky top-[env(safe-area-inset-top)] z-30 mb-3 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div ref={ref} role="tablist" className="no-scrollbar flex snap-x overflow-x-auto">
          {weeks.map((w) => {
            const on = w.week === activeWeek && w.seasonType === activeType
            return (
              <button
                key={w.seasonType + w.week}
                role="tab"
                aria-selected={on}
                onClick={() => onWeek(w.week, w.seasonType)}
                className={clsx(
                  'flex min-w-[84px] shrink-0 snap-center flex-col items-center border-b-2 px-2 py-2.5 transition-colors',
                  on ? 'border-fg text-fg' : 'border-transparent text-faint hover:text-muted',
                )}
              >
                <span className="text-[13px] font-semibold whitespace-nowrap">{w.seasonType === '3' ? w.label.replace(' Round', '') : w.label}</span>
                <span className="text-[11px] whitespace-nowrap">{w.detail}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="space-y-5 px-3 lg:px-0">
        {q.isPending && <Loading />}
        {q.isError && <ErrorState error={q.error} retry={q.refetch} />}
        {data && !games.length && <Empty>No games scheduled this week.</Empty>}
        {mine.length > 0 && <Group title="My Teams" games={mine} />}
        {live.length > 0 && <Group title="Live" games={live} />}
        {top.length > 0 && <Group title="Top 25" games={top} />}
        {[...days].map(([day, gs]) => (
          <Group key={day} title={day} games={gs} />
        ))}
      </div>
    </>
  )
}
