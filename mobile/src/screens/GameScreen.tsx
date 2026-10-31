import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useMemo, useState } from 'react'
import { Animated, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useHeaderInset } from '@/components/Hero'
import { BoxScore } from '@/components/game/BoxScore'
import { CurrentDrive } from '@/components/game/Gamecast'
import { CompactHeader, GameHeader } from '@/components/game/GameHeader'
import { chartPlays, PlayByPlayCard, Plays } from '@/components/game/Plays'
import { isFootball, liveDrive } from '@/components/game/football'
import { GameInfo, Injuries, LastFive, Leaders, LineScore, OddsCard, periodLabel, Predictor, SeasonSeries, Section, Standings, TeamStatsBars, TeamStatsTable } from '@/components/game/sections'
import { WinChart } from '@/components/game/WinChart'
import { Card, ErrorState, Loading, Muted, Text, usePullRefresh } from '@/components/ui'
import { getSummary, type Game, type LeagueId } from '@/lib/espn'
import { colors } from '@/theme'

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

  // The compact header fades in as the bottom of the full header passes under the nav bar.
  const [scrollY] = useState(() => new Animated.Value(0))
  const [headerH, setHeaderH] = useState(0)
  const [compact, setCompact] = useState(false)
  const fadeStart = Math.max(1, headerH - headerInset - 40)
  const opacity = scrollY.interpolate({ inputRange: [fadeStart, fadeStart + 30], outputRange: [0, 1], extrapolate: 'clamp' })
  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
        listener: (e: { nativeEvent: { contentOffset: { y: number } } }) => {
          const on = e.nativeEvent.contentOffset.y > fadeStart + 15
          setCompact((c) => (c === on ? c : on))
        },
      }),
    [scrollY, fadeStart],
  )

  const data = q.data
  const drive = useMemo(() => (data && data.game.state === 'in' && isFootball(data.game) ? liveDrive(data.raw, data.game) : undefined), [data])

  const scroll = { contentInsetAdjustmentBehavior: 'never' as const, showsVerticalScrollIndicator: false, refreshControl: refresh }
  const bottom = insets.bottom + 90

  if (q.isPending)
    return (
      <ScrollView {...scroll} contentContainerStyle={{ paddingTop: headerInset }}>
        <Loading />
      </ScrollView>
    )
  if (q.isError || !data)
    return (
      <ScrollView {...scroll} contentContainerStyle={{ paddingTop: headerInset + 12, paddingHorizontal: 12 }}>
        <ErrorState error={q.error} retry={q.refetch} />
      </ScrollView>
    )

  const { game, raw } = data
  const started = game.state !== 'pre'
  const football = isFootball(game)
  const tabs: { value: Tab; label: string }[] = started
    ? [
        { value: 'game', label: 'Gamecast' },
        { value: 'box', label: 'Box Score' },
        { value: 'plays', label: 'Play-by-Play' },
        { value: 'stats', label: 'Team Stats' },
      ]
    : [{ value: 'game', label: 'Gamecast' }]
  const plays = chartPlays(raw)
  const pl = (p: number) => periodLabel(league, p)
  const active = started ? tab : 'game'
  const go = (t: Tab) => {
    setTab(t)
    Haptics.selectionAsync()
  }
  const hasChart = started && (raw.winprobability?.length > 1 || plays.length > 1)

  return (
    <View style={{ flex: 1 }}>
      <Animated.ScrollView {...scroll} onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: bottom }}>
        <View onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}>
          <GameHeader game={game} drive={drive} />
        </View>
        <Tabs tabs={tabs} value={active} onChange={go} />
        <View style={{ padding: 12, gap: 12 }}>
          {active === 'game' && (
            <>
              {drive ? <CurrentDrive raw={raw} game={game} /> : null}
              {!football && game.state === 'in' && game.situation?.lastPlay ? <Situation game={game} /> : null}
              <LineScore game={game} />
              {started && football ? <PlayByPlayCard raw={raw} game={game} onMore={() => go('plays')} /> : null}
              {!started && <Predictor raw={raw} game={game} />}
              <Leaders raw={raw} game={game} title={started ? 'Game leaders' : 'Season leaders'} />
              {started && <TeamStatsBars raw={raw} game={game} onMore={() => go('stats')} />}
              {hasChart ? (
                <Section title={raw.winprobability?.length > 1 ? 'Win probability' : 'Game flow'} sub={raw.winprobability?.length > 1 ? 'According to ESPN Analytics' : undefined}>
                  <View style={{ paddingTop: 12 }}>
                    <WinChart winprob={raw.winprobability ?? []} plays={plays} home={game.home} away={game.away} periodLabel={pl} />
                  </View>
                </Section>
              ) : null}
              <OddsCard game={game} />
              <Standings raw={raw} game={game} />
              <Injuries raw={raw} game={game} />
              <LastFive raw={raw} game={game} />
              <SeasonSeries raw={raw} game={game} />
              <GameInfo raw={raw} game={game} />
            </>
          )}
          {active === 'box' && <BoxScore raw={raw} game={game} />}
          {active === 'plays' && <Plays raw={raw} game={game} />}
          {active === 'stats' && <TeamStatsTable raw={raw} game={game} />}
        </View>
      </Animated.ScrollView>
      <CompactHeader game={game} drive={drive} opacity={opacity} active={compact} />
    </View>
  )
}

/** ESPN's text tabs: the active one is white with an underline, the rest are dimmed. */
function Tabs({ tabs, value, onChange }: { tabs: { value: Tab; label: string }[]; value: Tab; onChange: (t: Tab) => void }) {
  return (
    <View style={{ borderBottomWidth: 0.5, borderBottomColor: colors.lineStrong }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 22 }}>
        {tabs.map((t) => {
          const on = t.value === value
          return (
            <Pressable key={t.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => !on && onChange(t.value)} style={{ paddingTop: 14 }}>
              <Text style={{ fontSize: 15, fontWeight: on ? '700' : '500', color: on ? colors.fg : colors.faint, paddingBottom: 11 }}>{t.label}</Text>
              <View style={{ height: 3, borderRadius: 1.5, backgroundColor: on ? colors.fg : 'transparent' }} />
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

function Situation({ game }: { game: Game }) {
  const s = game.situation!
  return (
    <Card>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 4 }}>
        {s.downDistance ? <Text style={{ fontSize: 13, fontWeight: '600' }}>{s.downDistance}</Text> : null}
        <Muted style={{ fontSize: 13 }}>{s.lastPlay}</Muted>
      </View>
    </Card>
  )
}
