import { HStack, Host, Image, Menu, Picker, Text as SUIText } from '@expo/ui/swift-ui'
import { font, padding, tag } from '@expo/ui/swift-ui/modifiers'
import { useQuery } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { Stack } from 'expo-router'
import { useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Article } from '@/components/Article'
import { GameList } from '@/components/GameRow'
import { StatTable, type TableRow } from '@/components/StatTable'
import { STRIP_HEIGHT, Strip, type StripItem } from '@/components/Strip'
import { Card, Empty, ErrorState, Loading, Logo, Segmented, Text, usePullRefresh } from '@/components/ui'
import { useHeaderInset } from '@/components/Hero'
import { getNews, getScoreboard, getStandings, LEAGUE_IDS, LEAGUES, type Game, type LeagueId, type Scoreboard, type StandingGroup } from '@/lib/espn'
import { useFavorites } from '@/lib/favorites'
import { addDays, dayLabel, fromYmd, shortDate, todayYmd, ymd } from '@/lib/format'
import { setChoice, setView, useHomeSelection, type Choice } from '@/lib/homeSelection'
import { colors } from '@/theme'

const liveInterval = (q: { data?: Scoreboard | Scoreboard[] }) => {
  const games = [q.data ?? []].flat().flatMap((s) => s.games)
  return games.some((g) => g.state === 'in') ? 15_000 : 60_000
}

const choiceName = (c: Choice) => (c === 'all' ? 'All Leagues' : LEAGUES[c].name)

export default function HomeScreen() {
  const { choice, view } = useHomeSelection()
  const league = choice === 'all' ? null : choice

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.View>
          <LeagueMenu choice={choice} />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
      {league ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.View>
            <Segmented
              width={220}
              value={view}
              onChange={setView}
              options={[
                { value: 'scores', label: 'Scores' },
                { value: 'standings', label: 'Standings' },
                { value: 'news', label: 'News' },
              ]}
            />
          </Stack.Toolbar.View>
        </Stack.Toolbar>
      ) : null}
      {!league || view === 'scores' ? <ScoresView key={choice} choice={choice} /> : view === 'standings' ? <StandingsView key={choice} league={league} /> : <NewsView key={choice} league={league} />}
    </>
  )
}

/** Native SwiftUI menu that reads "NBA ⌄" and lists the leagues with a checkmark on the current one. */
function LeagueMenu({ choice }: { choice: Choice }) {
  return (
    <Host matchContents colorScheme="dark">
      <Menu
        label={
          <HStack spacing={5} modifiers={[padding({ horizontal: 12, vertical: 6 })]}>
            <SUIText modifiers={[font({ size: 17, weight: 'semibold' })]}>{choiceName(choice)}</SUIText>
            <Image systemName="chevron.down" size={13} color={colors.muted} />
          </HStack>
        }
      >
        <Picker
          label=""
          selection={choice}
          onSelectionChange={(c) => {
            Haptics.selectionAsync()
            setChoice(c as Choice)
          }}
        >
          {(['all', ...LEAGUE_IDS] as Choice[]).map((c) => (
            <SUIText key={c} modifiers={[tag(c)]}>
              {choiceName(c)}
            </SUIText>
          ))}
        </Picker>
      </Menu>
    </Host>
  )
}

const scrollProps = { contentInsetAdjustmentBehavior: 'automatic' as const, showsVerticalScrollIndicator: false, keyboardDismissMode: 'on-drag' as const }

/* ---------- scores ---------- */

function useFavFirst(games: Game[]) {
  const { isFav } = useFavorites()
  const mine = games.filter((g) => isFav(g.league, g.home.id) || isFav(g.league, g.away.id))
  const rest = games.filter((g) => !mine.includes(g))
  return { mine, rest }
}

const ranked = (g: Game) => !!(g.home.rank || g.away.rank)

const byState = (a: Game, b: Game) => {
  const rank = { in: 0, pre: 1, post: 2 }
  return rank[a.state] - rank[b.state] || a.date.localeCompare(b.date)
}

function Group({ title, games }: { title?: string; games: Game[] }) {
  return (
    <View>
      {title ? <Text style={{ fontSize: 17, fontWeight: '600', marginBottom: 8, marginLeft: 4 }}>{title}</Text> : null}
      <GameList games={games} />
    </View>
  )
}

function ScoresView({ choice }: { choice: Choice }) {
  if (choice === 'nfl' || choice === 'cfb') return <WeekGames league={choice} />
  return <DayGames leagues={choice === 'all' ? LEAGUE_IDS : [choice]} />
}

function DayGames({ leagues }: { leagues: LeagueId[] }) {
  const inset = useHeaderInset()
  const [date, setDate] = useState(todayYmd())
  const items = useMemo<StripItem[]>(() => {
    const today = fromYmd(todayYmd())
    return Array.from({ length: 21 }, (_, i) => {
      const d = ymd(addDays(today, i - 10))
      return { key: d, top: dayLabel(d), bottom: shortDate(d) }
    })
  }, [])
  const q = useQuery({
    queryKey: ['day', date, leagues],
    queryFn: () => Promise.all(leagues.map((l) => getScoreboard(l, { date }))),
    refetchInterval: (query) => liveInterval(query.state),
  })
  const refresh = usePullRefresh(() => q.refetch())
  const all = (q.data ?? []).flatMap((s) => s.games).sort(byState)
  const { mine, rest: others } = useFavFirst(all)
  // With several leagues on screen, college football is limited to Top 25 games.
  const shown = leagues.length > 1 ? others.filter((g) => g.league !== 'cfb' || ranked(g)) : others
  const live = shown.filter((g) => g.state === 'in')
  const rest = shown.filter((g) => g.state !== 'in')

  return (
    <View style={{ flex: 1 }}>
      <ScrollView {...scrollProps} refreshControl={refresh} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: STRIP_HEIGHT + 20, paddingBottom: 120, gap: 20 }}>
        {q.isPending && <Loading />}
        {q.isError && <ErrorState error={q.error} retry={q.refetch} />}
        {q.data && !mine.length && !shown.length && <Empty>No {leagues.length > 1 ? '' : `${LEAGUES[leagues[0]].name} `}games {dayLabel(date) === 'Today' ? 'today' : `on ${shortDate(date)}`}.</Empty>}
        {mine.length > 0 && <Group title="My Teams" games={mine} />}
        {live.length > 0 && <Group title="Live" games={live} />}
        {leagues.map((l) => {
          const games = rest.filter((g) => g.league === l)
          return games.length ? <Group key={l} title={leagues.length > 1 ? LEAGUES[l].name : undefined} games={games} /> : null
        })}
      </ScrollView>
      <Strip items={items} selected={date} onSelect={setDate} top={inset + 4} />
    </View>
  )
}

function WeekGames({ league }: { league: LeagueId }) {
  const inset = useHeaderInset()
  const [pick, setPick] = useState<{ week: string; type: string } | null>(null)
  // The default call tells us the current week and the full calendar.
  const current = useQuery({ queryKey: ['sb', league, 'current'], queryFn: () => getScoreboard(league), refetchInterval: (q) => liveInterval(q.state) })
  const selected = useQuery({
    queryKey: ['sb', league, pick?.week, pick?.type, current.data?.year],
    queryFn: () => getScoreboard(league, { week: pick!.week, seasonType: pick!.type, year: current.data?.year }),
    enabled: !!pick && !!current.data,
    refetchInterval: (q) => liveInterval(q.state),
  })
  const q = pick ? selected : current
  const data = q.data
  const weeks = (current.data?.weeks ?? []).filter((w) => w.seasonType !== '1' && w.seasonType !== '4')
  const activeWeek = pick?.week ?? String(current.data?.week ?? '')
  const activeType = pick?.type ?? String(current.data?.seasonType ?? '2')
  const items: StripItem[] = weeks.map((w) => ({ key: w.seasonType + ':' + w.week, top: w.seasonType === '3' ? w.label.replace(' Round', '') : w.label, bottom: w.detail }))
  const refresh = usePullRefresh(() => Promise.all([current.refetch(), pick ? selected.refetch() : undefined]))

  const games = [...(data?.games ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  const { mine, rest } = useFavFirst(games)
  mine.sort(byState)
  // Live games first, then (college) Top 25, then everything else by day.
  const live = rest.filter((g) => g.state === 'in')
  const top = league === 'cfb' ? rest.filter((g) => g.state !== 'in' && ranked(g)) : []
  const days = new Map<string, Game[]>()
  for (const g of rest.filter((g) => !live.includes(g) && !top.includes(g))) {
    const key = new Date(g.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
    days.set(key, [...(days.get(key) ?? []), g])
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView {...scrollProps} refreshControl={refresh} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: STRIP_HEIGHT + 20, paddingBottom: 120, gap: 20 }}>
        {q.isPending && <Loading />}
        {q.isError && <ErrorState error={q.error} retry={q.refetch} />}
        {data && !games.length && <Empty>No games scheduled this week.</Empty>}
        {mine.length > 0 && <Group title="My Teams" games={mine} />}
        {live.length > 0 && <Group title="Live" games={live} />}
        {top.length > 0 && <Group title="Top 25" games={top} />}
        {[...days].map(([day, gs]) => (
          <Group key={day} title={day} games={gs} />
        ))}
      </ScrollView>
      {items.length > 0 && (
        <Strip
          items={items}
          itemWidth={84}
          selected={activeType + ':' + activeWeek}
          onSelect={(k) => {
            const [type, week] = k.split(':')
            setPick({ week, type })
          }}
          top={inset + 4}
        />
      )}
    </View>
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
