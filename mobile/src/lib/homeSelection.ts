import Storage from 'expo-sqlite/kv-store'
import { useSyncExternalStore } from 'react'
import { isLeague, type LeagueId } from './espn'

export type Choice = 'all' | LeagueId
export type HomeView = 'scores' | 'standings' | 'news'

const KEY = 'scores.league'
const listeners = new Set<() => void>()

const read = (): Choice => {
  const v = Storage.getItemSync(KEY)
  return v === 'all' || isLeague(v) ? v : 'all'
}

let choice: Choice = read()
let view = 'scores' as HomeView

export function setChoice(c: Choice) {
  choice = c
  Storage.setItemSync(KEY, c)
  if (c === 'all') view = 'scores'
  snapshot = { choice, view }
  listeners.forEach((l) => l())
}

export function setView(v: HomeView) {
  view = v
  snapshot = { choice, view }
  listeners.forEach((l) => l())
}

let snapshot = { choice, view }

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** Home screen's league choice (persisted) and Scores / Standings / News view (session only). */
export function useHomeSelection() {
  return useSyncExternalStore(subscribe, () => snapshot)
}
