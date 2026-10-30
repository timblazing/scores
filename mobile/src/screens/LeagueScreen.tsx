import { useQuery } from '@tanstack/react-query'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Article } from '@/components/Article'
import { StatTable, type TableRow } from '@/components/StatTable'
import { Card, ErrorState, Loading, Logo, Segmented, Tabs, Text, usePullRefresh } from '@/components/ui'
import { getNews, getStandings, isLeague, LEAGUE_TITLES, type LeagueId, type StandingGroup } from '@/lib/espn'
import { useFavorites } from '@/lib/favorites'
import { colors } from '@/theme'

const scrollProps = { contentInsetAdjustmentBehavior: 'automatic' as const, showsVerticalScrollIndicator: false, keyboardDismissMode: 'on-drag' as const }

type LeagueView = 'standings' | 'news'

export default function LeagueScreen() {
  const { league } = useLocalSearchParams<{ league: string }>()
  const [view, setView] = useState<LeagueView>('standings')
  if (!isLeague(league)) return null

  return (
    <>
      <Stack.Title>{LEAGUE_TITLES[league]}</Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View hidesSharedBackground>
          <Tabs
            value={view}
            onChange={setView}
            options={[
              { value: 'standings', label: 'Standings' },
              { value: 'news', label: 'News' },
            ]}
          />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
      {view === 'standings' ? <StandingsView key={league} league={league} /> : <NewsView key={league} league={league} />}
    </>
  )
}

/* ---------- standings ---------- */

const COLS: Record<LeagueId, { key: string; label: string }[]> = {
  nfl: [
    { key: 'wins', label: 'W' },
    { key: 'losses', label: 'L' },
    { key: 'ties', label: 'T' },
    { key: 'winPercent', label: 'PCT' },
    { key: 'pointsFor', label: 'PF' },
    { key: 'pointsAgainst', label: 'PA' },
    { key: 'differential', label: 'DIFF' },
    { key: 'vs. Div.', label: 'DIV' },
    { key: 'streak', label: 'STRK' },
  ],
  cfb: [
    { key: 'vs. Conf.', label: 'CONF' },
    { key: 'overall', label: 'OVR' },
    { key: 'pointsFor', label: 'PF' },
    { key: 'pointsAgainst', label: 'PA' },
    { key: 'Home', label: 'HOME' },
    { key: 'Away', label: 'AWAY' },
    { key: 'vs AP Top 25', label: 'VS AP' },
    { key: 'streak', label: 'STRK' },
  ],
  nba: [
    { key: 'wins', label: 'W' },
    { key: 'losses', label: 'L' },
    { key: 'winPercent', label: 'PCT' },
    { key: 'gamesBehind', label: 'GB' },
    { key: 'Home', label: 'HOME' },
    { key: 'Road', label: 'AWAY' },
    { key: 'vs. Conf.', label: 'CONF' },
    { key: 'streak', label: 'STRK' },
  ],
}

function StandingsView({ league }: { league: LeagueId }) {
  const q = useQuery({ queryKey: ['standings', league], queryFn: () => getStandings(league), staleTime: 5 * 60_000 })
  const [conf, setConf] = useState(0)
  const refresh = usePullRefresh(() => q.refetch())

  return (
    <ScrollView {...scrollProps} refreshControl={refresh} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 120, gap: 12 }}>
      {q.isPending && <Loading />}
      {q.isError && <ErrorState error={q.error} retry={q.refetch} />}
      {q.data && (
        <>
          <Segmented value={String(conf)} onChange={(v) => setConf(Number(v))} options={q.data.map((c, i) => ({ value: String(i), label: c.short }))} />
          <Conference conf={q.data[conf]} league={league} />
        </>
      )}
    </ScrollView>
  )
}

function Conference({ conf, league }: { conf?: StandingGroup; league: LeagueId }) {
  const { isFav } = useFavorites()
  if (!conf) return null
  const cols = COLS[league]
  return (
    <>
      {conf.groups.map((g) => {
        const rows: TableRow[] = g.rows.map((r, i) => ({
          key: r.team.id,
          href: `/team/${league}/${r.team.id}`,
          topBorder: league === 'nba' && i === 6 ? 'dashed' : undefined, // play-in cutoff after 6th seed
          left: (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text tnum style={{ width: 16, textAlign: 'right', fontSize: 12, color: colors.faint }}>{i + 1}</Text>
              <Logo src={r.team.logo} size={22} />
              <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '500', flexShrink: 1 }}>
                {r.team.abbr}
                {isFav(league, r.team.id) ? <Text style={{ fontSize: 10, color: colors.warn }}> ★</Text> : null}
                {r.stats.clincher ? <Text style={{ fontSize: 11, color: colors.faint }}> {r.stats.clincher}</Text> : null}
              </Text>
            </View>
          ),
          cells: cols.map((c) => r.stats[c.key]),
        }))
        const boldCols = cols.flatMap((c, i) => (c.key === 'winPercent' || c.key === 'vs. Conf.' ? [i] : []))
        return (
          <Card key={g.name} title={conf.groups.length > 1 ? g.name : undefined}>
            <StatTable headLeft="Team" headers={cols.map((c) => c.label)} rows={rows} leftWidth={116} boldCols={boldCols} />
          </Card>
        )
      })}
    </>
  )
}

/* ---------- news ---------- */

function NewsView({ league }: { league: LeagueId }) {
  const q = useQuery({ queryKey: ['news', league], queryFn: () => getNews(league), staleTime: 2 * 60_000 })
  const refresh = usePullRefresh(() => q.refetch())
  return (
    <ScrollView {...scrollProps} refreshControl={refresh} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 120, gap: 12 }}>
      {q.isPending && <Loading />}
      {q.isError && <ErrorState error={q.error} retry={q.refetch} />}
      {q.data?.map((a, i) => <Article key={a.id} a={a} lead={i === 0} />)}
    </ScrollView>
  )
}
