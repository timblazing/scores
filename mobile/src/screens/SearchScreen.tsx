import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query'
import { Link, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { TeamItem } from '@/components/TeamItem'
import { Card, Divider, Empty, Headshot, Loading, Muted, Text, usePullRefresh } from '@/components/ui'
import { getTeams, LEAGUE_IDS, LEAGUES, searchPlayers, type LeagueId, type PlayerHit, type TeamLite } from '@/lib/espn'
import { useFavorites } from '@/lib/favorites'
import { nicknames } from '@/lib/nicknames'
import { addRecent, clearRecents, useRecents, type Recent } from '@/lib/recents'

function scoreTeam(t: TeamLite, term: string) {
  const name = t.displayName.toLowerCase()
  const nicks = nicknames(t.league, t.abbr)
  if (t.abbr.toLowerCase() === term || t.name.toLowerCase() === term || nicks.includes(term)) return 3
  if (name.startsWith(term) || name.split(' ').some((w) => w.startsWith(term))) return 2
  if (term.length >= 3 && nicks.some((n) => n.startsWith(term))) return 2
  return term.length >= 4 && name.includes(term) ? 1 : 0
}

function SectionHeader({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, marginHorizontal: 4 }}>
      <Text style={{ fontSize: 17, fontWeight: '600' }}>{title}</Text>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={10}>
          <Muted style={{ fontSize: 15 }}>{action.label}</Muted>
        </Pressable>
      )}
    </View>
  )
}

function PlayerItem({ league, id, name, sub, headshot, onPress }: { league: LeagueId; id: string; name: string; sub: string; headshot?: string; onPress?: () => void }) {
  return (
    <Link href={`/player/${league}/${id}`} onPress={onPress} asChild>
      <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: 16 }}>
        <Headshot src={headshot} size={40} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '500' }}>{name}</Text>
          <Muted numberOfLines={1} style={{ fontSize: 12 }}>{sub}</Muted>
        </View>
      </Pressable>
    </Link>
  )
}

function RecentItem({ r }: { r: Recent }) {
  return r.kind === 'team' ? (
    <TeamItem league={r.league} id={r.id} abbr={r.abbr} name={r.name} sub={LEAGUES[r.league].name} onPress={() => addRecent(r)} />
  ) : (
    <PlayerItem {...r} onPress={() => addRecent(r)} />
  )
}

const playerSub = (p: PlayerHit) => [p.position, p.team ?? 'Free agent', LEAGUES[p.league].name].filter(Boolean).join(' · ')

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
  const recents = useRecents()
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
        {!term && recents.length > 0 && (
          <View>
            <SectionHeader title="Recent" action={{ label: 'Clear', onPress: clearRecents }} />
            <Card>
              {recents.map((r, i) => (
                <View key={r.kind + r.league + r.id}>
                  {i > 0 && <Divider inset={r.kind === 'team' ? 56 : 68} />}
                  <RecentItem r={r} />
                </View>
              ))}
            </Card>
          </View>
        )}
        {!term &&
          (favs.length ? (
            <View>
              <SectionHeader title="My Teams" />
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
            !recents.length && <Empty>Search NFL, college football and NBA teams and players.</Empty>
          ))}
        {teamHits.length > 0 && (
          <View>
            <SectionHeader title="Teams" />
            <Card>
              {teamHits.map((t, i) => (
                <View key={t.league + t.id}>
                  {i > 0 && <Divider inset={56} />}
                  <TeamItem
                    league={t.league}
                    id={t.id}
                    abbr={t.abbr}
                    name={t.displayName}
                    sub={LEAGUES[t.league].name}
                    onPress={() => addRecent({ kind: 'team', league: t.league, id: t.id, abbr: t.abbr, name: t.displayName })}
                  />
                </View>
              ))}
            </Card>
          </View>
        )}
        {playerHits.length > 0 && (
          <View>
            <SectionHeader title="Players" />
            <Card>
              {playerHits.map((p, i) => (
                <View key={p.league + p.id}>
                  {i > 0 && <Divider inset={68} />}
                  <PlayerItem
                    {...p}
                    sub={playerSub(p)}
                    onPress={() => addRecent({ kind: 'player', league: p.league, id: p.id, name: p.name, sub: playerSub(p), headshot: p.headshot })}
                  />
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
