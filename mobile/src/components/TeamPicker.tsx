import { useQueries } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { SymbolView } from 'expo-symbols'
import { Pressable, View } from 'react-native'
import { getTeams, LEAGUE_TITLES, teamLogo, type LeagueId, type TeamLite } from '@/lib/espn'
import { toggleFavorite, useFavorites } from '@/lib/favorites'
import { nicknames } from '@/lib/nicknames'
import { Card, Divider, ErrorState, Loading, Logo, Text } from './ui'
import { colors } from '@/theme'

const matches = (t: TeamLite, term: string) =>
  t.displayName.toLowerCase().includes(term) || t.abbr.toLowerCase() === term || nicknames(t.league, t.abbr).some((n) => n.startsWith(term))

function PickRow({ team, on }: { team: TeamLite; on: boolean }) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync()
        toggleFavorite({ league: team.league, id: team.id, abbr: team.abbr, name: team.displayName })
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16 }}
    >
      <Logo src={team.logo} size={28} />
      <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, fontWeight: '500' }}>{team.displayName}</Text>
      <SymbolView name={on ? 'star.fill' : 'star'} size={20} tintColor={on ? colors.warn : colors.faint} />
    </Pressable>
  )
}

function Section({ title, teams, favs }: { title: string; teams: TeamLite[]; favs: Set<string> }) {
  return (
    <Card title={title}>
      {teams.map((t, i) => (
        <View key={t.league + t.id}>
          {i > 0 && <Divider inset={56} />}
          <PickRow team={t} on={favs.has(t.league + t.id)} />
        </View>
      ))}
    </Card>
  )
}

/** Tap-to-star team lists for the given leagues, favorites first. Render inside a ScrollView with `gap`. */
export function TeamPicker({ leagues, query }: { leagues: LeagueId[]; query: string }) {
  const { favs } = useFavorites()
  const results = useQueries({ queries: leagues.map((l) => ({ queryKey: ['teams', l], queryFn: () => getTeams(l), staleTime: Infinity })) })
  const term = query.trim().toLowerCase()
  const on = new Set(favs.map((f) => f.league + f.id))
  const mine: TeamLite[] = favs.filter((f) => leagues.includes(f.league)).map((f) => ({ ...f, displayName: f.name, logo: teamLogo(f.league, f.abbr, 64, f.id) }))

  const error = results.find((r) => r.isError)
  return (
    <>
      {results.some((r) => r.isPending) && <Loading />}
      {error && <ErrorState error={error.error} retry={() => results.forEach((r) => r.refetch())} />}
      {!term && mine.length > 0 && <Section title="Favorites" teams={mine} favs={on} />}
      {leagues.map((l, i) => {
        const teams = (results[i].data ?? []).filter((t) => !term || matches(t, term))
        return teams.length ? <Section key={l} title={LEAGUE_TITLES[l]} teams={teams} favs={on} /> : null
      })}
    </>
  )
}
