import { useQueries, useQueryClient } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { GameList } from '@/components/GameRow'
import { Empty, ErrorState, Loading, Text, usePullRefresh } from '@/components/ui'
import { getScoreboard, getTeamSchedule, LEAGUES, type Game, type Scoreboard } from '@/lib/espn'
import { useFavorites } from '@/lib/favorites'
import { buildScoresFeed } from '@/lib/scoresFeed'
import { addDays, todayYmd, ymd } from '@/lib/format'
import { useSettings } from '@/lib/settings'

const INITIAL_GAMES = 3

function Group({ title, games, children }: { title: string; games: Game[]; children?: ReactNode }) {
  const [expanded, setExpanded] = useState(false)
  const canExpand = games.length > INITIAL_GAMES
  return (
    <GameList
      games={expanded ? games : games.slice(0, INITIAL_GAMES)}
      showDay
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 8, minHeight: 52 }}>
          <Text accessibilityRole="header" style={{ flex: 1, fontSize: 17, fontWeight: '600' }}>{title}</Text>
          {canExpand && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${expanded ? 'See less' : 'See more'} ${title} games`}
              accessibilityState={{ expanded }}
              onPress={() => setExpanded((value) => !value)}
              style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
            >
              <Text style={{ fontSize: 14, fontWeight: '500' }}>{expanded ? 'See less' : 'See more'}</Text>
            </Pressable>
          )}
        </View>
      }
      footer={children}
    />
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
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} refreshControl={refresh} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 120, gap: 20 }}>
        <Group title="Following" games={following}>
          {!favs.length && <Empty>Follow teams in Settings to see their next games here.</Empty>}
          {favs.length > 0 && followingPending && <Loading />}
          {favs.length > 0 && followingError && <ErrorState error={followingError.error} retry={() => queries.forEach((r) => r.refetch())} />}
          {!followingPending && !followingError && unscheduled.length > 0 && <Empty>{unscheduled.map((f) => f.name).join(', ')} · Awaiting the next scheduled game.</Empty>}
        </Group>
        {results.some((r) => r.isPending) && <Loading />}
        {failed && <ErrorState error={failed.error} retry={() => results.forEach((r) => r.refetch())} />}
        {groups.map((group) => <Group key={group.league} title={LEAGUES[group.league].name} games={group.games} />)}
      </ScrollView>
    </>
  )
}
