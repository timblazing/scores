import { Link } from 'expo-router'
import { Pressable, View } from 'react-native'
import { FavButton, Logo, Muted, Text } from './ui'
import { teamLogo, type LeagueId } from '@/lib/espn'
import { colors } from '@/theme'

export function TeamItem({ league, id, abbr, name, sub }: { league: LeagueId; id: string; abbr: string; name: string; sub?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Link href={`/team/${league}/${id}`} asChild>
        <Pressable style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 16 }}>
          <Logo src={teamLogo(league, abbr, 64, id)} size={28} />
          <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 16, fontWeight: '500' }}>{name}</Text>
          {sub ? <Muted style={{ fontSize: 12, color: colors.faint }}>{sub}</Muted> : null}
        </Pressable>
      </Link>
      <View style={{ paddingRight: 10 }}>
        <FavButton fav={{ league, id, abbr, name }} size={20} />
      </View>
    </View>
  )
}
