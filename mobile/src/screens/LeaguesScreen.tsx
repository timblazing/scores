import { Link, Stack } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { Pressable, ScrollView } from 'react-native'
import { Card, LeagueIcon, Rows, Text } from '@/components/ui'
import { LEAGUE_TITLES } from '@/lib/espn'
import { useSettings } from '@/lib/settings'
import { colors } from '@/theme'

export default function LeaguesScreen() {
  const { leagues } = useSettings()
  return (
    <>
      <Stack.Title large>Leagues</Stack.Title>
      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 120 }}>
        <Card>
          <Rows>
            {leagues.map((l) => (
              <Link key={l} href={`/league/${l}`} asChild>
                <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 16 }}>
                  <LeagueIcon league={l} size={24} />
                  <Text style={{ flex: 1, fontSize: 17, fontWeight: '500' }}>{LEAGUE_TITLES[l]}</Text>
                  <SymbolView name="chevron.right" size={13} tintColor={colors.faint} />
                </Pressable>
              </Link>
            ))}
          </Rows>
        </Card>
      </ScrollView>
    </>
  )
}
