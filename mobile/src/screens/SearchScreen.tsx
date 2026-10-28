import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query'
import { Link, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { TeamItem } from '@/components/TeamItem'
import { Card, Divider, Empty, Headshot, Loading, Muted, Text, usePullRefresh } from '@/components/ui'
import { getTeams, LEAGUE_IDS, LEAGUES, searchPlayers, type TeamLite } from '@/lib/espn'
import { useFavorites } from '@/lib/favorites'

function scoreTeam(t: TeamLite, term: string) {
  const name = t.displayName.toLowerCase()
  if (t.abbr.toLowerCase() === term || t.name.toLowerCase() === term) return 3
  if (name.startsWith(term) || name.split(' ').some((w) => w.startsWith(term))) return 2
  return term.length >= 4 && name.includes(term) ? 1 : 0
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export default function SearchScreen() {
  const [q, setQ] = useState('')
  const { favs } = useFavorites()
  const term = q.trim().toLowerCase()
  const debounced = useDebounced(term, 200)
  const teams = useQueries({ queries: LEAGUE_IDS.map((l) => ({ queryKey: ['teams', l], queryFn: () => getTeams(l), staleTime: Infinity })) })
  const players = useQuery({
    queryKey: ['search-players', debounced],
    queryFn: ({ signal }) => searchPlayers(debounced, signal),
    enabled: debounced.length >= 2,
    staleTime: 10 * 60_000,
    placeholderData: keepPreviousData,
  })
  const refresh = usePullRefresh(() => Promise.all(teams.map((r) => r.refetch())))

  const teamHits = !term
    ? []
    : teams
        .flatMap((r) => r.data ?? [])
        .map((t) => ({ t, s: scoreTeam(t, term) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s || a.t.displayName.localeCompare(b.t.displayName))
        .slice(0, 8)
        .map((x) => x.t)
  const playerHits = term.length >= 2 && players.data ? players.data.slice(0, 10) : []
  const searching = term.length >= 2 && (debounced !== term || players.isFetching)

  return (
    <>
      <Stack.Title>Search</Stack.Title>
      <Stack.SearchBar placement="automatic" placeholder="Teams and players" autoCapitalize="none" onChangeText={(e) => setQ(e.nativeEvent.text)} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" refreshControl={refresh} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 120, gap: 20 }}>
        {!term &&
          (favs.length ? (
            <View>
              <Text style={{ fontSize: 17, fontWeight: '600', marginBottom: 8, marginLeft: 4 }}>My Teams</Text>
              <Card>
                {favs.map((f, i) => (
                  <View key={f.league + f.id}>
                    {i > 0 && <Divider inset={56} />}
                    <TeamItem league={f.league} id={f.id} abbr={f.abbr} name={f.name} sub={LEAGUES[f.league].name} />
                  </View>
                ))}
              </Card>
            </View>
          ) : (
            <Empty>Search NFL, college football and NBA teams and players.</Empty>
          ))}
        {teamHits.length > 0 && (
          <View>
            <Text style={{ fontSize: 17, fontWeight: '600', marginBottom: 8, marginLeft: 4 }}>Teams</Text>
            <Card>
              {teamHits.map((t, i) => (
                <View key={t.league + t.id}>
                  {i > 0 && <Divider inset={56} />}
                  <TeamItem league={t.league} id={t.id} abbr={t.abbr} name={t.displayName} sub={LEAGUES[t.league].name} />
                </View>
              ))}
            </Card>
          </View>
        )}
        {playerHits.length > 0 && (
          <View>
            <Text style={{ fontSize: 17, fontWeight: '600', marginBottom: 8, marginLeft: 4 }}>Players</Text>
            <Card>
              {playerHits.map((p, i) => (
                <View key={p.league + p.id}>
                  {i > 0 && <Divider inset={68} />}
                  <Link href={`/player/${p.league}/${p.id}`} asChild>
                    <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: 16 }}>
                      <Headshot src={p.headshot} size={40} />
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '500' }}>{p.name}</Text>
                        <Muted numberOfLines={1} style={{ fontSize: 12 }}>{[p.position, p.team ?? 'Free agent', LEAGUES[p.league].name].filter(Boolean).join(' · ')}</Muted>
                      </View>
                    </Pressable>
                  </Link>
                </View>
              ))}
            </Card>
          </View>
        )}
        {searching && !playerHits.length && <Loading />}
        {term && !searching && !teamHits.length && !playerHits.length && <Empty>No results for “{q}”.</Empty>}
      </ScrollView>
    </>
  )
}
