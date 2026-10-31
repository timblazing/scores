import { Link, Stack } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Switch, View } from 'react-native'
import { SleeperLookup } from '@/components/SleeperLookup'
import { Card, LeagueIcon, Loading, Muted, Rows, Text } from '@/components/ui'
import { LEAGUE_IDS, LEAGUE_TITLES } from '@/lib/espn'
import { useFavorites } from '@/lib/favorites'
import { setOnboarded, setSleeper, toggleFantasyLeague, toggleLeague, useSettings } from '@/lib/settings'
import { useMyFantasyLeagues } from '@/lib/useFantasy'
import { colors } from '@/theme'

const rowStyle = { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 52, paddingVertical: 8 } as const

function Section({ title, footer, children }: { title: string; footer?: string; children: ReactNode }) {
  return (
    <View>
      <Muted style={{ fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, marginLeft: 16 }}>{title}</Muted>
      <Card>{children}</Card>
      {footer ? <Muted style={{ fontSize: 13, marginTop: 8, marginHorizontal: 16 }}>{footer}</Muted> : null}
    </View>
  )
}

export default function SettingsScreen() {
  const { leagues, sleeper, hiddenFantasy } = useSettings()
  const { favs } = useFavorites()
  const mine = useMyFantasyLeagues()
  const [editing, setEditing] = useState(false)

  return (
    <>
      <Stack.Title>Settings</Stack.Title>
      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 60, gap: 24 }}>
        <Section title="Leagues" footer="Scores shows only the leagues you follow.">
          <Rows>
            {LEAGUE_IDS.map((l) => (
              <View key={l} style={rowStyle}>
                <LeagueIcon league={l} />
                <Text style={{ flex: 1, fontSize: 16 }}>{LEAGUE_TITLES[l]}</Text>
                <Switch value={leagues.includes(l)} onValueChange={() => toggleLeague(l)} disabled={leagues.length === 1 && leagues.includes(l)} />
              </View>
            ))}
          </Rows>
        </Section>

        <Section title="Favorite teams">
          <Link href="/settings/teams" asChild>
            <Pressable style={rowStyle}>
              <Text style={{ flex: 1, fontSize: 16 }}>Favorite teams</Text>
              <Muted style={{ fontSize: 15 }}>{favs.length}</Muted>
              <SymbolView name="chevron.right" size={13} tintColor={colors.faint} />
            </Pressable>
          </Link>
        </Section>

        <Section title="Fantasy" footer={sleeper ? 'Turn off a league to hide it from the Fantasy tab.' : 'Add your Sleeper username to see your fantasy football leagues.'}>
          {sleeper && !editing ? (
            <Rows>
              <View style={rowStyle}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16 }}>{sleeper.displayName ?? sleeper.username}</Text>
                  <Muted style={{ fontSize: 13 }}>@{sleeper.username}</Muted>
                </View>
                <Pressable hitSlop={8} onPress={() => setEditing(true)}>
                  <Text style={{ fontSize: 15, color: colors.muted }}>Change</Text>
                </Pressable>
                <Pressable hitSlop={8} onPress={() => setSleeper(undefined)}>
                  <Text style={{ fontSize: 15, color: colors.live }}>Remove</Text>
                </Pressable>
              </View>
              {mine.isPending ? <Loading /> : null}
              {mine.isError ? <Muted style={{ padding: 16, fontSize: 14 }}>Couldn’t load your leagues.</Muted> : null}
              {mine.all?.length === 0 ? <Muted style={{ padding: 16, fontSize: 14 }}>No Sleeper leagues this season.</Muted> : null}
              {mine.all?.map((l) => (
                <View key={l.id} style={rowStyle}>
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 16 }}>{l.name}</Text>
                  <Switch value={!hiddenFantasy.includes(l.id)} onValueChange={() => toggleFantasyLeague(l.id)} />
                </View>
              ))}
            </Rows>
          ) : (
            <View>
              <SleeperLookup initial={sleeper?.username} cta="Save" onDone={() => setEditing(false)} padded />
              {sleeper ? (
                <Pressable onPress={() => setEditing(false)} style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
                  <Muted style={{ fontSize: 14 }}>Cancel</Muted>
                </Pressable>
              ) : null}
            </View>
          )}
        </Section>

        <Section title="About" footer="Scores · Data from ESPN and Sleeper">
          <Pressable style={rowStyle} onPress={() => setOnboarded(false)}>
            <Text style={{ flex: 1, fontSize: 16 }}>Show onboarding again</Text>
          </Pressable>
        </Section>
      </ScrollView>
    </>
  )
}
