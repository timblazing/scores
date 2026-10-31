import { useQueries } from '@tanstack/react-query'
import { Link } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import * as Haptics from 'expo-haptics'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { getRoster, headshot, type Game } from '@/lib/espn'
import { Divider, Headshot, Logo, Muted, Text } from '../ui'
import { colors } from '@/theme'
import { Field } from './Field'
import { liveDrive, playPlayers, playTitle, rosterPositions, winAfter, type LiveDrive } from './football'
import { PlayCard } from './Plays'
import { Chip, Section } from './sections'

type Any = any

/** Team rosters, only for player positions on the last-play cards. Cached for a day. */
function usePositions(game: Game, enabled: boolean) {
  const rosters = useQueries({
    queries: [game.away.id, game.home.id].map((id) => ({
      queryKey: ['roster', game.league, id],
      queryFn: () => getRoster(game.league, id),
      staleTime: 24 * 3600_000,
      enabled,
    })),
  })
  const a = rosters[0].data
  const h = rosters[1].data
  return useMemo(() => rosterPositions(h, rosterPositions(a, new Map())), [a, h])
}

/** ESPN Gamecast "Current Drive": down and spot, the animated field, and the last play with the players in it. */
export function CurrentDrive({ raw, game }: { raw: Any; game: Game }) {
  const drive = useMemo(() => liveDrive(raw, game), [raw, game])
  const positions = usePositions(game, !!drive)
  const [expanded, setExpanded] = useState(false)
  if (!drive?.team) return null
  return (
    <Section
      title="Current drive"
      sub={drive.description}
      icon={<Logo src={drive.team.logo} size={28} />}
      action={
        drive.plays.length ? (
          <Pressable
            hitSlop={12}
            accessibilityLabel={expanded ? 'Hide drive plays' : 'Show drive plays'}
            onPress={() => {
              Haptics.selectionAsync()
              setExpanded(!expanded)
            }}
          >
            <SymbolView name={expanded ? 'arrow.down.right.and.arrow.up.left' : 'arrow.up.left.and.arrow.down.right'} size={16} tintColor={colors.muted} />
          </Pressable>
        ) : null
      }
    >
      <View style={{ flexDirection: 'row', paddingVertical: 12 }}>
        <Stat label="Down" value={drive.down ?? '—'} />
        <View style={{ width: 0.5, backgroundColor: colors.lineStrong }} />
        <Stat label="Ball on" value={drive.spot ?? '—'} />
      </View>
      <View style={{ paddingHorizontal: 10, paddingTop: 4 }}>
        <Field game={game} drive={drive} />
      </View>
      {drive.last ? <LastPlay raw={raw} game={game} drive={drive} positions={positions} /> : null}
      {expanded && (
        <>
          <Divider />
          <View style={{ gap: 8, padding: 12 }}>
            {drive.plays
              .slice(0, -1)
              .reverse()
              .map((p) => (
                <PlayCard key={p.id} p={p} game={game} />
              ))}
          </View>
        </>
      )}
    </Section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Muted style={{ fontSize: 12 }}>{label}:</Muted>
      <Text style={{ fontSize: 17, fontWeight: '800' }}>{value}</Text>
    </View>
  )
}

function LastPlay({ raw, game, drive, positions }: { raw: Any; game: Game; drive: LiveDrive; positions: Map<string, string> }) {
  const p = drive.last
  const players = useMemo(() => playPlayers(raw, game, p, positions), [raw, game, p, positions])
  const win = winAfter(raw, game, String(p.id))
  return (
    <View style={{ margin: 12, marginTop: 8, padding: 12, gap: 6, backgroundColor: colors.raised, borderRadius: 14, borderCurve: 'continuous' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: '800', color: p.scoringPlay ? colors.win : colors.fg }}>{playTitle(p)}</Text>
        {win ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Muted style={{ fontSize: 12 }}>Win %:</Muted>
            <Logo src={win.side.logo} size={16} />
            <Text tnum style={{ fontSize: 13, fontWeight: '700' }}>{win.pct.toFixed(1)}</Text>
          </View>
        ) : null}
        <Chip>Last Play</Chip>
      </View>
      <Text style={{ fontSize: 13, lineHeight: 18, color: colors.muted }}>
        <Text style={{ fontSize: 13, color: colors.faint }}>({p.clock?.displayValue}) </Text>
        {String(p.text ?? '').replace(/^\(\d+:\d+\)\s*/, '')}
      </Text>
      {players.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -12, marginTop: 4 }} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
          {players.map((pl) => (
            <Link key={pl.id} href={`/player/${game.league}/${pl.id}`} asChild>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingLeft: 10, paddingRight: 14, minWidth: 200, borderRadius: 12, borderCurve: 'continuous', borderWidth: 0.5, borderColor: colors.lineStrong, backgroundColor: 'rgba(0,0,0,0.25)' }}>
                <Headshot src={headshot(game.league, pl.id, 44)} size={44} />
                <View>
                  <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700' }}>{pl.name}</Text>
                  <Muted style={{ fontSize: 12 }}>{[pl.side.abbr, pl.position].filter(Boolean).join(', ')}</Muted>
                  {pl.line ? <Muted style={{ fontSize: 12 }}>{pl.line}</Muted> : null}
                </View>
              </Pressable>
            </Link>
          ))}
        </ScrollView>
      ) : null}
      {p.start?.downDistanceText ? <Text style={{ marginTop: 2, fontSize: 12, color: colors.faint }}>{p.start.downDistanceText}</Text> : null}
    </View>
  )
}
