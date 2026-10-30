import { Link } from 'expo-router'
import { Pressable, View } from 'react-native'
import { FavButton, Logo, Muted, Text, toggleFollow } from './ui'
import { teamLogo, type LeagueId } from '@/lib/espn'
import { useFavorites } from '@/lib/favorites'
import { colors } from '@/theme'

export function TeamItem({ league, id, abbr, name, sub, onPress }: { league: LeagueId; id: string; abbr: string; name: string; sub?: string; onPress?: () => void }) {
  const { isFav } = useFavorites()
  const on = isFav(league, id)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Link href={`/team/${league}/${id}`} onPress={onPress} asChild>
        <Link.Trigger>
          <Pressable style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 16, borderRadius: 12 }}>
            <Logo src={teamLogo(league, abbr, 64, id)} size={28} />
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 16, fontWeight: '500' }}>{name}</Text>
            {sub ? <Muted style={{ fontSize: 12, color: colors.faint }}>{sub}</Muted> : null}
          </Pressable>
        </Link.Trigger>
        <Link.Preview />
        <Link.Menu>
          <Link.MenuAction title={on ? 'Unfollow' : 'Follow'} icon={on ? 'star.slash' : 'star'} onPress={() => toggleFollow({ league, id, abbr, name }, on)} />
        </Link.Menu>
      </Link>
      <View style={{ paddingRight: 10 }}>
        <FavButton fav={{ league, id, abbr, name }} size={20} />
      </View>
    </View>
  )
}
