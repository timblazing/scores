import { useQuery } from '@tanstack/react-query'
import { Link, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Article } from '@/components/Article'
import { Hero, shade, useHeaderInset } from '@/components/Hero'
import { Card, Divider, Empty, ErrorState, Headshot, Loading, Logo, Muted, Segmented, Text, toggleFollow, usePullRefresh } from '@/components/ui'
import { getNews, getRoster, getTeamSchedule, headshot, teamLogo, type Game, type LeagueId } from '@/lib/espn'
import { useFavorites } from '@/lib/favorites'
import { readable, time } from '@/lib/format'
import { colors } from '@/theme'

type Tab = 'schedule' | 'roster' | 'news'

export default function TeamScreen() {
  const { league, id } = useLocalSearchParams<{ league: LeagueId; id: string }>()
  const insets = useSafeAreaInsets()
  const headerInset = useHeaderInset()
  const team = useQuery({ queryKey: ['schedule', league, id, '2'], queryFn: () => getTeamSchedule(league, id, '2'), staleTime: 60_000 })
  const [tab, setTab] = useState<Tab>('schedule')
  const { isFav } = useFavorites()
  const [nonce, setNonce] = useState(0) // bumped on pull-to-refresh so child queries refetch
  const refresh = usePullRefresh(async () => {
    setNonce((n) => n + 1)
    await team.refetch()
  })
  const scroll = { contentInsetAdjustmentBehavior: 'never' as const, showsVerticalScrollIndicator: false, refreshControl: refresh }

  if (team.isPending)
    return (
      <ScrollView {...scroll} contentContainerStyle={{ paddingTop: headerInset }}>
        <Loading />
      </ScrollView>
    )
  if (team.isError)
    return (
      <ScrollView {...scroll} contentContainerStyle={{ paddingTop: headerInset + 12, paddingHorizontal: 12 }}>
        <ErrorState error={team.error} retry={team.refetch} />
      </ScrollView>
    )

  const t = team.data.team
  const color = readable(t.color)
  const fav = isFav(league, id)

  return (
    <ScrollView {...scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={fav ? 'star.fill' : 'star'}
          accessibilityLabel={fav ? 'Unfollow team' : 'Follow team'}
          onPress={() => toggleFollow({ league, id, abbr: t.abbr, name: t.displayName }, fav)}
        />
      </Stack.Toolbar>
      <Hero colors={[shade(color, 0.6), '#000000']} start={{ x: 0, y: 0 }} end={{ x: 0.35, y: 1 }} watermarks={[{ src: teamLogo(league, t.abbr, 400, id), side: 'right' }]} bottom={24}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingTop: 8 }}>
          <Logo src={teamLogo(league, t.abbr, 160, id)} size={84} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: 'rgba(245,245,245,0.7)' }}>{t.location}</Text>
            <Text numberOfLines={2} style={{ fontSize: 30, lineHeight: 34, fontWeight: '800' }}>
              {t.name}
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(245,245,245,0.7)', marginTop: 2 }}>{[t.record, t.standing].filter(Boolean).join(' · ')}</Text>
          </View>
        </View>
      </Hero>
      <View style={{ padding: 12, gap: 12 }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'schedule', label: 'Schedule' },
            { value: 'roster', label: 'Roster' },
            { value: 'news', label: 'News' },
          ]}
        />
        {tab === 'schedule' && <Schedule league={league} id={id} nonce={nonce} />}
        {tab === 'roster' && <Roster league={league} id={id} nonce={nonce} />}
        {tab === 'news' && <TeamNews league={league} id={id} nonce={nonce} />}
      </View>
    </ScrollView>
  )
}

function Schedule({ league, id, nonce }: { league: LeagueId; id: string; nonce: number }) {
  const [type, setType] = useState<'2' | '3'>('2')
  const q = useQuery({ queryKey: ['schedule', league, id, type, nonce], queryFn: () => getTeamSchedule(league, id, type), staleTime: 60_000 })
  if (q.isPending) return <Loading />
  if (q.isError) return <ErrorState error={q.error} retry={q.refetch} />
  const games = q.data.games
  return (
    <View style={{ gap: 12 }}>
      <Segmented
        value={type}
        onChange={setType}
        options={[
          { value: '2', label: 'Regular season' },
          { value: '3', label: 'Postseason' },
        ]}
      />
      {!games.length ? (
        <Empty>No {type === '3' ? 'postseason ' : ''}games scheduled.</Empty>
      ) : (
        <Card>
          {games.map((g, i) => (
            <View key={g.id}>
              {i > 0 && <Divider />}
              <ScheduleRow g={g} teamId={id} />
            </View>
          ))}
        </Card>
      )}
    </View>
  )
}

function ScheduleRow({ g, teamId }: { g: Game; teamId: string }) {
  const home = g.home.id === teamId
  const us = home ? g.home : g.away
  const opp = home ? g.away : g.home
  const won = us.winner ?? Number(us.score) > Number(opp.score)
  return (
    <Link href={`/game/${g.league}/${g.id}`} asChild>
      <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 11 }}>
        <Text tnum style={{ width: 52, fontSize: 12, color: colors.faint }}>{new Date(g.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
        <Text style={{ width: 16, fontSize: 12, color: colors.faint }}>{home ? 'vs' : '@'}</Text>
        <Logo src={opp.logo} size={24} />
        <Text style={{ flex: 1, fontSize: 15, fontWeight: '600' }}>{opp.abbr}</Text>
        {g.state === 'post' ? (
          <Text tnum style={{ fontSize: 14 }}>
            <Text style={{ fontWeight: '700', color: won ? colors.win : colors.live }}>{won ? 'W' : 'L'} </Text>
            {us.score}-{opp.score}
          </Text>
        ) : g.state === 'in' ? (
          <Text tnum style={{ fontSize: 13, fontWeight: '600', color: colors.live }}>
            {us.score}-{opp.score} · {g.shortDetail}
          </Text>
        ) : (
          <Muted style={{ fontSize: 13 }}>{g.timeTBD ? 'TBD' : time(g.date)}</Muted>
        )}
      </Pressable>
    </Link>
  )
}

const GROUPS: Record<string, string> = { offense: 'Offense', defense: 'Defense', specialTeam: 'Special teams' }

function Roster({ league, id, nonce }: { league: LeagueId; id: string; nonce: number }) {
  const q = useQuery({ queryKey: ['roster', league, id, nonce], queryFn: () => getRoster(league, id), staleTime: 10 * 60_000 })
  if (q.isPending) return <Loading />
  if (q.isError) return <ErrorState error={q.error} retry={q.refetch} />
  const athletes: any[] = q.data.athletes ?? []
  const groups: { name?: string; items: any[] }[] = athletes[0]?.items ? athletes.map((g) => ({ name: GROUPS[g.position] ?? g.position, items: g.items })) : [{ items: athletes }]
  const coach = q.data.coach?.[0]

  return (
    <View style={{ gap: 12 }}>
      {coach ? (
        <Muted style={{ fontSize: 13, paddingHorizontal: 4 }}>
          Head coach: <Text style={{ fontSize: 13 }}>{coach.firstName} {coach.lastName}</Text>
        </Muted>
      ) : null}
      {groups.map((g) => (
        <Card key={g.name ?? 'all'} title={g.name}>
          {g.items.map((a, i) => (
            <View key={a.id}>
              {(i > 0 || g.name) && <Divider />}
              <Link href={`/player/${league}/${a.id}`} asChild>
                <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 9 }}>
                  <Headshot src={headshot(league, a.id, 40)} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '500' }}>
                      {a.displayName}
                      {a.injuries?.length > 0 ? <Text style={{ fontSize: 11, fontWeight: '700', color: colors.live }}>  {a.injuries[0].status === 'Out' ? 'O' : a.injuries[0].status?.[0]}</Text> : null}
                    </Text>
                    <Muted style={{ fontSize: 12 }}>{[a.jersey && `#${a.jersey}`, a.position?.abbreviation, a.displayHeight, a.displayWeight].filter(Boolean).join(' · ')}</Muted>
                  </View>
                </Pressable>
              </Link>
            </View>
          ))}
        </Card>
      ))}
    </View>
  )
}

function TeamNews({ league, id, nonce }: { league: LeagueId; id: string; nonce: number }) {
  const q = useQuery({ queryKey: ['news', league, id, nonce], queryFn: () => getNews(league, id, 15), staleTime: 2 * 60_000 })
  if (q.isPending) return <Loading />
  if (q.isError) return <ErrorState error={q.error} retry={q.refetch} />
  if (!q.data.length) return <Empty>No recent stories.</Empty>
  return (
    <View style={{ gap: 12 }}>
      {q.data.map((a) => (
        <Article key={a.id} a={a} />
      ))}
    </View>
  )
}
