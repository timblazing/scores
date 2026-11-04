import { useQuery } from '@tanstack/react-query'
import { router, Stack } from 'expo-router'
import { useMemo, useState } from 'react'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Avatar, HeadToHead, LineupExtrasProvider, MatchupCard, RosterAuditCredit } from '@/components/fantasy'
import { useHeaderInset } from '@/components/Hero'
import { StatTable, type TableRow } from '@/components/StatTable'
import { STRIP_HEIGHT, Strip, type StripItem } from '@/components/Strip'
import { Card, Divider, Empty, ErrorState, HeaderMenu, Loading, Muted, Segmented, Text, usePullRefresh } from '@/components/ui'
import { getScoreboard } from '@/lib/espn'
import { setFantasyLeague, setFantasyView, useFantasySelection } from '@/lib/fantasySelection'
import { useSettings } from '@/lib/settings'
import { shortLeagueName, type FantasyLeague, type FantasyMatchup, type FantasyTeam } from '@/lib/sleeper'
import {
  scoreMatchup,
  useFantasyLeague,
  useFantasyMatchups,
  useFantasyPlayers,
  useFantasyTeams,
  useHeadToHeadHistory,
  useLeagueHistory,
  useMyFantasyLeagues,
  useNflState,
  useNflWeekGames,
  usePlayerValues,
  useProjections,
  useRosterGrades,
} from '@/lib/useFantasy'
import type { RosterGrade } from '@/lib/rosteraudit'
import { colors } from '@/theme'

const scrollProps = { contentInsetAdjustmentBehavior: 'automatic' as const, showsVerticalScrollIndicator: false }

function Prompt({ children, action }: { children: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 8, gap: 12 }}>
      <Empty>{children}</Empty>
      {action && (
        <Pressable onPress={action.onPress} style={{ alignSelf: 'center', backgroundColor: colors.raised, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 100 }}>
          <Text style={{ fontSize: 15, fontWeight: '600' }}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  )
}

export default function FantasyScreen() {
  const { league: stored, view } = useFantasySelection()
  const { sleeper } = useSettings()
  const mine = useMyFantasyLeagues()
  const leagues = mine.visible ?? []
  const league = leagues.find((l) => l.id === stored)?.id ?? leagues[0]?.id

  if (!sleeper || !league) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        {!sleeper ? (
          <Prompt action={{ label: 'Open Settings', onPress: () => router.push('/settings') }}>Add your Sleeper username in Settings</Prompt>
        ) : mine.isPending ? (
          <Loading />
        ) : mine.isError ? (
          <View style={{ padding: 12 }}>
            <ErrorState error={mine.error} retry={mine.refetch} />
          </View>
        ) : (
          <Prompt action={{ label: 'Open Settings', onPress: () => router.push('/settings') }}>{mine.all?.length ? 'All your leagues are hidden' : 'No Sleeper leagues this season'}</Prompt>
        )}
      </>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.View>
          <HeaderMenu value={league} onChange={setFantasyLeague} options={leagues.map((l) => ({ value: l.id, label: l.name, short: shortLeagueName(l.name) }))} />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
      <View style={{ flex: 1 }}>
        {view === 'standings' ? <StandingsView key={league} id={league} /> : <WeekView key={league} id={league} mine={view === 'matchup'} />}
        <ViewTabs view={view} />
      </View>
    </>
  )
}

const VIEWS = [
  { value: 'matchup', label: 'Matchup' },
  { value: 'league', label: 'League' },
  { value: 'standings', label: 'Standings' },
] as const
const TABS_HEIGHT = 40

/** Full-width page tabs pinned under the header, above the week strip. The strip (or Standings' backdrop) paints the background behind them. */
function ViewTabs({ view }: { view: (typeof VIEWS)[number]['value'] }) {
  const top = useHeaderInset()
  return (
    <View style={{ position: 'absolute', top, left: 0, right: 0, height: TABS_HEIGHT, flexDirection: 'row', paddingHorizontal: 12, zIndex: 11 }}>
      {VIEWS.map((o) => {
        const on = o.value === view
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (on) return
              Haptics.selectionAsync()
              setFantasyView(o.value)
            }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: on ? colors.fg : 'transparent' }}
          >
            <Text style={{ fontSize: 15, fontWeight: on ? '700' : '500', color: on ? colors.fg : colors.muted }}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** Blurred bar behind the header and page tabs, for views without a week strip. */
function TabsBackdrop() {
  const top = useHeaderInset()
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: top + TABS_HEIGHT, zIndex: 10, borderBottomWidth: 0.5, borderBottomColor: colors.line }}>
      <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)' }]} />
    </View>
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
  const userId = useSettings().sleeper?.userId
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

  const myRoster = teams.data?.find((t) => t.ownerId === userId)?.rosterId
  const all = pairs(matchups.data ?? [], myRoster)
  const error = league.error ?? matchups.error ?? teams.error
  const team = (abbr: string | null | undefined) => (abbr ? games.byTeam.get(abbr) : undefined)

  return (
    <View style={{ flex: 1 }}>
      <ScrollView {...scrollProps} refreshControl={refresh} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: TABS_HEIGHT + STRIP_HEIGHT + 16, paddingBottom: 120, gap: 12 }}>
        {(league.isPending || matchups.isPending) && <Loading />}
        {error && <ErrorState error={error} retry={() => (matchups.refetch(), league.refetch(), teams.refetch())} />}
        {league.data && matchups.data && !all.length && <Empty>No matchups for week {week}.</Empty>}
        {league.data && all.length > 0 && (mine ? <MyMatchup league={league.data} pair={all.find(([a]) => a.rosterId === myRoster)} teams={teams.data} proj={proj} team={team} /> : (
          <>
            {all.map(([a, b]) => {
              const sa = scoreMatchup(a, league.data, proj.data?.stats, team, proj.data?.players ?? new Map())
              const sb = b && scoreMatchup(b, league.data, proj.data?.stats, team, proj.data?.players ?? new Map())
              return <MatchupCard key={a.rosterId} href={`/matchup/${id}/${week}/${a.matchupId ?? `r${a.rosterId}`}`} a={a} b={b} teams={teams.data} sa={sa} sb={sb} mine={a.rosterId === myRoster} />
            })}
          </>
        ))}
      </ScrollView>
      <Strip items={items} itemWidth={84} selected={String(week)} onSelect={(k) => setPick(Number(k))} top={inset + TABS_HEIGHT} />
    </View>
  )
}

function MyMatchup({ league, pair, teams, proj, team }: { league: FantasyLeague; pair?: [FantasyMatchup, FantasyMatchup | undefined]; teams?: FantasyTeam[]; proj: ReturnType<typeof useProjections>; team: Parameters<typeof HeadToHead>[0]['team'] }) {
  const ids = pair ? [...pair[0].players, ...(pair[1]?.players ?? [])] : []
  const players = useFantasyPlayers(ids, proj.data?.players, !proj.isPending)
  const values = usePlayerValues(league)
  const owner = (m?: FantasyMatchup) => (m ? teams?.find((t) => t.rosterId === m.rosterId)?.ownerId : undefined)
  const series = useHeadToHeadHistory(league.id, owner(pair?.[0]), owner(pair?.[1]))
  if (!pair) return <Empty>You don’t have a matchup this week.</Empty>
  return (
    <LineupExtrasProvider value={{ league: league.id, values: values.data }}>
      <HeadToHead league={league} a={pair[0]} b={pair[1]} teams={teams} proj={proj.data?.stats} players={players} team={team} series={series.data} />
    </LineupExtrasProvider>
  )
}

/** Head-to-head for any matchup in a league, opened from the League list. `matchup` is a matchup id, or `r<rosterId>` for a team without one. */
export function MatchupDetail({ id, week, matchup }: { id: string; week: number; matchup: string }) {
  const userId = useSettings().sleeper?.userId
  const state = useNflState()
  const league = useFantasyLeague(id)
  const teams = useFantasyTeams(id)
  const season = league.data?.season ?? state.data?.season
  const games = useNflWeekGames(season, week)
  const matchups = useFantasyMatchups(id, week, games.live)
  const proj = useProjections(season, week)
  const refresh = usePullRefresh(() => Promise.all([matchups.refetch(), teams.refetch()]))
  const team = (abbr: string | null | undefined) => (abbr ? games.byTeam.get(abbr) : undefined)

  const myRoster = teams.data?.find((t) => t.ownerId === userId)?.rosterId
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

type StandingsMode = 'season' | 'power' | 'history'

function StandingsView({ id }: { id: string }) {
  const userId = useSettings().sleeper?.userId
  const league = useFantasyLeague(id)
  const teams = useFantasyTeams(id)
  const grades = useRosterGrades(id)
  const history = useLeagueHistory(id)
  const [picked, setMode] = useState<StandingsMode>('season')
  const refresh = usePullRefresh(() => Promise.all([teams.refetch(), league.refetch()]))
  // Power only exists for leagues RosterAudit grades (dynasty); All-time only when it has the league's history.
  const modes: { value: StandingsMode; label: string }[] = [
    { value: 'season', label: 'Season' },
    ...(grades.data?.length ? [{ value: 'power' as const, label: 'Power' }] : []),
    ...(history.managers.data?.length ? [{ value: 'history' as const, label: 'All-time' }] : []),
  ]
  const mode = modes.some((m) => m.value === picked) ? picked : 'season'
  const divisions = league.data?.divisions ?? {}
  const groups = Object.keys(divisions).length
    ? Object.entries(divisions).map(([n, name]) => ({ name, teams: (teams.data ?? []).filter((t) => t.division === Number(n)) }))
    : [{ name: undefined, teams: teams.data ?? [] }]

  return (
    <View style={{ flex: 1 }}>
      <ScrollView {...scrollProps} refreshControl={refresh} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: TABS_HEIGHT + 12, paddingBottom: 120, gap: 12 }}>
        {modes.length > 1 && <Segmented value={mode} onChange={setMode} options={modes} />}
        {mode === 'power' && grades.data && <PowerRankings grades={grades.data} teams={teams.data} userId={userId} />}
        {mode === 'history' && <LeagueHistory history={history} userId={userId} />}
        {mode === 'season' && teams.isPending && <Loading />}
        {mode === 'season' && teams.isError && <ErrorState error={teams.error} retry={teams.refetch} />}
        {mode === 'season' &&
          teams.data &&
          groups.map((g) => {
            const rows: TableRow[] = [...g.teams].sort(byRecord).map((t, i) => ({
              key: String(t.rosterId),
              bold: t.ownerId === userId,
              left: (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text tnum style={{ width: 16, textAlign: 'right', fontSize: 12, color: colors.faint }}>{i + 1}</Text>
                  <Avatar src={t.avatar} size={22} />
                  <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: t.ownerId === userId ? '700' : '500', flexShrink: 1 }}>
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
      <TabsBackdrop />
    </View>
  )
}

function TeamName({ name, avatar, rank, mine }: { name: string; avatar?: string; rank: number; mine?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text tnum style={{ width: 16, textAlign: 'right', fontSize: 12, color: colors.faint }}>{rank}</Text>
      <Avatar src={avatar} size={22} />
      <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: mine ? '700' : '500', flexShrink: 1 }}>
        {name}
      </Text>
    </View>
  )
}

/** RosterAudit's power rankings: rank by projected strength now, contender and dynasty grades, and each team's weak spot. */
function PowerRankings({ grades, teams, userId }: { grades: RosterGrade[]; teams?: FantasyTeam[]; userId?: string }) {
  const sorted = [...grades].sort((a, b) => a.powerRank - b.powerRank)
  const team = (g: RosterGrade) => teams?.find((t) => t.rosterId === g.rosterId)
  const rows: TableRow[] = sorted.map((g) => {
    const t = team(g)
    return {
      key: String(g.rosterId),
      bold: g.ownerId === userId,
      left: <TeamName name={t?.name ?? 'Team'} avatar={t?.avatar} rank={g.powerRank} mine={g.ownerId === userId} />,
      cells: [g.contender, g.dynasty, String(g.dynastyRank), g.projectedPpg ? g.projectedPpg.toFixed(1) : '–'],
    }
  })
  const weak = sorted.filter((g) => g.weakness)
  return (
    <>
      <Card title="Power rankings">
        <StatTable headLeft="Team" headers={['NOW', 'DYN', 'DYN#', 'PPG']} rows={rows} leftWidth={170} minCol={44} />
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 2 }}>
          <Muted style={{ fontSize: 11, color: colors.faint }}>NOW contender grade · DYN dynasty grade · DYN# dynasty rank · PPG projected</Muted>
          <RosterAuditCredit />
        </View>
      </Card>
      {weak.length > 0 && (
        <Card title="Weak spots">
          {weak.map((g, i) => (
            <View key={g.rosterId}>
              {i > 0 && <Divider />}
              <View style={{ paddingHorizontal: 16, paddingVertical: 10, gap: 2 }}>
                <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: g.ownerId === userId ? '700' : '500' }}>
                  {team(g)?.name ?? 'Team'}
                </Text>
                <Muted style={{ fontSize: 13 }}>{g.weakness}</Muted>
              </View>
            </View>
          ))}
        </Card>
      )}
    </>
  )
}

/** Every season the league has played: career records, champions, and the record book. Sections without data are left out. */
function LeagueHistory({ history, userId }: { history: ReturnType<typeof useLeagueHistory>; userId?: string }) {
  const managers = [...(history.managers.data ?? [])].sort((a, b) => b.titles - a.titles || b.winPct - a.winPct || b.pointsFor - a.pointsFor)
  const titles = [...(history.titles.data ?? [])].sort((a, b) => Number(b.season) - Number(a.season))
  const records = history.records.data ?? []
  const ties = managers.some((m) => m.ties)
  const rows: TableRow[] = managers.map((m, i) => ({
    key: m.userId,
    bold: m.userId === userId,
    left: <TeamName name={m.name} avatar={m.avatar} rank={i + 1} mine={m.userId === userId} />,
    cells: [String(m.wins), String(m.losses), ...(ties ? [String(m.ties)] : []), m.pointsFor.toFixed(0), String(m.playoffs), String(m.titles)],
  }))
  return (
    <>
      <Card title="All-time">
        <StatTable headLeft="Manager" headers={['W', 'L', ...(ties ? ['T'] : []), 'PF', 'PO', '🏆']} rows={rows} leftWidth={170} minCol={44} />
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <RosterAuditCredit prefix="PO playoff trips. " />
        </View>
      </Card>
      {titles.length > 0 && (
        <Card title="Champions">
          {titles.map((t, i) => (
            <View key={t.season}>
              {i > 0 && <Divider />}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 }}>
                <Text tnum style={{ fontSize: 14, color: colors.muted, width: 40 }}>{t.season}</Text>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600' }}>{t.champion}</Text>
                  {t.runnerUp ? <Muted numberOfLines={1} style={{ fontSize: 12 }}>def. {t.runnerUp}</Muted> : null}
                </View>
              </View>
            </View>
          ))}
        </Card>
      )}
      {records.length > 0 && (
        <Card title="Record book">
          {records.map((r, i) => (
            <View key={r.label}>
              {i > 0 && <Divider />}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Muted style={{ fontSize: 12 }}>{r.label}</Muted>
                  <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '500' }}>
                    {r.holder}
                    {r.when ? <Muted style={{ fontSize: 12 }}> · {r.when}</Muted> : null}
                  </Text>
                </View>
                <Text tnum style={{ fontSize: 15, fontWeight: '600' }}>{r.value}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}
    </>
  )
}
