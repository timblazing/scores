import { useQuery } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Avatar, HeadToHead, MatchupCard } from '@/components/fantasy'
import { useHeaderInset } from '@/components/Hero'
import { StatTable, type TableRow } from '@/components/StatTable'
import { STRIP_HEIGHT, Strip, type StripItem } from '@/components/Strip'
import { Card, Empty, ErrorState, HeaderMenu, Loading, Tabs, Text, usePullRefresh } from '@/components/ui'
import { getScoreboard } from '@/lib/espn'
import { setFantasyLeague, setFantasyView, useFantasySelection } from '@/lib/fantasySelection'
import { FANTASY_LEAGUES, SLEEPER_USER_ID, type FantasyLeague, type FantasyMatchup, type FantasyTeam } from '@/lib/sleeper'
import { scoreMatchup, useFantasyLeague, useFantasyMatchups, useFantasyPlayers, useFantasyTeams, useNflState, useNflWeekGames, useProjections } from '@/lib/useFantasy'
import { colors } from '@/theme'

const scrollProps = { contentInsetAdjustmentBehavior: 'automatic' as const, showsVerticalScrollIndicator: false }

export default function FantasyScreen() {
  const { league, view } = useFantasySelection()
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.View>
          <HeaderMenu value={league} onChange={setFantasyLeague} options={FANTASY_LEAGUES.map((l) => ({ value: l.id, label: l.short }))} />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View hidesSharedBackground>
          <Tabs
            value={view}
            onChange={setFantasyView}
            options={[
              { value: 'matchup', label: 'Matchup' },
              { value: 'league', label: 'League' },
              { value: 'standings', label: 'Standings' },
            ]}
          />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
      {view === 'standings' ? <StandingsView key={league} id={league} /> : <WeekView key={league} id={league} mine={view === 'matchup'} />}
    </>
  )
}

/** Pairs each team's matchup with its opponent's (same matchup id), mine first. */
function pairs(ms: FantasyMatchup[], myRoster?: number) {
  const out: [FantasyMatchup, FantasyMatchup | undefined][] = []
  const seen = new Set<number>()
  const sorted = [...ms].sort((x, y) => Number(y.rosterId === myRoster) - Number(x.rosterId === myRoster) || (x.matchupId ?? 99) - (y.matchupId ?? 99))
  for (const m of sorted) {
    if (seen.has(m.rosterId)) continue
    const opp = m.matchupId == null ? undefined : ms.find((o) => o.matchupId === m.matchupId && o.rosterId !== m.rosterId)
    seen.add(m.rosterId)
    if (opp) seen.add(opp.rosterId)
    out.push([m, opp])
  }
  return out
}

const lastWeek = (l: FantasyLeague) => Math.min(18, l.playoffWeekStart + 2)

/** The week strip plus either my matchup in full or every matchup in the league. */
function WeekView({ id, mine }: { id: string; mine: boolean }) {
  const inset = useHeaderInset()
  const state = useNflState()
  const league = useFantasyLeague(id)
  const teams = useFantasyTeams(id)
  const nflWeeks = useQuery({ queryKey: ['sb', 'nfl', 'current'], queryFn: () => getScoreboard('nfl'), staleTime: 5 * 60_000 })
  const [pick, setPick] = useState<number | null>(null)

  const last = league.data ? lastWeek(league.data) : 17
  const current = !state.data ? 1 : state.data.seasonType === 'pre' ? 1 : state.data.seasonType === 'regular' ? Math.min(state.data.week, last) : last
  const week = pick ?? current
  const items = useMemo<StripItem[]>(() => {
    const detail = new Map((nflWeeks.data?.weeks ?? []).filter((w) => w.seasonType === '2').map((w) => [Number(w.week), w.detail]))
    return Array.from({ length: last }, (_, i) => ({ key: String(i + 1), top: `Week ${i + 1}`, bottom: league.data && i + 1 >= league.data.playoffWeekStart ? 'Playoffs' : (detail.get(i + 1) ?? '') }))
  }, [last, league.data, nflWeeks.data])

  const season = league.data?.season ?? state.data?.season
  const games = useNflWeekGames(season, week)
  const matchups = useFantasyMatchups(id, week, games.live)
  const proj = useProjections(season, week)
  const refresh = usePullRefresh(() => Promise.all([matchups.refetch(), teams.refetch(), state.refetch()]))

  const myRoster = teams.data?.find((t) => t.ownerId === SLEEPER_USER_ID)?.rosterId
  const all = pairs(matchups.data ?? [], myRoster)
  const error = league.error ?? matchups.error ?? teams.error
  const team = (abbr: string | null | undefined) => (abbr ? games.byTeam.get(abbr) : undefined)

  return (
    <View style={{ flex: 1 }}>
      <ScrollView {...scrollProps} refreshControl={refresh} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: STRIP_HEIGHT + 16, paddingBottom: 120, gap: 12 }}>
        {(league.isPending || matchups.isPending) && <Loading />}
        {error && <ErrorState error={error} retry={() => (matchups.refetch(), league.refetch(), teams.refetch())} />}
        {league.data && matchups.data && !all.length && <Empty>No matchups for week {week}.</Empty>}
        {league.data && all.length > 0 && (mine ? <MyMatchup league={league.data} pair={all.find(([a]) => a.rosterId === myRoster)} teams={teams.data} proj={proj} team={team} /> : (
          <>
            {all.map(([a, b]) => {
              const sa = scoreMatchup(a, league.data, proj.data?.stats, team, proj.data?.players ?? new Map())
              const sb = b && scoreMatchup(b, league.data, proj.data?.stats, team, proj.data?.players ?? new Map())
              return <MatchupCard key={a.rosterId} href={`/matchup/${id}/${week}/${a.matchupId ?? `r${a.rosterId}`}`} a={a} b={b} teams={teams.data} projA={sa.projected} projB={sb?.projected} mine={a.rosterId === myRoster} />
            })}
          </>
        ))}
      </ScrollView>
      <Strip items={items} itemWidth={84} selected={String(week)} onSelect={(k) => setPick(Number(k))} top={inset} />
    </View>
  )
}

function MyMatchup({ league, pair, teams, proj, team }: { league: FantasyLeague; pair?: [FantasyMatchup, FantasyMatchup | undefined]; teams?: FantasyTeam[]; proj: ReturnType<typeof useProjections>; team: Parameters<typeof HeadToHead>[0]['team'] }) {
  const ids = pair ? [...pair[0].players, ...(pair[1]?.players ?? [])] : []
  const players = useFantasyPlayers(ids, proj.data?.players, !proj.isPending)
  if (!pair) return <Empty>You don’t have a matchup this week.</Empty>
  return <HeadToHead league={league} a={pair[0]} b={pair[1]} teams={teams} proj={proj.data?.stats} players={players} team={team} />
}

/** Head-to-head for any matchup in a league, opened from the League list. `matchup` is a matchup id, or `r<rosterId>` for a team without one. */
export function MatchupDetail({ id, week, matchup }: { id: string; week: number; matchup: string }) {
  const state = useNflState()
  const league = useFantasyLeague(id)
  const teams = useFantasyTeams(id)
  const season = league.data?.season ?? state.data?.season
  const games = useNflWeekGames(season, week)
  const matchups = useFantasyMatchups(id, week, games.live)
  const proj = useProjections(season, week)
  const refresh = usePullRefresh(() => Promise.all([matchups.refetch(), teams.refetch()]))
  const team = (abbr: string | null | undefined) => (abbr ? games.byTeam.get(abbr) : undefined)

  const myRoster = teams.data?.find((t) => t.ownerId === SLEEPER_USER_ID)?.rosterId
  const pair = pairs(matchups.data ?? [], myRoster).find(([a]) => (matchup.startsWith('r') ? `r${a.rosterId}` === matchup : String(a.matchupId) === matchup))
  const error = league.error ?? matchups.error

  return (
    <ScrollView {...scrollProps} refreshControl={refresh} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 120, gap: 12 }}>
      {(league.isPending || matchups.isPending) && <Loading />}
      {error && <ErrorState error={error} retry={() => (matchups.refetch(), league.refetch())} />}
      {league.data && matchups.data && <MyMatchup league={league.data} pair={pair} teams={teams.data} proj={proj} team={team} />}
    </ScrollView>
  )
}

/* ---------- standings ---------- */

const byRecord = (a: FantasyTeam, b: FantasyTeam) => b.wins + b.ties / 2 - (a.wins + a.ties / 2) || b.pointsFor - a.pointsFor

function StandingsView({ id }: { id: string }) {
  const league = useFantasyLeague(id)
  const teams = useFantasyTeams(id)
  const refresh = usePullRefresh(() => Promise.all([teams.refetch(), league.refetch()]))
  const divisions = league.data?.divisions ?? {}
  const groups = Object.keys(divisions).length
    ? Object.entries(divisions).map(([n, name]) => ({ name, teams: (teams.data ?? []).filter((t) => t.division === Number(n)) }))
    : [{ name: undefined, teams: teams.data ?? [] }]

  return (
    <ScrollView {...scrollProps} refreshControl={refresh} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 120, gap: 12 }}>
      {teams.isPending && <Loading />}
      {teams.isError && <ErrorState error={teams.error} retry={teams.refetch} />}
      {teams.data &&
        groups.map((g) => {
          const rows: TableRow[] = [...g.teams].sort(byRecord).map((t, i) => ({
            key: String(t.rosterId),
            bold: t.ownerId === SLEEPER_USER_ID,
            left: (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text tnum style={{ width: 16, textAlign: 'right', fontSize: 12, color: colors.faint }}>{i + 1}</Text>
                <Avatar src={t.avatar} size={22} />
                <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: t.ownerId === SLEEPER_USER_ID ? '700' : '500', flexShrink: 1 }}>
                  {t.name}
                </Text>
              </View>
            ),
            cells: [String(t.wins), String(t.losses), ...(g.teams.some((x) => x.ties) ? [String(t.ties)] : []), t.pointsFor.toFixed(1), t.pointsAgainst.toFixed(1), t.streak ?? ''],
          }))
          const headers = ['W', 'L', ...(g.teams.some((x) => x.ties) ? ['T'] : []), 'PF', 'PA', 'STRK']
          return (
            <Card key={g.name ?? 'all'} title={g.name}>
              <StatTable headLeft="Team" headers={headers} rows={rows} leftWidth={170} minCol={44} />
            </Card>
          )
        })}
    </ScrollView>
  )
}
