import { Link } from 'expo-router'
import { Pressable, View } from 'react-native'
import { hasPossession, type Game, type Side } from '@/lib/espn'
import { useFavorites } from '@/lib/favorites'
import { time } from '@/lib/format'
import { Divider, Logo, Muted, Possession, Text } from './ui'
import { card, colors, scoreFont } from '@/theme'

function Team({ side, game }: { side: Side; game: Game }) {
  const { isFav } = useFavorites()
  return (
    <View style={{ width: 62, alignItems: 'center', gap: 4 }}>
      <Logo src={side.logo} size={38} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        {side.rank ? <Text tnum style={{ fontSize: 10, color: colors.faint }}>{side.rank}</Text> : null}
        <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: colors.muted }}>
          {side.abbr}
        </Text>
        {isFav(game.league, side.id) ? <Text style={{ fontSize: 9, color: colors.warn }}>★</Text> : null}
      </View>
    </View>
  )
}

function Score({ side, other, game, align }: { side: Side; other: Side; game: Game; align: 'left' | 'right' }) {
  if (game.state === 'pre')
    return (
      <Text numberOfLines={1} tnum style={{ width: 56, textAlign: 'center', fontSize: 12, color: colors.faint }}>
        {side.record}
      </Text>
    )
  const lost = game.state === 'post' && (side.winner === false || Number(side.score) < Number(other.score))
  return (
    <View style={{ width: 56, alignItems: 'center' }}>
      <View>
        <Text tnum style={{ fontFamily: scoreFont, fontSize: 36, lineHeight: 40, color: lost ? colors.faint : colors.fg }}>
          {side.score ?? '-'}
        </Text>
        {hasPossession(game, side) ? <Possession side={align} /> : null}
      </View>
    </View>
  )
}

function Status({ game }: { game: Game }) {
  if (game.state === 'in')
    return (
      <>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.live, textAlign: 'center' }}>{game.shortDetail.replace(/ - /, ' · ')}</Text>
        {game.situation?.downDistance ? <Muted style={{ fontSize: 11, marginTop: 2 }}>{game.situation.downDistance}</Muted> : null}
      </>
    )
  if (game.state === 'post') return <Text style={{ fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{game.shortDetail}</Text>
  return (
    <>
      <Text style={{ fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
        {game.timeTBD ? 'TBD' : /postponed|canceled|delayed/i.test(game.detail) ? game.shortDetail : time(game.date)}
      </Text>
      {game.odds?.details ? <Text style={{ fontSize: 11, color: colors.faint, marginTop: 2 }}>{game.odds.details}</Text> : null}
    </>
  )
}

export function GameRow({ game }: { game: Game }) {
  return (
    <Link href={`/game/${game.league}/${game.id}`} asChild>
      <Pressable style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 12 }}>
        <Team side={game.away} game={game} />
        <Score side={game.away} other={game.home} game={game} align="left" />
        <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 2 }}>
          <Status game={game} />
          {game.broadcast && game.state === 'pre' ? (
            <Text numberOfLines={1} style={{ fontSize: 11, color: colors.faint, marginTop: 2 }}>
              {game.broadcast}
            </Text>
          ) : null}
        </View>
        <Score side={game.home} other={game.away} game={game} align="right" />
        <Team side={game.home} game={game} />
      </Pressable>
    </Link>
  )
}

export function GameList({ games }: { games: Game[] }) {
  return (
    <View style={card}>
      {games.map((g, i) => (
        <View key={g.id}>
          {i > 0 && <Divider />}
          <GameRow game={g} />
        </View>
      ))}
    </View>
  )
}
