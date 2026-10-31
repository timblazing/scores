import { SymbolView } from 'expo-symbols'
import { useMemo, useState } from 'react'
import { Pressable, Switch, View } from 'react-native'
import { teamLogo, type Game } from '@/lib/espn'
import { Card, Divider, Empty, Logo, Muted, Segmented, Text } from '../ui'
import { allDrives, isKeyPlay, playTitle, sideById, type Drive } from './football'
import { Chip, MoreLink, periodLabel, quarterName, Section } from './sections'
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
    downDistance: p.start?.downDistanceText,
  })
  if (raw.plays?.length) return raw.plays.map(toPlay)
  const drives = [...(raw.drives?.previous ?? []), ...(raw.drives?.current ? [raw.drives.current] : [])]
  const seen = new Set<string>()
  return drives
    .flatMap((d: Any) => d.plays ?? [])
    .filter((p: Any) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .map(toPlay)
}

type Filter = 'all' | 'scoring' | 'key'

/** Play-by-Play tab. */
export function Plays({ raw, game }: { raw: Any; game: Game }) {
  if (raw.plays?.length) return <NbaPlays raw={raw} game={game} />
  if (raw.drives?.previous?.length || raw.drives?.current) return <FootballPlays raw={raw} game={game} />
  return <Empty>Play-by-play will appear once the game starts.</Empty>
}

function FootballPlays({ raw, game }: { raw: Any; game: Game }) {
  const [filter, setFilter] = useState<Filter>('all')
  return (
    <View style={{ gap: 12 }}>
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All Plays' },
          { value: 'scoring', label: 'Scoring Plays' },
          { value: 'key', label: 'Key Plays' },
        ]}
      />
      {filter === 'all' && <DriveList raw={raw} game={game} />}
      {filter === 'scoring' && <ScoringPlays raw={raw} game={game} card />}
      {filter === 'key' && <KeyPlays raw={raw} game={game} />}
    </View>
  )
}

/** Gamecast's play-by-play section: scoring plays by default, the latest drives or key plays on request. */
export function PlayByPlayCard({ raw, game, onMore }: { raw: Any; game: Game; onMore: () => void }) {
  const football = !raw.plays?.length
  const [filter, setFilter] = useState<Filter>('scoring')
  if (!football || !(raw.scoringPlays?.length || raw.drives?.previous?.length)) return null
  return (
    <Section title="Play-by-play" divider={false}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'scoring', label: 'Scoring Plays' },
            { value: 'all', label: 'All Plays' },
            { value: 'key', label: 'Key Plays' },
          ]}
        />
      </View>
      {filter === 'scoring' && <ScoringPlays raw={raw} game={game} />}
      {filter === 'all' && <DriveList raw={raw} game={game} limit={4} flat />}
      {filter === 'key' && <KeyPlays raw={raw} game={game} limit={6} flat />}
      <MoreLink label="Full Play-by-Play" onPress={onMore} />
    </Section>
  )
}

function QuarterHeader({ label, first }: { label: string; first?: boolean }) {
  return <Text style={{ paddingHorizontal: 16, paddingTop: first ? 12 : 18, paddingBottom: 8, fontSize: 12, fontWeight: '800', letterSpacing: 0.4, color: colors.muted }}>{label.toUpperCase()}</Text>
}

/** Group items by period, latest period first when `latestFirst`. */
function byPeriod<T>(items: T[], period: (t: T) => number, latestFirst: boolean) {
  const groups = new Map<number, T[]>()
  for (const it of items) groups.set(period(it), [...(groups.get(period(it)) ?? []), it])
  const keys = [...groups.keys()].sort((a, b) => (latestFirst ? b - a : a - b))
  return keys.map((k) => ({ period: k, items: groups.get(k)! }))
}

/* ---------- scoring plays ---------- */

export function ScoringPlays({ raw, game, card }: { raw: Any; game: Game; card?: boolean }) {
  const plays: Any[] = raw.scoringPlays ?? []
  const drives = useMemo(() => allDrives(raw, game), [raw, game])
  if (!plays.length) return card ? <Empty>No scoring plays yet.</Empty> : <Muted style={{ padding: 20, textAlign: 'center', fontSize: 14 }}>No scoring plays yet.</Muted>
  const body = (
    <View style={{ paddingBottom: 12 }}>
      {byPeriod(plays, (p) => p.period?.number ?? 0, false).map((g, gi) => (
        <View key={g.period}>
          <QuarterHeader label={quarterName(game.league, g.period)} first={gi === 0} />
          <View style={{ gap: 8, paddingHorizontal: 12 }}>
            {g.items.map((p) => {
              const side = sideById(game, String(p.team?.id))
              const drive = drives.find((d) => d.plays.some((x) => String(x.id) === String(p.id)))
              const scorerIsAway = side === game.away
              return (
                <View key={p.id} style={{ backgroundColor: colors.raised, borderRadius: 14, borderCurve: 'continuous', padding: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Logo src={side?.logo ?? teamLogo(game.league, p.team?.abbreviation, 48, p.team?.id)} size={30} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700' }}>{p.type?.text?.replace(/^(Passing|Rushing) /, '').replace(/ Good$/, '') ?? 'Score'}</Text>
                      <Muted style={{ fontSize: 12 }}>
                        {p.clock?.displayValue} - {periodLabel(game.league, p.period?.number)}
                      </Muted>
                    </View>
                    <ScorePair away={p.awayScore} home={p.homeScore} game={game} bold={scorerIsAway ? 'away' : 'home'} />
                  </View>
                  <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 18, color: colors.muted }}>{p.text}</Text>
                  {drive?.description ? <Text style={{ marginTop: 4, fontSize: 12, color: colors.faint }}>{drive.description}</Text> : null}
                </View>
              )
            })}
          </View>
        </View>
      ))}
    </View>
  )
  return card ? <Card>{body}</Card> : body
}

function ScorePair({ away, home, game, bold }: { away: number; home: number; game: Game; bold: 'away' | 'home' }) {
  const cell = (v: number, abbr: string, on: boolean) => (
    <View style={{ alignItems: 'center', minWidth: 34 }}>
      <Text tnum style={{ fontSize: 17, fontWeight: on ? '800' : '500', color: on ? colors.fg : colors.muted }}>{v}</Text>
      <Text style={{ fontSize: 10, fontWeight: '600', color: colors.faint }}>{abbr}</Text>
    </View>
  )
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {cell(away, game.away.abbr, bold === 'away')}
      {cell(home, game.home.abbr, bold === 'home')}
    </View>
  )
}

/* ---------- a single play ---------- */

export function PlayCard({ p, game, last, logo }: { p: Any; game: Game; last?: boolean; logo?: boolean }) {
  const side = logo ? sideById(game, String(p.teamParticipants?.find((t: Any) => t.type === 'offense')?.id ?? p.start?.team?.id ?? '')) : undefined
  return (
    <View style={{ backgroundColor: colors.raised, borderRadius: 14, borderCurve: 'continuous', padding: 12, gap: 3 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {side ? <Logo src={side.logo} size={20} /> : null}
        <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: p.scoringPlay ? colors.win : colors.fg }}>{playTitle(p)}</Text>
        {last && <Chip>Last Play</Chip>}
      </View>
      <Muted style={{ fontSize: 12 }}>
        {p.clock?.displayValue} - {periodLabel(game.league, p.period?.number)}
      </Muted>
      <Text style={{ fontSize: 13, lineHeight: 18, color: colors.fg, opacity: 0.85 }}>{p.text}</Text>
      {p.start?.downDistanceText ? <Text style={{ marginTop: 2, fontSize: 12, color: colors.faint }}>{p.start.downDistanceText}</Text> : null}
    </View>
  )
}

/* ---------- drives ---------- */

function DriveList({ raw, game, limit, flat }: { raw: Any; game: Game; limit?: number; flat?: boolean }) {
  const drives = useMemo(() => allDrives(raw, game).slice().reverse(), [raw, game])
  const shown = limit ? drives.slice(0, limit) : drives
  const [open, setOpen] = useState<string | null>(drives[0]?.id ?? null)
  const lastPlayId = String(drives[0]?.plays[drives[0].plays.length - 1]?.id ?? '')
  const body = byPeriod(shown, (d) => d.period, true).map((g, gi) => (
    <View key={g.period}>
      <QuarterHeader label={quarterName(game.league, g.period)} first={gi === 0} />
      {g.items.map((d, i) => (
        <View key={d.id}>
          {i > 0 && <Divider />}
          <DriveRow d={d} game={game} open={open === d.id} onToggle={() => setOpen(open === d.id ? null : d.id)} lastPlayId={game.state === 'in' ? lastPlayId : ''} />
        </View>
      ))}
    </View>
  ))
  return flat ? <View style={{ paddingBottom: 8 }}>{body}</View> : <Card style={{ paddingBottom: 8 }}>{body}</Card>
}

function DriveRow({ d, game, open, onToggle, lastPlayId }: { d: Drive; game: Game; open: boolean; onToggle: () => void; lastPlayId: string }) {
  const side = sideById(game, d.teamId)
  const last = d.plays[d.plays.length - 1]
  return (
    <View>
      <Pressable onPress={onToggle} accessibilityState={{ expanded: open }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
        <Logo src={side?.logo} size={28} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: d.isScore ? colors.fg : colors.fg }}>{d.title}</Text>
          {d.description ? <Muted style={{ fontSize: 12 }}>{d.description}</Muted> : null}
        </View>
        {d.current ? (
          <Chip tone="live">In Progress</Chip>
        ) : last ? (
          <Text tnum style={{ fontSize: 13, fontWeight: '700', color: d.isScore ? colors.fg : colors.muted }}>
            {last.awayScore} - {last.homeScore}
          </Text>
        ) : null}
        <SymbolView name={open ? 'chevron.up' : 'chevron.down'} size={12} tintColor={colors.faint} />
      </Pressable>
      {open && (
        <View style={{ gap: 8, paddingHorizontal: 12, paddingBottom: 12 }}>
          {d.plays
            .slice()
            .reverse()
            .map((p) => (
              <PlayCard key={p.id} p={p} game={game} last={String(p.id) === lastPlayId} />
            ))}
        </View>
      )}
    </View>
  )
}

/* ---------- key plays ---------- */

function KeyPlays({ raw, game, limit, flat }: { raw: Any; game: Game; limit?: number; flat?: boolean }) {
  const plays = useMemo(() => {
    const seen = new Set<string>()
    const all = allDrives(raw, game)
      .flatMap((d) => d.plays)
      .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
      .filter(isKeyPlay)
      .reverse()
    return limit ? all.slice(0, limit) : all
  }, [raw, game, limit])
  if (!plays.length) return <Muted style={{ padding: 20, textAlign: 'center', fontSize: 14 }}>No key plays yet.</Muted>
  const body = byPeriod(plays, (p) => p.period?.number ?? 0, true).map((g, gi) => (
    <View key={g.period}>
      <QuarterHeader label={quarterName(game.league, g.period)} first={gi === 0} />
      <View style={{ gap: 8, paddingHorizontal: 12 }}>
        {g.items.map((p) => (
          <PlayCard key={p.id} p={p} game={game} logo />
        ))}
      </View>
    </View>
  ))
  return flat ? <View style={{ paddingBottom: 12 }}>{body}</View> : <Card style={{ paddingBottom: 12 }}>{body}</Card>
}

/* ---------- basketball ---------- */

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
