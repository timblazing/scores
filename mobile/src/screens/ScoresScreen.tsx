import { useQueries, useQueryClient } from '@tanstack/react-query'
import { router, Stack } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useEffect, useRef } from 'react'
import { ScrollView, View } from 'react-native'
import { GameList } from '@/components/GameRow'
import { Empty, ErrorState, Loading, Text, usePullRefresh } from '@/components/ui'
import { getScoreboard, LEAGUES, type Game, type LeagueId, type Scoreboard } from '@/lib/espn'
import { useFavorites } from '@/lib/favorites'
import { addDays, todayYmd, ymd } from '@/lib/format'
import { useSettings } from '@/lib/settings'

const ranked = (g: Game) => !!(g.home.rank || g.away.rank)

const byState = (a: Game, b: Game) => {
  const rank = { in: 0, pre: 1, post: 2 }
  return rank[a.state] - rank[b.state] || a.date.localeCompare(b.date)
}

const localDay = (g: Game) => ymd(new Date(g.date))

function Group({ title, games }: { title?: string; games: Game[] }) {
  return (
    <View>
      {title ? <Text style={{ fontSize: 17, fontWeight: '600', marginBottom: 8, marginLeft: 4 }}>{title}</Text> : null}
      <GameList games={games} />
    </View>
  )
}

/** Games split by league, each under its league name when more than one league has games. */
function ByLeague({ games, leagues }: { games: Game[]; leagues: LeagueId[] }) {
  const groups = leagues.map((l) => ({ l, games: games.filter((g) => g.league === l) })).filter((g) => g.games.length)
  return (
    <View style={{ gap: 14 }}>
      {groups.map((g) => (
        <Group key={g.l} title={groups.length > 1 ? LEAGUES[g.l].name : undefined} games={g.games} />
      ))}
    </View>
  )
}

/** A success tap when a followed team's live game changes score while the app is open (Scores keeps polling under other tabs). */
function useScoreTaps(games: Game[]) {
  const seen = useRef(new Map<string, string>())
  const key = games.filter((g) => g.state === 'in').map((g) => `${g.league}:${g.id}=${g.away.score}-${g.home.score}`).join('|')
  useEffect(() => {
    let changed = false
    for (const part of key ? key.split('|') : []) {
      const [id, score] = part.split('=')
      const before = seen.current.get(id)
      if (before !== undefined && before !== score) changed = true
      seen.current.set(id, score)
    }
    if (changed) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }, [key])
}

export default function ScoresScreen() {
  const { leagues } = useSettings()
  const { isFav } = useFavorites()
  const today = todayYmd()
  // Yesterday is fetched only for games still live past midnight.
  const days = [ymd(addDays(new Date(), -1)), today]
  const combos = leagues.flatMap((league) => days.map((date) => ({ league, date })))

  // Polls fast while anything is live.
  const qc = useQueryClient()
  const anyLive = () => qc.getQueriesData<Scoreboard>({ queryKey: ['sb'], predicate: (q) => q.queryKey[2] === 'day' }).some(([, d]) => d?.games.some((g) => g.state === 'in'))
  const results = useQueries({
    queries: combos.map(({ league, date }) => ({
      queryKey: ['sb', league, 'day', date],
      queryFn: () => getScoreboard(league, { date }),
      refetchInterval: anyLive() ? 15_000 : 60_000,
    })),
  })

  const refresh = usePullRefresh(() => Promise.all(results.map((r) => r.refetch())))

  // The same game can come back from both ESPN days; the first copy wins.
  const all = new Map<string, Game>()
  for (const r of results) for (const g of r.data?.games ?? []) if (!all.has(g.league + ':' + g.id)) all.set(g.league + ':' + g.id, g)
  const games = [...all.values()].filter((g) => g.state === 'in' || localDay(g) === today)

  const mine = (g: Game) => isFav(g.league, g.home.id) || isFav(g.league, g.away.id)
  // Outside Favorites, college football is limited to Top 25 games.
  const show = (g: Game) => g.league !== 'cfb' || ranked(g)

  const favorites = games.filter(mine).sort(byState)
  const rest = games.filter((g) => !mine(g) && show(g))
  const liveGames = rest.filter((g) => g.state === 'in').sort(byState)
  const todays = rest.filter((g) => g.state !== 'in').sort(byState)

  useScoreTaps(favorites)

  const pending = results.every((r) => r.isPending)
  const failed = results.length > 0 && results.every((r) => r.isError)
  const nothing = !favorites.length && !liveGames.length && !todays.length

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="gearshape" accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
      </Stack.Toolbar>
      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} refreshControl={refresh} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 120, gap: 20 }}>
        {pending && <Loading />}
        {failed && <ErrorState error={results[0].error} retry={() => results.forEach((r) => r.refetch())} />}
        {!pending && !failed && nothing && <Empty>No games today.</Empty>}
        {favorites.length > 0 && <Group title="Favorites" games={favorites} />}
        {liveGames.length > 0 && <Group title="Live" games={liveGames} />}
        {todays.length > 0 && <ByLeague games={todays} leagues={leagues} />}
      </ScrollView>
    </>
  )
}
