import { Link } from 'expo-router'
import { Pressable, Share, View } from 'react-native'
import { LEAGUES, type Game, type Side } from '@/lib/espn'
import { useFavorites } from '@/lib/favorites'
import { dayLabel, time, ymd } from '@/lib/format'
import { Divider, Logo, Text, toggleFollow } from './ui'
import { BigScore } from './game/GameHeader'
import { card, colors, radius } from '@/theme'

const DIM = 'rgba(245,245,245,0.65)'

/** Logo, rank and abbreviation, and record, laid out like the game page header. */
function Team({ side, game }: { side: Side; game: Game }) {
  const { isFav } = useFavorites()
  return (
    <View style={{ width: 64, alignItems: 'center', gap: 3 }}>
      <Logo src={side.logo} size={40} />
      <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700' }}>
        {side.rank ? <Text tnum style={{ fontSize: 11, fontWeight: '500', color: DIM }}>{side.rank} </Text> : null}
        {side.abbr}
        {isFav(game.league, side.id) ? <Text style={{ fontSize: 9, color: colors.warn }}> ★</Text> : null}
      </Text>
      {side.record ? <Text style={{ fontSize: 11, color: DIM, marginTop: -2 }}>{side.record}</Text> : null}
    </View>
  )
}

function Status({ game, showDay }: { game: Game; showDay?: boolean }) {
  const sit = game.situation
  if (game.state === 'in')
    return (
      <>
        <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700' }}>
          {game.shortDetail}
        </Text>
        {sit?.downDistance ? <Text style={{ fontSize: 12, color: DIM }}>{sit.downDistance}</Text> : null}
        {sit?.spot ? <Text style={{ fontSize: 12, color: DIM }}>{sit.spot}</Text> : null}
      </>
    )
  if (game.state === 'post') return <Text style={{ fontSize: 14, fontWeight: '700', textAlign: 'center' }}>{game.shortDetail}</Text>
  const day = showDay ? dayLabel(ymd(new Date(game.date))) : 'Today'
  return (
    <>
      {day !== 'Today' ? <Text style={{ fontSize: 12, color: DIM }}>{day}</Text> : null}
      <Text style={{ fontSize: 15, fontWeight: '700', textAlign: 'center' }}>
        {game.timeTBD ? 'TBD' : /postponed|canceled|delayed/i.test(game.detail) ? game.shortDetail : time(game.date)}
      </Text>
      {game.odds?.details ? <Text style={{ fontSize: 12, color: DIM }}>{game.odds.details}</Text> : null}
    </>
  )
}

function shareGame(game: Game) {
  const url = `https://www.espn.com/${LEAGUES[game.league].slug}/game/_/gameId/${game.id}`
  const { away, home } = game
  const line = game.state === 'pre' ? `${away.abbr} at ${home.abbr}` : `${away.abbr} ${away.score ?? ''}, ${home.abbr} ${home.score ?? ''} · ${game.shortDetail}`
  Share.share({ message: line, url })
}

const hasBall = (game: Game, side: Side) => game.state === 'in' && game.situation?.possessionId === side.id

export function GameRow({ game, showDay }: { game: Game; showDay?: boolean }) {
  const { isFav } = useFavorites()
  return (
    <Link href={`/game/${game.league}/${game.id}`} asChild>
      <Link.Trigger>
        <Pressable style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 14, borderRadius: radius }}>
          <Team side={game.away} game={game} />
          <BigScore side={game.away} other={game.home} game={game} ball={hasBall(game, game.away)} align="left" size={34} />
          <View style={{ flex: 1, alignItems: 'center', gap: 1, paddingHorizontal: 2 }}>
            <Status game={game} showDay={showDay} />
          </View>
          <BigScore side={game.home} other={game.away} game={game} ball={hasBall(game, game.home)} align="right" size={34} />
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
