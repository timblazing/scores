import Storage from 'expo-sqlite/kv-store'
import { useSyncExternalStore } from 'react'
import type { LeagueId } from './espn'

// Teams and players opened from search, newest first.
export type Recent =
  | { kind: 'team'; league: LeagueId; id: string; abbr: string; name: string }
  | { kind: 'player'; league: LeagueId; id: string; name: string; sub: string; headshot?: string }

const KEY = 'scores.recentSearches.v1'
const MAX = 8
const listeners = new Set<() => void>()

let cache: Recent[] = (() => {
  try {
    return JSON.parse(Storage.getItemSync(KEY) ?? '[]')
  } catch {
    return []
  }
})()

function set(next: Recent[]) {
  cache = next
  Storage.setItemSync(KEY, JSON.stringify(next))
  listeners.forEach((l) => l())
}

const same = (a: Recent, b: Recent) => a.kind === b.kind && a.league === b.league && a.id === b.id

export const addRecent = (r: Recent) => set([r, ...cache.filter((x) => !same(x, r))].slice(0, MAX))
export const clearRecents = () => set([])

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export const useRecents = () => useSyncExternalStore(subscribe, () => cache)
