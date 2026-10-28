import { useState } from 'react'
import { View } from 'react-native'
import type { Game } from '@/lib/espn'
import { StatTable, type TableRow } from '../StatTable'
import { Card, Empty, Segmented, Text } from '../ui'
import { colors } from '@/theme'

type Any = any

const GROUP_TITLES: Record<string, string> = {
  passing: 'Passing',
  rushing: 'Rushing',
  receiving: 'Receiving',
  fumbles: 'Fumbles',
  defensive: 'Defense',
  interceptions: 'Interceptions',
  kickReturns: 'Kick returns',
  puntReturns: 'Punt returns',
  kicking: 'Kicking',
  punting: 'Punting',
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())

export function BoxScore({ raw, game }: { raw: Any; game: Game }) {
  const [side, setSide] = useState<'away' | 'home'>('away')
  const players: Any[] = raw.boxscore?.players ?? []
  const s = side === 'away' ? game.away : game.home
  const team = players.find((p) => String(p.team?.id) === s.id)
  if (!players.length) return <Empty>Box score will appear once the game starts.</Empty>

  return (
    <View style={{ gap: 12 }}>
      <Segmented
        value={side}
        onChange={setSide}
        options={[
          { value: 'away', label: game.away.abbr },
          { value: 'home', label: game.home.abbr },
        ]}
      />
      {(team?.statistics ?? [])
        .filter((g: Any) => g.athletes?.length)
        .map((g: Any, i: number) => (
          <StatGroup key={g.name ?? i} group={g} league={game.league} title={GROUP_TITLES[g.name] ?? (game.league === 'nba' ? undefined : g.name)} />
        ))}
    </View>
  )
}

function StatGroup({ group, league, title }: { group: Any; league: string; title?: string }) {
  const labels: string[] = group.labels ?? group.names ?? []
  const athletes: Any[] = group.athletes ?? []
  const isNba = league === 'nba'
  const starters = isNba ? athletes.filter((a) => a.starter) : athletes
  const bench = isNba ? athletes.filter((a) => !a.starter) : []

  const toRow = (a: Any): TableRow => ({
    key: String(a.athlete?.id),
    href: `/player/${league}/${a.athlete?.id}`,
    left: (
      <Text numberOfLines={1} style={{ fontSize: 13 }}>
        <Text style={{ fontSize: 13, fontWeight: '500' }}>{a.athlete?.shortName ?? a.athlete?.displayName}</Text>
        <Text style={{ fontSize: 10, color: colors.faint }}> {a.athlete?.position?.abbreviation ?? (a.athlete?.jersey ? `#${a.athlete.jersey}` : '')}</Text>
      </Text>
    ),
    cells: labels.map((_, i) => a.stats?.[i]),
    note: a.didNotPlay || !a.stats?.length ? (a.reason ? titleCase(a.reason) : 'Did not play') : undefined,
  })

  const rows: TableRow[] = [
    ...starters.map(toRow),
    ...(bench.length ? [{ key: 'bench', left: <Text style={{ fontSize: 11, color: colors.faint }}>Bench</Text>, cells: [], note: ' ' } satisfies TableRow] : []),
    ...bench.map(toRow),
    ...(group.totals?.some(Boolean)
      ? [{ key: 'totals', left: <Text style={{ fontSize: 13, fontWeight: '600' }}>Team</Text>, cells: group.totals as string[], bold: true, topBorder: 'strong' } satisfies TableRow]
      : []),
  ]
  const boldCols = labels.map((l, i) => (l === 'PTS' ? i : -1)).filter((i) => i >= 0)

  return (
    <Card title={title}>
      <StatTable headLeft={isNba ? 'Starters' : ''} headers={labels} rows={rows} boldCols={boldCols} />
    </Card>
  )
}
