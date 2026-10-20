import { useQueries } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Card, Empty, ErrorState, FavButton, Loading, Logo, PageHeader } from '@/components/ui'
import { getTeams, LEAGUE_IDS, LEAGUES, teamLogo, type TeamLite } from '@/lib/espn'
import { useFavorites } from '@/lib/favorites'

export function TeamsPage() {
  const results = useQueries({ queries: LEAGUE_IDS.map((l) => ({ queryKey: ['teams', l], queryFn: () => getTeams(l), staleTime: Infinity })) })
  const { favs } = useFavorites()
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  const match = (t: TeamLite) => !term || [t.displayName, t.abbr, t.name].some((s) => s.toLowerCase().includes(term))

  return (
    <div>
      <PageHeader title="Teams" />
      <div className="space-y-5 px-3 lg:px-0">
        <label className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5">
          <Search size={17} className="text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search NFL and NBA teams"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-faint"
            type="search"
            autoComplete="off"
          />
        </label>

        {!term && (
          <section>
            <h2 className="mb-2 px-1 text-[15px] font-semibold">My Teams</h2>
            {favs.length ? (
              <Card>
                <ul className="divide-y divide-line">
                  {favs.map((f) => (
                    <TeamItem key={f.league + f.id} league={f.league} id={f.id} abbr={f.abbr} name={f.name} sub={LEAGUES[f.league].name} />
                  ))}
                </ul>
              </Card>
            ) : (
              <Empty>Star a team to pin its games to the top of Scores.</Empty>
            )}
          </section>
        )}

        {LEAGUE_IDS.map((l, i) => {
          const r = results[i]
          const teams = (r.data ?? []).filter(match)
          if (r.data && !teams.length) return null
          return (
            <section key={l}>
              <h2 className="mb-2 px-1 text-[15px] font-semibold">{LEAGUES[l].name}</h2>
              {r.isPending && <Loading rows={3} />}
              {r.isError && <ErrorState error={r.error} retry={r.refetch} />}
              {teams.length > 0 && (
                <Card>
                  <ul className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
                    {teams.map((t) => (
                      <TeamItem key={t.id} league={l} id={t.id} abbr={t.abbr} name={t.displayName} />
                    ))}
                  </ul>
                </Card>
              )}
            </section>
          )
        })}
        {term && results.every((r) => r.data && !r.data.some(match)) && <Empty>No teams match "{q}".</Empty>}
      </div>
    </div>
  )
}

function TeamItem({ league, id, abbr, name, sub }: { league: 'nfl' | 'nba'; id: string; abbr: string; name: string; sub?: string }) {
  return (
    <li className="flex items-center sm:border-b sm:border-line">
      <Link to={`/${league}/team/${id}`} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-4">
        <Logo src={teamLogo(league, abbr, 64)} alt="" size={28} />
        <span className="truncate text-[15px] font-medium">{name}</span>
        {sub && <span className="text-[12px] text-faint">{sub}</span>}
      </Link>
      <FavButton fav={{ league, id, abbr, name }} className="mr-2" />
    </li>
  )
}
