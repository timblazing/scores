import { useQuery } from '@tanstack/react-query'
import { Article } from '@/components/Article'
import { ErrorState, Loading, PageHeader } from '@/components/ui'
import { getNews } from '@/lib/espn'
import { useLeagueParam } from '@/lib/useLeague'
import { LeagueToggle } from './Standings'

export function NewsPage() {
  const [league, setLeague] = useLeagueParam()
  const q = useQuery({ queryKey: ['news', league], queryFn: () => getNews(league), staleTime: 2 * 60_000 })
  return (
    <div>
      <PageHeader title="News">
        <LeagueToggle league={league} onChange={setLeague} />
      </PageHeader>
      <div className="px-3 lg:px-0">
        {q.isPending && <Loading rows={6} />}
        {q.isError && <ErrorState error={q.error} retry={q.refetch} />}
        {q.data && (
          <div className="grid gap-3 sm:grid-cols-2">
            {q.data.map((a, i) => (
              <Article key={a.id} a={a} lead={i === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
