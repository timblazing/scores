import { useQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { Link, useLocalSearchParams } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Hero, shade, useHeaderInset } from '@/components/Hero'
import { StatTable, type TableRow } from '@/components/StatTable'
import { Card, Divider, Empty, ErrorState, Loading, Logo, Muted, Segmented, Text, usePullRefresh } from '@/components/ui'
import { getAthlete, getAthleteGamelog, getAthleteOverview, headshot, teamLogo, type LeagueId } from '@/lib/espn'
import { ago, readable } from '@/lib/format'
import { colors, scoreFont } from '@/theme'

type Tab = 'overview' | 'log' | 'news'

export default function PlayerScreen() {
  const { league, id } = useLocalSearchParams<{ league: LeagueId; id: string }>()
  const insets = useSafeAreaInsets()
  const headerInset = useHeaderInset()
  const athlete = useQuery({ queryKey: ['athlete', league, id], queryFn: () => getAthlete(league, id), staleTime: 10 * 60_000 })
  const overview = useQuery({ queryKey: ['athlete-ov', league, id], queryFn: () => getAthleteOverview(league, id), staleTime: 5 * 60_000 })
  const log = useQuery({ queryKey: ['gamelog', league, id], queryFn: () => getAthleteGamelog(league, id), staleTime: 5 * 60_000, enabled: false })
  const [tab, setTab] = useState<Tab>('overview')
  const refresh = usePullRefresh(() => Promise.all([athlete.refetch(), overview.refetch(), tab === 'log' ? log.refetch() : undefined]))
  const scroll = { contentInsetAdjustmentBehavior: 'never' as const, showsVerticalScrollIndicator: false, refreshControl: refresh }

  if (athlete.isPending)
    return (
      <ScrollView {...scroll} contentContainerStyle={{ paddingTop: headerInset }}>
        <Loading />
      </ScrollView>
    )
  if (athlete.isError)
    return (
      <ScrollView {...scroll} contentContainerStyle={{ paddingTop: headerInset + 12, paddingHorizontal: 12 }}>
        <ErrorState error={athlete.error} retry={athlete.refetch} />
      </ScrollView>
    )

  const a = athlete.data
  const color = readable(a.team?.color ? `#${a.team.color}` : '#333333')
  const bio = [
    ['Height/weight', [a.displayHeight, a.displayWeight].filter(Boolean).join(', ')],
    ['Born', a.displayDOB ? `${a.displayDOB}${a.age ? ` (${a.age})` : ''}` : undefined],
    ['College', a.college?.name],
    ['Draft', a.displayDraft],
    ['Experience', a.displayExperience],
  ].filter(([, v]) => v) as [string, string][]
  const injury = a.injuries?.[0]

  return (
    <ScrollView {...scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
      <Hero colors={[shade(color, 0.6), '#000000']} start={{ x: 0, y: 0 }} end={{ x: 0.35, y: 1 }} watermarks={[{ src: a.team && teamLogo(league, a.team.abbreviation, 400, a.team.id), side: 'right' }]} bottom={0}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingTop: 8 }}>
          <Image source={headshot(league, id, 180)} contentFit="contain" contentPosition="bottom" style={{ width: 150, height: 150 }} cachePolicy="memory-disk" />
          <View style={{ flex: 1, paddingBottom: 20 }}>
            <Text style={{ fontSize: 15, color: 'rgba(245,245,245,0.8)' }}>{a.firstName}</Text>
            <Text numberOfLines={2} style={{ fontSize: 30, lineHeight: 33, fontWeight: '800' }}>{a.lastName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {a.team ? (
                <Link href={`/team/${league}/${a.team.id}`} asChild>
                  <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Logo src={teamLogo(league, a.team.abbreviation, 40, a.team.id)} size={18} />
                    <Text style={{ fontSize: 13, fontWeight: '600' }}>{a.team.abbreviation}</Text>
                  </Pressable>
                </Link>
              ) : null}
              <Text style={{ fontSize: 13, color: 'rgba(245,245,245,0.7)' }}>{[a.jersey && `#${a.jersey}`, a.position?.displayName ?? a.position?.abbreviation].filter(Boolean).join(' · ')}</Text>
            </View>
            {injury ? (
              <Text style={{ marginTop: 6, fontSize: 12, fontWeight: '500', color: colors.live }}>
                {injury.status}
                {injury.details?.type ? ` · ${injury.details.type}` : ''}
              </Text>
            ) : null}
          </View>
        </View>
      </Hero>
      <View style={{ padding: 12, gap: 12 }}>
        <Segmented
          value={tab}
          onChange={(t) => {
            setTab(t)
            if (t === 'log') log.refetch()
          }}
          options={[
            { value: 'overview', label: 'Overview' },
            { value: 'log', label: 'Game log' },
            { value: 'news', label: 'News' },
          ]}
        />
        {tab === 'overview' && (
          <>
            {overview.isPending && <Loading />}
            {overview.data?.statistics ? <StatSplits stats={overview.data.statistics} /> : null}
            <Card title="Bio">
              {bio.map(([k, v]) => (
                <View key={k}>
                  <Divider />
                  <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 16, paddingVertical: 11 }}>
                    <Muted style={{ width: 104, fontSize: 14 }}>{k}</Muted>
                    <Text style={{ flex: 1, fontSize: 14 }}>{v}</Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}
        {tab === 'log' && <GameLog league={league} q={log} />}
        {tab === 'news' && <PlayerNews news={overview.data?.news} />}
      </View>
    </ScrollView>
  )
}

function StatSplits({ stats }: { stats: any }) {
  const labels: string[] = stats.labels ?? []
  const splits: any[] = (stats.splits ?? []).filter((s: any) => s.displayName !== 'Projected')
  if (!splits.length) return null
  const headline = splits[0]
  const keyIdx = pickKeyStats(labels)
  const rows: TableRow[] = splits.map((s) => ({
    key: s.displayName,
    left: <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '500' }}>{s.displayName}</Text>,
    cells: s.stats,
  }))
  return (
    <Card title={stats.displayName ?? 'Stats'}>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
        {keyIdx.map((i) => (
          <View key={i} style={{ flex: 1, backgroundColor: colors.raised, borderRadius: 14, borderCurve: 'continuous', paddingVertical: 10, alignItems: 'center' }}>
            <Text tnum style={{ fontFamily: scoreFont, fontSize: 28, lineHeight: 30 }}>{headline.stats[i]}</Text>
            <Muted style={{ fontSize: 11, marginTop: 2 }}>{labels[i]}</Muted>
          </View>
        ))}
      </View>
      <StatTable headers={labels} rows={rows} leftWidth={112} />
    </Card>
  )
}

const PREFERRED = ['PTS', 'REB', 'AST', 'FG%', 'YDS', 'TD', 'REC', 'INT', 'RTG', 'CAR', 'TOT', 'SACK']

function pickKeyStats(labels: string[]) {
  const out: number[] = []
  for (const p of PREFERRED) {
    const i = labels.indexOf(p)
    if (i >= 0 && !out.includes(i)) out.push(i)
    if (out.length === 4) break
  }
  return out
}

function GameLog({ league, q }: { league: LeagueId; q: ReturnType<typeof useQuery<any>> }) {
  if (q.isPending || q.isFetching) return <Loading />
  if (q.isError) return <ErrorState error={q.error} retry={q.refetch} />
  const d = q.data
  const labels: string[] = d?.labels ?? []
  const events = d?.events ?? {}
  const seasons: any[] = d?.seasonTypes ?? []
  if (!seasons.length) return <Empty>No games played yet.</Empty>

  return (
    <>
      {seasons.map((st) => {
        const evs = (st.categories ?? []).filter((c: any) => c.type === 'event').flatMap((c: any) => c.events ?? [])
        if (!evs.length) return null
        const rows: TableRow[] = evs.map((r: any) => {
          const e = events[r.eventId] ?? {}
          return {
            key: r.eventId,
            href: `/game/${league}/${r.eventId}`,
            left: (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text tnum style={{ fontSize: 12, color: colors.faint, width: 34 }}>{e.gameDate ? new Date(e.gameDate).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }) : ''}</Text>
                <Logo src={teamLogo(league, e.opponent?.abbreviation, 32, e.opponent?.id)} size={16} />
                <Text style={{ fontSize: 13, fontWeight: '500' }}>{e.opponent?.abbreviation}</Text>
              </View>
            ),
            cells: [`${e.gameResult ?? ''} ${e.score ?? ''}`.trim(), ...r.stats],
          }
        })
        return (
          <Card key={st.displayName} title={st.displayName}>
            <StatTable headLeft="Game" headers={['Result', ...labels]} rows={rows} leftWidth={116} />
          </Card>
        )
      })}
    </>
  )
}

function PlayerNews({ news }: { news?: any[] }) {
  if (!news?.length) return <Empty>No recent stories.</Empty>
  return (
    <Card>
      {news.map((n, i) => (
        <View key={n.id ?? n.headline}>
          {i > 0 && <Divider />}
          <Pressable onPress={() => n.links?.web?.href && WebBrowser.openBrowserAsync(n.links.web.href)} style={({ pressed }) => ({ flexDirection: 'row', gap: 12, padding: 14, backgroundColor: pressed ? colors.raised : 'transparent' })}>
            {n.images?.[0]?.url ? <Image source={n.images[0].url} contentFit="cover" style={{ width: 104, height: 58, borderRadius: 10, borderCurve: 'continuous' }} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', lineHeight: 19 }}>{n.headline}</Text>
              {n.published ? <Text style={{ marginTop: 4, fontSize: 12, color: colors.faint }}>{ago(n.published)}</Text> : null}
            </View>
          </Pressable>
        </View>
      ))}
    </Card>
  )
}
