// ESPN-style game header: logos and big scores either side of the clock,
// down and distance, and a yard-line strip. A compact copy pins to the top once the full header scrolls away.
import { LinearGradient } from 'expo-linear-gradient'
import { Link } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { Animated, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Hero, shade } from '@/components/Hero'
import { LEAGUES, teamLogo, type Game, type Side } from '@/lib/espn'
import { readable, time } from '@/lib/format'
import { Logo, Text } from '../ui'
import { colors } from '@/theme'
import { MiniField } from './Field'
import type { LiveDrive } from './football'

const DIM = 'rgba(245,245,245,0.65)'

export const heroColors = (game: Game): [string, string, string] => [shade(readable(game.away.color), 0.6), '#000000', shade(readable(game.home.color), 0.6)]

export function GameHeader({ game, drive }: { game: Game; drive?: LiveDrive }) {
  const insets = useSafeAreaInsets()
  return (
    <Hero
      colors={heroColors(game)}
      start={{ x: 0, y: 0.15 }}
      end={{ x: 1, y: 0.85 }}
      locations={[0, 0.5, 1]}
      bottom={drive ? 10 : 18}
      watermarks={[
        { src: teamLogo(game.league, game.away.abbr, 400, game.away.id), side: 'left' },
        { src: teamLogo(game.league, game.home.abbr, 400, game.home.id), side: 'right' },
      ]}
    >
      <View pointerEvents="none" style={{ position: 'absolute', top: insets.top, left: 70, right: 70, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '500', color: DIM }}>
          {game.note ?? LEAGUES[game.league].name}
        </Text>
      </View>
      <View style={{ height: 4 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 10 }}>
        <TeamColumn side={game.away} game={game} />
        <BigScore side={game.away} other={game.home} game={game} ball={drive?.team === game.away} align="left" />
        <Center game={game} drive={drive} />
        <BigScore side={game.home} other={game.away} game={game} ball={drive?.team === game.home} align="right" />
        <TeamColumn side={game.home} game={game} />
      </View>
      {drive?.ball != null ? (
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <MiniField drive={drive} game={game} />
        </View>
      ) : null}
    </Hero>
  )
}

function TeamColumn({ side, game }: { side: Side; game: Game }) {
  return (
    <Link href={`/team/${game.league}/${side.id}`} asChild>
      <Pressable style={{ width: 70, alignItems: 'center', gap: 4 }}>
        <Logo src={side.logo} size={52} />
        <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700' }}>
          {side.rank ? <Text tnum style={{ fontSize: 11, fontWeight: '500', color: DIM }}>{side.rank} </Text> : null}
          {side.abbr}
        </Text>
        {side.record ? <Text style={{ fontSize: 12, color: DIM, marginTop: -3 }}>{side.record}</Text> : null}
      </Pressable>
    </Link>
  )
}

/** Big score with the football SF Symbol beside it for the team with the ball. Also used by the Scores list rows. */
export function BigScore({ side, other, game, ball, align, size = 42 }: { side: Side; other: Side; game: Game; ball?: boolean; align: 'left' | 'right'; size?: number }) {
  if (game.state === 'pre') return <View style={{ width: 8 }} />
  const lost = game.state === 'post' && Number(side.score) < Number(other.score)
  const icon = ball ? <SymbolView name="football.fill" size={size * 0.26} tintColor="#fff" style={{ marginHorizontal: 3 }} /> : <View style={{ width: size * 0.26 + 6 }} />
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {align === 'right' && icon}
      <Text tnum style={{ fontSize: size, lineHeight: size * 1.1, fontWeight: '800', letterSpacing: -1, minWidth: size * 0.95, textAlign: 'center', color: lost ? 'rgba(245,245,245,0.45)' : colors.fg }}>
        {side.score}
      </Text>
      {align === 'left' && icon}
    </View>
  )
}

function Center({ game, drive }: { game: Game; drive?: LiveDrive }) {
  const badge = game.broadcast?.split(/,\s*/)[0]
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 2 }}>
      {game.state === 'in' ? (
        <>
          <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700' }}>
            {game.shortDetail}
          </Text>
          {drive?.down ? <Text style={{ fontSize: 12, color: DIM }}>{drive.down}</Text> : null}
          {drive?.spot ? <Text style={{ fontSize: 12, color: DIM }}>{drive.spot}</Text> : null}
        </>
      ) : game.state === 'post' ? (
        <>
          <Text style={{ fontSize: 15, fontWeight: '700' }}>{game.shortDetail}</Text>
          <Text style={{ fontSize: 12, color: DIM }}>{new Date(game.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 12, color: DIM }}>{new Date(game.date).toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' })}</Text>
          <Text style={{ fontSize: 17, fontWeight: '700' }}>{game.timeTBD ? 'TBD' : time(game.date)}</Text>
        </>
      )}
      {badge ? <Badge label={badge} /> : null}
    </View>
  )
}

function Badge({ label }: { label: string }) {
  return (
    <Text numberOfLines={1} style={{ marginTop: 4, fontSize: 10, fontWeight: '800', paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', borderRadius: 3, maxWidth: 110 }}>
      {label}
    </Text>
  )
}

/* ---------- pinned compact header ---------- */

export function CompactHeader({ game, drive, opacity, active }: { game: Game; drive?: LiveDrive; opacity: Animated.AnimatedInterpolation<number>; active: boolean }) {
  const insets = useSafeAreaInsets()
  const sub = [drive?.down, drive?.spot].filter(Boolean).join(' · ')
  const center =
    game.state === 'in' ? game.shortDetail : game.state === 'post' ? game.shortDetail : game.timeTBD ? 'TBD' : time(game.date)
  return (
    <Animated.View pointerEvents={active ? 'box-none' : 'none'} style={{ position: 'absolute', top: 0, left: 0, right: 0, opacity }}>
      <LinearGradient colors={heroColors(game)} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} locations={[0, 0.5, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' }} />
      <View style={{ marginTop: insets.top, height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 58 }}>
        <Logo src={game.away.logo} size={26} />
        <BigScore side={game.away} other={game.home} game={game} ball={drive?.team === game.away} align="left" size={24} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700' }}>{center}</Text>
          {sub ? (
            <Text numberOfLines={1} style={{ fontSize: 10, color: DIM }}>
              {sub}
            </Text>
          ) : null}
        </View>
        <BigScore side={game.home} other={game.away} game={game} ball={drive?.team === game.home} align="right" size={24} />
        <Logo src={game.home.logo} size={26} />
      </View>
      {drive?.ball != null ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 2, paddingBottom: 4 }}>
          <MiniField drive={drive} game={game} />
        </View>
      ) : (
        <View style={{ height: 6 }} />
      )}
      <View style={{ height: 0.5, backgroundColor: colors.lineStrong }} />
    </Animated.View>
  )
}
