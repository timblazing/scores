import { useQueries } from '@tanstack/react-query'
import { Link, Stack } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { Card, Divider, Empty, ErrorState, FavButton, Loading, Logo, Muted, Text, usePullRefresh } from '@/components/ui'
import { getTeams, LEAGUE_IDS, LEAGUES, teamLogo, type LeagueId, type TeamLite } from '@/lib/espn'
import { useFavorites } from '@/lib/favorites'
import { colors } from '@/theme'

export function TeamItem({ league, id, abbr, name, sub }: { league: LeagueId; id: string; abbr: string; name: string; sub?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Link href={`/team/${league}/${id}`} asChild>
        <Pressable style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 16 }}>
          <Logo src={teamLogo(league, abbr, 64, id)} size={28} />
          <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 16, fontWeight: '500' }}>{name}</Text>
          {sub ? <Muted style={{ fontSize: 12, color: colors.faint }}>{sub}</Muted> : null}
        </Pressable>
      </Link>
      <View style={{ paddingRight: 10 }}>
        <FavButton fav={{ league, id, abbr, name }} size={20} />
      </View>
    </View>
  )
}

export default function FavoritesScreen() {
  const results = useQueries({ queries: LEAGUE_IDS.map((l) => ({ queryKey: ['teams', l], queryFn: () => getTeams(l), staleTime: Infinity })) })
  const { favs } = useFavorites()
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  const match = (t: TeamLite) => !term || [t.displayName, t.abbr, t.name].some((s) => s.toLowerCase().includes(term))
  const refresh = usePullRefresh(() => Promise.all(results.map((r) => r.refetch())))

  return (
    <>
      <Stack.Title large>Favorites</Stack.Title>
      <Stack.SearchBar placement="stacked" placeholder="Search teams" autoCapitalize="none" onChangeText={(e) => setQ(e.nativeEvent.text)} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" refreshControl={refresh} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 120, gap: 20 }}>
        {!term && (
          <View>
            <Text style={{ fontSize: 17, fontWeight: '600', marginBottom: 8, marginLeft: 4 }}>My Teams</Text>
            {favs.length ? (
              <Card>
                {favs.map((f, i) => (
                  <View key={f.league + f.id}>
                    {i > 0 && <Divider inset={56} />}
                    <TeamItem league={f.league} id={f.id} abbr={f.abbr} name={f.name} sub={LEAGUES[f.league].name} />
                  </View>
                ))}
              </Card>
            ) : (
              <Empty>Star a team to pin its games to the top of Scores.</Empty>
            )}
          </View>
        )}
        {LEAGUE_IDS.map((l, i) => {
          const r = results[i]
          const teams = (r.data ?? []).filter(match)
          if (r.data && !teams.length) return null
          return (
            <View key={l}>
              <Text style={{ fontSize: 17, fontWeight: '600', marginBottom: 8, marginLeft: 4 }}>{LEAGUES[l].name}</Text>
              {r.isPending && <Loading />}
              {r.isError && <ErrorState error={r.error} retry={() => r.refetch()} />}
              {teams.length > 0 && (
                <Card>
                  {teams.map((t, j) => (
                    <View key={t.id}>
                      {j > 0 && <Divider inset={56} />}
                      <TeamItem league={l} id={t.id} abbr={t.abbr} name={t.displayName} />
                    </View>
                  ))}
                </Card>
              )}
            </View>
          )
        })}
        {term && results.every((r) => r.data && !r.data.some(match)) && <Empty>No teams match “{q}”.</Empty>}
      </ScrollView>
    </>
  )
}
