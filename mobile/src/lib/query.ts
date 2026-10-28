import { focusManager, QueryClient } from '@tanstack/react-query'
import { AppState, type AppStateStatus } from 'react-native'

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnReconnect: true } },
})

/** Tell TanStack Query when the app is foregrounded so it refetches stale data. */
export function subscribeAppFocus() {
  const sub = AppState.addEventListener('change', (s: AppStateStatus) => focusManager.setFocused(s === 'active'))
  return () => sub.remove()
}
