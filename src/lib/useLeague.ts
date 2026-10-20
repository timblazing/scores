import { useSearchParams } from 'react-router'
import type { LeagueId } from './espn'

const KEY = 'scores.league'

/** League picker state that lives in the URL and remembers the last choice. */
export function useLeagueParam(): [LeagueId, (l: LeagueId) => void] {
  const [params, setParams] = useSearchParams()
  const league = (params.get('league') as LeagueId) || (localStorage.getItem(KEY) as LeagueId) || 'nfl'
  const set = (l: LeagueId) => {
    localStorage.setItem(KEY, l)
    setParams({ league: l }, { replace: true })
  }
  return [league === 'nba' ? 'nba' : 'nfl', set]
}
