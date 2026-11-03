import { useQueries, useQueryClient } from '@tanstack/react-query'
import { router, Stack } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useEffect, useRef } from 'react'
import { ScrollView, View } from 'react-native'
import { GameList } from '@/components/GameRow'
import { Empty, ErrorState, Loading, Text, usePullRefresh } from '@/components/ui'
import { getScoreboard, getTeamSchedule, LEAGUES, type Game, type Scoreboard } from '@/lib/espn'
import { useFavorites } from '@/lib/favorites'
import { buildScoresFeed } from '@/lib/scoresFeed'
import { addDays, todayYmd, ymd } from '@/lib/format'
import { useSettings } from '@/lib/settings'

function Group({ title, games }: { title?: string; games: Game[] }) {
  return (
    <View>
      {title ? <Text style={{ fontSize: 17, fontWeight: '600', marginBottom: 8, marginLeft: 4 }}>{title}</Text> : null}
      <GameList games={games} showDay />
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
  const { favs } = useFavorites()
  const today = todayYmd()
  // Look ahead so Following can show the next matchup when there are no games today.
  const days = Array.from({ length: 9 }, (_, i) => ymd(addDays(new Date(), i - 1)))
  const feedLeagues = [...new Set([...leagues, ...favs.map((f) => f.league)])]
  const combos = feedLeagues.flatMap((league) => days.map((date) => ({ league, date })))

  // Polls fast while anything is live.
  const qc = useQueryClient()
  const anyLive = () => qc.getQueriesData<Scoreboard>({ queryKey: ['sb'], predicate: (q) => q.queryKey[2] === 'day' }).some(([, d]) => d?.games.some((g) => g.state === 'in'))
  const results = useQueries({
    queries: combos.map(({ league, date }) => ({
      queryKey: ['sb', league, 'day', date],
      queryFn: () => getScoreboard(league, { date }),
      staleTime: date > today ? 5 * 60_000 : 0,
      refetchInterval: date > today ? 5 * 60_000 : anyLive() ? 15_000 : 60_000,
    })),
  })

  const schedules = useQueries({
    queries: favs.flatMap((team) => ['2', '3'].map((seasonType) => ({
      queryKey: ['schedule', team.league, team.id, seasonType],
      queryFn: () => getTeamSchedule(team.league, team.id, seasonType),
      staleTime: 5 * 60_000,
      refetchInterval: 5 * 60_000,
    }))),
  })
  const queries = [...results, ...schedules]
  const refresh = usePullRefresh(() => Promise.all(queries.map((r) => r.refetch())))
  const { following, groups, unscheduled } = buildScoresFeed(
    results.flatMap((r) => r.data?.games ?? []),
    schedules.flatMap((r) => r.data?.games ?? []),
    favs, leagues, today,
  )
  useScoreTaps(following)
  const followingPending = queries.some((r) => r.isPending)
  const followingError = queries.find((r) => r.isError)
  const failed = results.find((r) => r.isError)

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="gearshape" accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
      </Stack.Toolbar>
      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} refreshControl={refresh} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 120, gap: 20 }}>
        <View>
          <Text style={{ fontSize: 17, fontWeight: '600', marginBottom: 8, marginLeft: 4 }}>Following</Text>
          {following.length > 0 && <GameList games={following} showDay />}
          {!favs.length && <Empty>Follow teams in Settings to see their next games here.</Empty>}
          {favs.length > 0 && followingPending && <Loading />}
          {favs.length > 0 && followingError && <ErrorState error={followingError.error} retry={() => queries.forEach((r) => r.refetch())} />}
          {!followingPending && !followingError && unscheduled.length > 0 && <Empty>{unscheduled.map((f) => f.name).join(', ')} · Awaiting the next scheduled game.</Empty>}
        </View>
        {results.some((r) => r.isPending) && <Loading />}
        {failed && <ErrorState error={failed.error} retry={() => results.forEach((r) => r.refetch())} />}
        {groups.map((group) => <Group key={group.league} title={LEAGUES[group.league].name} games={group.games} />)}
      </ScrollView>
    </>
  )
}
