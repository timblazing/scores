import { SymbolView } from 'expo-symbols'
import { useMemo, useState } from 'react'
import { Pressable, Switch, View } from 'react-native'
import { teamLogo, type Game } from '@/lib/espn'
import { Card, Divider, Empty, Logo, Muted, Segmented, Text } from '../ui'
import { periodLabel } from './sections'
import type { ChartPlay } from './WinChart'
import { colors } from '@/theme'

type Any = any

/** Flatten ESPN plays (NBA: `plays`, NFL: `drives`) into a single chronological list. */
export function chartPlays(raw: Any): ChartPlay[] {
  const toPlay = (p: Any): ChartPlay => ({
    id: String(p.id),
    period: p.period?.number ?? 0,
    clock: p.clock?.displayValue ?? '',
    text: p.text ?? p.type?.text ?? '',
    awayScore: Number(p.awayScore ?? 0),
    homeScore: Number(p.homeScore ?? 0),
  })
  if (raw.plays?.length) return raw.plays.map(toPlay)
  const drives = [...(raw.drives?.previous ?? []), ...(raw.drives?.current ? [raw.drives.current] : [])]
  const seen = new Set<string>()
  return drives
    .flatMap((d: Any) => d.plays ?? [])
    .filter((p: Any) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .map(toPlay)
}

export function Plays({ raw, game }: { raw: Any; game: Game }) {
  if (raw.plays?.length) return <NbaPlays raw={raw} game={game} />
  if (raw.drives?.previous?.length || raw.drives?.current) return <NflDrives raw={raw} game={game} />
  return <Empty>Play-by-play will appear once the game starts.</Empty>
}

function NbaPlays({ raw, game }: { raw: Any; game: Game }) {
  const periods: number[] = useMemo(() => [...new Set<number>(raw.plays.map((p: Any) => p.period?.number))].filter(Boolean), [raw.plays])
  const [period, setPeriod] = useState<string>(String(periods[periods.length - 1] ?? 1))
  const [scoringOnly, setScoringOnly] = useState(false)
  const teamAbbr = (id?: string) => (id === game.home.id ? game.home.abbr : id === game.away.id ? game.away.abbr : undefined)

  const plays = raw.plays
    .filter((p: Any) => String(p.period?.number) === period && (!scoringOnly || p.scoringPlay))
    .slice()
    .reverse()

  return (
    <View style={{ gap: 12 }}>
      <Segmented value={period} onChange={setPeriod} maxSegments={6} options={periods.map((p) => ({ value: String(p), label: periodLabel(game.league, p) }))} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingHorizontal: 4 }}>
        <Muted style={{ fontSize: 13 }}>Scoring plays only</Muted>
        <Switch value={scoringOnly} onValueChange={setScoringOnly} />
      </View>
      <Card>
        {plays.map((p: Any, i: number) => {
          const abbr = teamAbbr(p.team?.id)
          return (
            <View key={p.id}>
              {i > 0 && <Divider />}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingVertical: 10 }}>
                <Text tnum style={{ width: 44, fontSize: 12, color: colors.faint, paddingTop: 2 }}>{p.clock?.displayValue}</Text>
                <View style={{ width: 20, paddingTop: 1 }}>{abbr ? <Logo src={teamLogo(game.league, abbr, 40, p.team?.id)} size={18} /> : null}</View>
                <Text style={{ flex: 1, fontSize: 14, lineHeight: 19, color: p.scoringPlay ? colors.fg : colors.muted, fontWeight: p.scoringPlay ? '500' : '400' }}>{p.text}</Text>
                <Text tnum style={{ fontSize: 13, color: p.scoringPlay ? colors.fg : colors.faint, fontWeight: p.scoringPlay ? '600' : '400' }}>
                  {p.awayScore}-{p.homeScore}
                </Text>
              </View>
            </View>
          )
        })}
        {!plays.length && <Muted style={{ padding: 24, textAlign: 'center', fontSize: 14 }}>No plays.</Muted>}
      </Card>
    </View>
  )
}

function NflDrives({ raw, game }: { raw: Any; game: Game }) {
  const drives: Any[] = [...(raw.drives.previous ?? [])]
  const cur = raw.drives.current
  if (cur && !drives.some((d) => d.id === cur.id)) drives.push(cur)
  drives.reverse()
  const [open, setOpen] = useState<string | null>(drives[0]?.id ?? null)

  return (
    <Card>
      {drives.map((d, i) => {
        const isOpen = open === d.id
        const last = d.plays?.[d.plays.length - 1]
        return (
          <View key={d.id}>
            {i > 0 && <Divider />}
            <Pressable onPress={() => setOpen(isOpen ? null : d.id)} accessibilityState={{ expanded: isOpen }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
              <Logo src={teamLogo(game.league, d.team?.abbreviation, 48, d.team?.id)} size={24} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: d.isScore ? '600' : '500' }}>{d.displayResult ?? d.result ?? 'In progress'}</Text>
                <Muted numberOfLines={1} style={{ fontSize: 12 }}>{d.description}</Muted>
              </View>
              {last ? (
                <Text tnum style={{ fontSize: 13, fontWeight: '600' }}>
                  {last.awayScore}-{last.homeScore}
                </Text>
              ) : null}
              <SymbolView name={isOpen ? 'chevron.up' : 'chevron.down'} size={13} tintColor={colors.faint} />
            </Pressable>
            {isOpen && (
              <View style={{ gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.4)' }}>
                {(d.plays ?? [])
                  .slice()
                  .reverse()
                  .map((p: Any) => (
                    <View key={p.id}>
                      <Text style={{ fontSize: 11, color: colors.faint }}>
                        {[p.start?.downDistanceText, `${periodLabel(game.league, p.period?.number)} ${p.clock?.displayValue ?? ''}`].filter(Boolean).join(' · ')}
                      </Text>
                      <Text style={{ fontSize: 13, lineHeight: 18, color: p.scoringPlay ? colors.fg : colors.muted, fontWeight: p.scoringPlay ? '500' : '400' }}>{p.text}</Text>
                    </View>
                  ))}
              </View>
            )}
          </View>
        )
      })}
    </Card>
  )
}
