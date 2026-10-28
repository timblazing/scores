import Storage from 'expo-sqlite/kv-store'
import { useSyncExternalStore } from 'react'
import { FANTASY_LEAGUES, isFantasyLeague, type FantasyLeagueId } from './sleeper'

export type FantasyView = 'matchup' | 'league' | 'standings'

const KEY = 'fantasy.league'
const listeners = new Set<() => void>()

const stored = Storage.getItemSync(KEY)
let snapshot = { league: (isFantasyLeague(stored) ? stored : FANTASY_LEAGUES[0].id) as FantasyLeagueId, view: 'matchup' as FantasyView }

const emit = (patch: Partial<typeof snapshot>) => {
  snapshot = { ...snapshot, ...patch }
  listeners.forEach((l) => l())
}

export function setFantasyLeague(league: FantasyLeagueId) {
  Storage.setItemSync(KEY, league)
  emit({ league })
}

export const setFantasyView = (view: FantasyView) => emit({ view })

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** Fantasy tab's league (persisted) and Matchup / League / Standings view (session only). */
export function useFantasySelection() {
  return useSyncExternalStore(subscribe, () => snapshot)
}
