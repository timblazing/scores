import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import type { Game, Side } from '@/lib/espn'
import { StatTable, type TableRow } from '../StatTable'
import { Card, Empty, Logo, Text } from '../ui'
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
      <TeamToggle game={game} value={side} onChange={setSide} />
      {(team?.statistics ?? [])
        .filter((g: Any) => g.athletes?.length)
        .map((g: Any, i: number) => (
          <StatGroup key={g.name ?? i} group={g} league={game.league} side={s} title={GROUP_TITLES[g.name] ?? (game.league === 'nba' ? 'Players' : g.name)} />
        ))}
    </View>
  )
}

/** ESPN's two-team pill: logo and name, the selected team filled. */
function TeamToggle({ game, value, onChange }: { game: Game; value: 'away' | 'home'; onChange: (v: 'away' | 'home') => void }) {
  return (
    <View style={{ flexDirection: 'row', padding: 3, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.lineStrong }}>
      {(['away', 'home'] as const).map((k) => {
        const t = game[k]
        const on = k === value
        return (
          <Pressable
            key={k}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (on) return
              Haptics.selectionAsync()
              onChange(k)
            }}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 38, borderRadius: 19, backgroundColor: on ? colors.raised : 'transparent' }}
          >
            <Logo src={t.logo} size={20} />
            <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: on ? '700' : '500', color: on ? colors.fg : colors.faint }}>
              {t.name}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function StatGroup({ group, league, title, side }: { group: Any; league: string; title: string; side: Side }) {
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
        <Text style={{ fontSize: 11, color: colors.faint }}> {isNba ? (a.athlete?.position?.abbreviation ?? '') : a.athlete?.jersey ? `#${a.athlete.jersey}` : ''}</Text>
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
    <Card
      title={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Logo src={side.logo} size={22} />
          <Text style={{ fontSize: 16, fontWeight: '700' }}>
            {side.name} {title}
          </Text>
        </View>
      }
    >
      <StatTable headLeft={isNba ? 'Starters' : ''} headers={labels} rows={rows} boldCols={boldCols} leftWidth={isNba ? 128 : 156} />
    </Card>
  )
}
