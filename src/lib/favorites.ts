import { useSyncExternalStore } from 'react'
import type { LeagueId } from './espn'

export interface Favorite {
  league: LeagueId
  id: string
  abbr: string
  name: string
}

const KEY = 'scores.favorites.v1'
const listeners = new Set<() => void>()

let cache: Favorite[] = (() => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
})()

function set(next: Favorite[]) {
  cache = next
  localStorage.setItem(KEY, JSON.stringify(next))
  listeners.forEach((l) => l())
}

export function toggleFavorite(f: Favorite) {
  const has = cache.some((x) => x.league === f.league && x.id === f.id)
  set(has ? cache.filter((x) => !(x.league === f.league && x.id === f.id)) : [...cache, f])
}

export function useFavorites() {
  const favs = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => cache,
  )
  const isFav = (league: LeagueId, id: string) => favs.some((x) => x.league === league && x.id === id)
  return { favs, isFav }
}
