import Storage from 'expo-sqlite/kv-store'
import { useSyncExternalStore } from 'react'

export type FantasyView = 'matchup' | 'league' | 'standings'

const KEY = 'fantasy.league'
const listeners = new Set<() => void>()

let snapshot = { league: Storage.getItemSync(KEY) ?? undefined as string | undefined, view: 'matchup' as FantasyView }

const emit = (patch: Partial<typeof snapshot>) => {
  snapshot = { ...snapshot, ...patch }
  listeners.forEach((l) => l())
}

export function setFantasyLeague(league: string) {
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

/** Fantasy tab's league id (persisted; may no longer be visible) and Matchup / League / Standings view (session only). */
export function useFantasySelection() {
  return useSyncExternalStore(subscribe, () => snapshot)
}
