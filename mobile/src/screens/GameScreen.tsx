import { useQuery } from '@tanstack/react-query'
import { Link, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Hero, shade, useHeaderInset } from '@/components/Hero'
import { BoxScore } from '@/components/game/BoxScore'
import { chartPlays, Plays } from '@/components/game/Plays'
import { GameInfo, Injuries, LastFive, Leaders, LineScore, OddsCard, periodLabel, Predictor, ScoringSummary, SeasonSeries, TeamStatsCompare } from '@/components/game/sections'
import { WinChart } from '@/components/game/WinChart'
import { Card, ErrorState, Loading, Logo, Muted, Segmented, Text, usePullRefresh } from '@/components/ui'
import { getSummary, LEAGUES, teamLogo, type Game, type LeagueId, type Side } from '@/lib/espn'
import { dateTime, readable, time } from '@/lib/format'
import { colors, scoreFont } from '@/theme'

type Tab = 'game' | 'box' | 'plays' | 'stats'

export default function GameScreen() {
  const { league, id } = useLocalSearchParams<{ league: LeagueId; id: string }>()
  const insets = useSafeAreaInsets()
  const q = useQuery({
    queryKey: ['summary', league, id],
    queryFn: () => getSummary(league, id),
    refetchInterval: (query) => (query.state.data?.game.state === 'in' ? 15_000 : false),
  })
  const [tab, setTab] = useState<Tab>('game')
  const refresh = usePullRefresh(() => q.refetch())
  const headerInset = useHeaderInset()

  const scroll = { contentInsetAdjustmentBehavior: 'never' as const, showsVerticalScrollIndicator: false, refreshControl: refresh }
  const bottom = insets.bottom + 90

  if (q.isPending)
    return (
      <ScrollView {...scroll} contentContainerStyle={{ paddingTop: headerInset }}>
        <Loading />
      </ScrollView>
    )
  if (q.isError)
    return (
      <ScrollView {...scroll} contentContainerStyle={{ paddingTop: headerInset + 12, paddingHorizontal: 12 }}>
        <ErrorState error={q.error} retry={q.refetch} />
      </ScrollView>
    )

  const { game, raw } = q.data
  const started = game.state !== 'pre'
  const tabs: { value: Tab; label: string }[] = started
    ? [
        { value: 'game', label: 'Game' },
        { value: 'box', label: 'Box score' },
        { value: 'plays', label: 'Plays' },
        { value: 'stats', label: 'Team' },
      ]
    : [{ value: 'game', label: 'Preview' }]
  const plays = chartPlays(raw)
  const pl = (p: number) => periodLabel(league, p)
  const active = started ? tab : 'game'

  return (
    <ScrollView {...scroll} contentContainerStyle={{ paddingBottom: bottom }}>
      <Header game={game} />
      <View style={{ padding: 12, gap: 12 }}>
        <Segmented value={active} onChange={setTab} options={tabs} />
        {active === 'game' && (
          <>
            {game.state === 'in' && game.situation?.lastPlay ? <Situation game={game} /> : null}
            <LineScore game={game} />
            {started && (raw.winprobability?.length > 1 || plays.length > 1) ? (
              // With win probability, the chart's own Win probability / Game flow switch serves as the title.
              <Card title={raw.winprobability?.length > 1 ? undefined : 'Game flow'} style={raw.winprobability?.length > 1 ? { paddingTop: 16 } : undefined}>
                <WinChart winprob={raw.winprobability ?? []} plays={plays} home={game.home} away={game.away} periodLabel={pl} />
              </Card>
            ) : null}
            {!started && <Predictor raw={raw} game={game} />}
            <Leaders raw={raw} game={game} title={started ? 'Game leaders' : 'Season leaders'} />
            <ScoringSummary raw={raw} game={game} />
            {started && <TeamStatsCompare raw={raw} game={game} limit={6} />}
            <OddsCard game={game} />
            <LastFive raw={raw} game={game} />
            <SeasonSeries raw={raw} game={game} />
            <Injuries raw={raw} game={game} />
            <GameInfo raw={raw} game={game} />
          </>
        )}
        {active === 'box' && <BoxScore raw={raw} game={game} />}
        {active === 'plays' && <Plays raw={raw} game={game} />}
        {active === 'stats' && <TeamStatsCompare raw={raw} game={game} />}
      </View>
    </ScrollView>
  )
}

function Header({ game }: { game: Game }) {
  const insets = useSafeAreaInsets()
  const away = readable(game.away.color)
  const home = readable(game.home.color)
  return (
    <Hero
      colors={[shade(away, 0.6), '#000000', shade(home, 0.6)]}
      start={{ x: 0, y: 0.15 }}
      end={{ x: 1, y: 0.85 }}
      locations={[0, 0.5, 1]}
      watermarks={[
        { src: teamLogo(game.league, game.away.abbr, 400, game.away.id), side: 'left' },
        { src: teamLogo(game.league, game.home.abbr, 400, game.home.id), side: 'right' },
      ]}
    >
      <View pointerEvents="none" style={{ position: 'absolute', top: insets.top, left: 70, right: 70, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '500', color: 'rgba(245,245,245,0.7)' }}>
          {game.note ?? LEAGUES[game.league].name}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingTop: 8 }}>
        <HeaderTeam side={game.away} game={game} />
        <BigScore side={game.away} other={game.home} game={game} />
        <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 2, minWidth: 84 }}>
          {game.state === 'in' ? (
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.live, textAlign: 'center' }}>{game.shortDetail.replace(/ - /, ' · ')}</Text>
          ) : game.state === 'post' ? (
            <Text style={{ fontSize: 14, fontWeight: '600', textAlign: 'center' }}>{game.shortDetail}</Text>
          ) : (
            <>
              <Text style={{ fontSize: 17, fontWeight: '600' }}>{game.timeTBD ? 'TBD' : time(game.date)}</Text>
              <Text style={{ fontSize: 12, color: 'rgba(245,245,245,0.6)', textAlign: 'center' }}>{dateTime(game.date).split(',').slice(0, 2).join(',')}</Text>
            </>
          )}
          {game.broadcast ? (
            <Text numberOfLines={2} style={{ marginTop: 4, fontSize: 11, color: 'rgba(245,245,245,0.6)', textAlign: 'center' }}>
              {game.broadcast}
            </Text>
          ) : null}
        </View>
        <BigScore side={game.home} other={game.away} game={game} />
        <HeaderTeam side={game.home} game={game} />
      </View>
    </Hero>
  )
}

function HeaderTeam({ side, game }: { side: Side; game: Game }) {
  return (
    <View style={{ width: 68, alignItems: 'center', gap: 2 }}>
      <Link href={`/team/${game.league}/${side.id}`} asChild>
        <Pressable style={{ alignItems: 'center', gap: 6 }}>
          <Logo src={side.logo} size={56} />
          <Text style={{ fontSize: 18, fontWeight: '700' }}>
            {side.rank ? <Text tnum style={{ fontSize: 11, fontWeight: '400', color: 'rgba(245,245,245,0.6)' }}>{side.rank} </Text> : null}
            {side.abbr}
          </Text>
        </Pressable>
      </Link>
      <Muted style={{ fontSize: 12, color: 'rgba(245,245,245,0.6)', textAlign: 'center' }}>{side.record}</Muted>
    </View>
  )
}

function BigScore({ side, other, game }: { side: Side; other: Side; game: Game }) {
  if (game.state === 'pre') return <View style={{ width: 4 }} />
  const lost = game.state === 'post' && Number(side.score) < Number(other.score)
  return (
    <Text tnum style={{ fontFamily: scoreFont, fontSize: 52, lineHeight: 56, minWidth: 40, textAlign: 'center', color: lost ? 'rgba(245,245,245,0.45)' : colors.fg }}>
      {side.score}
    </Text>
  )
}

function Situation({ game }: { game: Game }) {
  const s = game.situation!
  return (
    <Card>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 4 }}>
        {s.downDistance ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600' }}>{s.downDistance}</Text>
            {s.isRedZone ? <Text style={{ fontSize: 11, color: colors.live, backgroundColor: 'rgba(255,69,58,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' }}>Red zone</Text> : null}
          </View>
        ) : null}
        <Muted style={{ fontSize: 13 }}>{s.lastPlay}</Muted>
      </View>
    </Card>
  )
}
