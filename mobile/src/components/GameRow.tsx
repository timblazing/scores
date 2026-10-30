import { Link } from 'expo-router'
import { Pressable, Share, View } from 'react-native'
import { LEAGUES, type Game, type Side } from '@/lib/espn'
import { useFavorites } from '@/lib/favorites'
import { dayLabel, time, ymd } from '@/lib/format'
import { Divider, Logo, Muted, Text, toggleFollow } from './ui'
import { card, colors, radius, scoreFont } from '@/theme'

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

function Score({ side, other, game }: { side: Side; other: Side; game: Game }) {
  if (game.state === 'pre')
    return (
      <Text numberOfLines={1} tnum style={{ width: 56, textAlign: 'center', fontSize: 12, color: colors.faint }}>
        {side.record}
      </Text>
    )
  const lost = game.state === 'post' && (side.winner === false || Number(side.score) < Number(other.score))
  return (
    <View style={{ width: 56, alignItems: 'center' }}>
      <Text tnum style={{ fontFamily: scoreFont, fontSize: 36, lineHeight: 40, color: lost ? colors.faint : colors.fg }}>
        {side.score ?? '-'}
      </Text>
    </View>
  )
}

function Status({ game, showDay }: { game: Game; showDay?: boolean }) {
  if (game.state === 'in')
    return (
      <>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.live, textAlign: 'center' }}>{game.shortDetail.replace(/ - /, ' · ')}</Text>
        {game.situation?.downDistance ? <Muted style={{ fontSize: 11, marginTop: 2 }}>{game.situation.downDistance}</Muted> : null}
      </>
    )
  if (game.state === 'post') return <Text style={{ fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{game.shortDetail}</Text>
  const day = showDay ? dayLabel(ymd(new Date(game.date))) : 'Today'
  return (
    <>
      {day !== 'Today' ? <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, marginBottom: 2 }}>{day}</Text> : null}
      <Text style={{ fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
        {game.timeTBD ? 'TBD' : /postponed|canceled|delayed/i.test(game.detail) ? game.shortDetail : time(game.date)}
      </Text>
      {game.odds?.details ? <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{game.odds.details}</Text> : null}
    </>
  )
}

function shareGame(game: Game) {
  const url = `https://www.espn.com/${LEAGUES[game.league].slug}/game/_/gameId/${game.id}`
  const { away, home } = game
  const line = game.state === 'pre' ? `${away.abbr} at ${home.abbr}` : `${away.abbr} ${away.score ?? ''}, ${home.abbr} ${home.score ?? ''} · ${game.shortDetail}`
  Share.share({ message: line, url })
}

export function GameRow({ game, showDay }: { game: Game; showDay?: boolean }) {
  const { isFav } = useFavorites()
  return (
    <Link href={`/game/${game.league}/${game.id}`} asChild>
      <Link.Trigger>
        <Pressable style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 12, borderRadius: radius }}>
          <Team side={game.away} game={game} />
          <Score side={game.away} other={game.home} game={game} />
          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 2 }}>
            <Status game={game} showDay={showDay} />
            {game.broadcast && game.state === 'pre' ? (
              <Text numberOfLines={1} style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                {game.broadcast}
              </Text>
            ) : null}
          </View>
          <Score side={game.home} other={game.away} game={game} />
          <Team side={game.home} game={game} />
        </Pressable>
      </Link.Trigger>
      <Link.Preview />
      <Link.Menu>
        {[game.away, game.home].map((s) => {
          const on = isFav(game.league, s.id)
          return (
            <Link.MenuAction
              key={s.id}
              title={`${on ? 'Unfollow' : 'Follow'} ${s.name}`}
              icon={on ? 'star.slash' : 'star'}
              onPress={() => toggleFollow({ league: game.league, id: s.id, abbr: s.abbr, name: s.displayName || s.name }, on)}
            />
          )
        })}
        <Link.MenuAction title="Share" icon="square.and.arrow.up" onPress={() => shareGame(game)} />
      </Link.Menu>
    </Link>
  )
}

/** `showDay` labels upcoming games that aren't today with their day. */
export function GameList({ games, showDay }: { games: Game[]; showDay?: boolean }) {
  return (
    <View style={card}>
      {games.map((g, i) => (
        <View key={g.id}>
          {i > 0 && <Divider />}
          <GameRow game={g} showDay={showDay} />
        </View>
      ))}
    </View>
  )
}
