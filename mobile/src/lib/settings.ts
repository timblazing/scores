import Storage from 'expo-sqlite/kv-store'
import { useSyncExternalStore } from 'react'
import { isLeague, LEAGUE_IDS, type LeagueId } from './espn'

export interface SleeperUser {
  username: string
  userId: string
  displayName?: string
}

export interface Settings {
  /** Followed leagues, in LEAGUE_IDS order. */
  leagues: LeagueId[]
  sleeper?: SleeperUser
  /** Sleeper league ids hidden from the Fantasy tab. */
  hiddenFantasy: string[]
  onboarded: boolean
}

const KEY = 'scores.settings.v1'
const listeners = new Set<() => void>()

const defaults: Settings = { leagues: LEAGUE_IDS, hiddenFantasy: [], onboarded: false }

let cache: Settings = (() => {
  try {
    const s = JSON.parse(Storage.getItemSync(KEY) ?? 'null')
    if (!s) return defaults
    const leagues = LEAGUE_IDS.filter((l) => (s.leagues ?? []).includes(l) && isLeague(l))
    return {
      leagues: leagues.length ? leagues : LEAGUE_IDS,
      sleeper: s.sleeper?.userId ? s.sleeper : undefined,
      hiddenFantasy: Array.isArray(s.hiddenFantasy) ? s.hiddenFantasy : [],
      onboarded: s.onboarded === true,
    }
  } catch {
    return defaults
  }
})()

function set(patch: Partial<Settings>) {
  cache = { ...cache, ...patch }
  Storage.setItemSync(KEY, JSON.stringify(cache))
  listeners.forEach((l) => l())
}

/** Ignores an empty selection: at least one league stays followed. */
export function setLeagues(leagues: LeagueId[]) {
  const next = LEAGUE_IDS.filter((l) => leagues.includes(l))
  if (next.length) set({ leagues: next })
}

export const toggleLeague = (l: LeagueId) => setLeagues(cache.leagues.includes(l) ? cache.leagues.filter((x) => x !== l) : [...cache.leagues, l])

export const setSleeper = (sleeper: SleeperUser | undefined) => set({ sleeper })

export const toggleFantasyLeague = (id: string) => set({ hiddenFantasy: cache.hiddenFantasy.includes(id) ? cache.hiddenFantasy.filter((x) => x !== id) : [...cache.hiddenFantasy, id] })

export const setOnboarded = (onboarded: boolean) => set({ onboarded })

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export const useSettings = () => useSyncExternalStore(subscribe, () => cache)
