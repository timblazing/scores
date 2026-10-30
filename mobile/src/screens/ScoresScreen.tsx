import { useQueries, useQueryClient } from '@tanstack/react-query'
import { router, Stack } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { SymbolView } from 'expo-symbols'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { GameList } from '@/components/GameRow'
import { Empty, ErrorState, Loading, Muted, Text, usePullRefresh } from '@/components/ui'
import { getScoreboard, LEAGUES, type Game, type LeagueId, type Scoreboard } from '@/lib/espn'
import { useFavorites } from '@/lib/favorites'
import { addDays, dayLabel, shortDate, todayYmd, ymd } from '@/lib/format'
import { useSettings } from '@/lib/settings'
import { colors } from '@/theme'

const PAST = 1
const AHEAD = 7

const ranked = (g: Game) => !!(g.home.rank || g.away.rank)

const byState = (a: Game, b: Game) => {
  const rank = { in: 0, pre: 1, post: 2 }
  return rank[a.state] - rank[b.state] || a.date.localeCompare(b.date)
}

const localDay = (g: Game) => ymd(new Date(g.date))

function Group({ title, games, showDay }: { title?: string; games: Game[]; showDay?: boolean }) {
  return (
    <View>
      {title ? <Text style={{ fontSize: 17, fontWeight: '600', marginBottom: 8, marginLeft: 4 }}>{title}</Text> : null}
      <GameList games={games} showDay={showDay} />
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

function Collapsible({ title, count, open: initial = false, children }: { title: string; count: number; open?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(initial)
  return (
    <View>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync()
          setOpen(!open)
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 4, marginBottom: open ? 8 : 0, paddingVertical: 4 }}
      >
        <Text style={{ fontSize: 17, fontWeight: '600' }}>{title}</Text>
        <Muted style={{ fontSize: 14 }}>· {count} {count === 1 ? 'game' : 'games'}</Muted>
        <SymbolView name={open ? 'chevron.down' : 'chevron.right'} size={12} tintColor={colors.muted} />
      </Pressable>
      {open && children}
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
  const days = Array.from({ length: PAST + 1 + AHEAD }, (_, i) => ymd(addDays(new Date(), i - PAST)))
  const combos = leagues.flatMap((league) => days.map((date, i) => ({ league, date, soon: i <= PAST })))

  // Today and yesterday poll (fast while anything is live); later days are cached for a while.
  const qc = useQueryClient()
  const anyLive = () => qc.getQueriesData<Scoreboard>({ queryKey: ['sb'], predicate: (q) => q.queryKey[2] === 'day' }).some(([, d]) => d?.games.some((g) => g.state === 'in'))
  const results = useQueries({
    queries: combos.map(({ league, date, soon }) => ({
      queryKey: ['sb', league, 'day', date],
      queryFn: () => getScoreboard(league, { date }),
      ...(soon ? { refetchInterval: anyLive() ? 15_000 : 60_000 } : { staleTime: 10 * 60_000 }),
    })),
  })

  const refresh = usePullRefresh(() => Promise.all(results.filter((_, i) => combos[i].soon).map((r) => r.refetch())))

  // The same game can come back from two adjacent ESPN days; the earlier (more frequently refreshed) copy wins.
  const all = new Map<string, Game>()
  for (const r of results) for (const g of r.data?.games ?? []) if (!all.has(g.league + ':' + g.id)) all.set(g.league + ':' + g.id, g)
  const games = [...all.values()]

  const yesterday = days[0]
  const mine = (g: Game) => isFav(g.league, g.home.id) || isFav(g.league, g.away.id)
  const favSides = (g: Game) => [g.home, g.away].filter((s) => isFav(g.league, s.id)).map((s) => g.league + ':' + s.id)
  const sharesFav = (a: Game, b: Game) => favSides(a).some((k) => favSides(b).includes(k))
  // Outside My Teams, college football is limited to Top 25 games.
  const show = (g: Game) => g.league !== 'cfb' || ranked(g)
  const inWindow = (g: Game) => days.includes(localDay(g))

  // Today's games for favorite teams, plus each favorite's next game when it isn't today.
  const myAll = games.filter((g) => mine(g) && inWindow(g)).sort((a, b) => a.date.localeCompare(b.date))
  const myToday = myAll.filter((g) => g.state === 'in' || localDay(g) === today)
  const later = myAll.filter((g) => g.state === 'pre' && localDay(g) > today)
  const next = later.filter((g) => !myToday.some((o) => sharesFav(o, g)) && !later.some((o) => o.date < g.date && sharesFav(o, g)))
  const myGames = [...myToday, ...next].sort((a, b) => Number(b.state === 'in') - Number(a.state === 'in') || a.date.localeCompare(b.date))
  const rest = games.filter((g) => !myGames.includes(g))
  const finals = rest.filter((g) => g.state === 'post' && localDay(g) === yesterday && (show(g) || mine(g)))
  const liveGames = rest.filter((g) => g.state === 'in' && show(g)).sort(byState)
  const todays = rest.filter((g) => g.state !== 'in' && localDay(g) === today && show(g)).sort(byState)
  const upcoming = days
    .slice(PAST + 1)
    .map((d) => ({ d, games: rest.filter((g) => g.state === 'pre' && localDay(g) === d && show(g)).sort((a, b) => a.date.localeCompare(b.date)) }))
    .filter((x) => x.games.length)

  useScoreTaps(myGames)

  const pending = results.every((r) => r.isPending)
  const failed = results.length > 0 && results.every((r) => r.isError)
  const nothing = !finals.length && !myGames.length && !liveGames.length && !todays.length && !upcoming.length

  return (
    <>
      <Stack.Title large>Scores</Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="gearshape" accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
      </Stack.Toolbar>
      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} refreshControl={refresh} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 120, gap: 20 }}>
        {pending && <Loading />}
        {failed && <ErrorState error={results[0].error} retry={() => results.forEach((r) => r.refetch())} />}
        {!pending && !failed && nothing && <Empty>No games in the next week.</Empty>}
        {finals.length > 0 && (
          <Collapsible title="Yesterday" count={finals.length}>
            <ByLeague games={finals} leagues={leagues} />
          </Collapsible>
        )}
        {myGames.length > 0 && <Group title="My Teams" games={myGames} showDay />}
        {liveGames.length > 0 && <Group title="Live" games={liveGames} />}
        {todays.length > 0 && (
          <View>
            <Text style={{ fontSize: 17, fontWeight: '600', marginBottom: 8, marginLeft: 4 }}>Today</Text>
            <ByLeague games={todays} leagues={leagues} />
          </View>
        )}
        {upcoming.map(({ d, games }) => (
          <Collapsible key={d} title={dayLabel(d) === 'Tomorrow' ? 'Tomorrow' : `${dayLabel(d)}, ${shortDate(d)}`} count={games.length} open={dayLabel(d) === 'Tomorrow'}>
            <ByLeague games={games} leagues={leagues} />
          </Collapsible>
        ))}
      </ScrollView>
    </>
  )
}
