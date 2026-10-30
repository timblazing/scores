import * as Haptics from 'expo-haptics'
import { SymbolView } from 'expo-symbols'
import { useState, type ReactNode } from 'react'
import { KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SleeperLookup } from '@/components/SleeperLookup'
import { TeamPicker } from '@/components/TeamPicker'
import { Card, LeagueIcon, Loading, Muted, Rows, Text } from '@/components/ui'
import { LEAGUE_IDS, LEAGUE_TITLES, type LeagueId } from '@/lib/espn'
import { setLeagues, setOnboarded, useSettings } from '@/lib/settings'
import { useMyFantasyLeagues } from '@/lib/useFantasy'
import { colors } from '@/theme'

function Heading({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={{ gap: 6, marginBottom: 20 }}>
      <Text style={{ fontSize: 30, fontWeight: '700' }}>{title}</Text>
      <Muted style={{ fontSize: 16 }}>{sub}</Muted>
    </View>
  )
}

function LeagueStep({ picked, onToggle }: { picked: LeagueId[]; onToggle: (l: LeagueId) => void }) {
  return (
    <View style={{ paddingHorizontal: 20 }}>
      <Heading title="Pick your leagues" sub="Welcome to Scores. Choose what to follow; you can change this later in Settings." />
      <View style={{ gap: 12 }}>
        {LEAGUE_IDS.map((l) => {
          const on = picked.includes(l)
          return (
            <Pressable
              key={l}
              onPress={() => {
                Haptics.selectionAsync()
                onToggle(l)
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18, borderRadius: 20, borderCurve: 'continuous', backgroundColor: colors.surface, borderWidth: 1.5, borderColor: on ? colors.fg : 'transparent' }}
            >
              <LeagueIcon league={l} size={28} color={on ? colors.fg : colors.muted} />
              <Text style={{ flex: 1, fontSize: 19, fontWeight: '600' }}>{LEAGUE_TITLES[l]}</Text>
              <SymbolView name={on ? 'checkmark.circle.fill' : 'circle'} size={26} tintColor={on ? colors.fg : colors.faint} />
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function TeamsStep({ leagues }: { leagues: LeagueId[] }) {
  const [q, setQ] = useState('')
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <Heading title="Favorite teams" sub="Their games are pinned to the top of Scores." />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search teams"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          style={{ height: 44, borderRadius: 12, borderCurve: 'continuous', paddingHorizontal: 14, fontSize: 16, color: colors.fg, backgroundColor: colors.raised, marginBottom: 12 }}
        />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24, gap: 12 }}>
        <TeamPicker leagues={leagues} query={q} />
      </ScrollView>
    </View>
  )
}

function SleeperStep() {
  const { sleeper } = useSettings()
  const mine = useMyFantasyLeagues()
  return (
    <View style={{ paddingHorizontal: 20, gap: 16 }}>
      <Heading title="Fantasy football" sub="Add your Sleeper username to follow your leagues' matchups and standings." />
      <SleeperLookup initial={sleeper?.username} cta="Find" />
      {sleeper ? (
        <Card>
          <View style={{ padding: 16, gap: 2 }}>
            <Text style={{ fontSize: 17, fontWeight: '600' }}>{sleeper.displayName ?? sleeper.username}</Text>
            <Muted style={{ fontSize: 13 }}>@{sleeper.username}</Muted>
          </View>
          {mine.isPending ? <Loading /> : null}
          {mine.all?.length === 0 ? <Muted style={{ padding: 16, paddingTop: 0, fontSize: 14 }}>No Sleeper leagues this season.</Muted> : null}
          {mine.all?.length ? (
            <Rows>
              {mine.all.map((l) => (
                <Text key={l.id} numberOfLines={1} style={{ paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 }}>{l.name}</Text>
              ))}
            </Rows>
          ) : null}
        </Card>
      ) : null}
    </View>
  )
}

function Dots({ count, index }: { count: number; index: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 7 }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: i === index ? colors.fg : colors.lineStrong }} />
      ))}
    </View>
  )
}

function TextButton({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return (
    <Pressable hitSlop={12} onPress={onPress}>
      <Text style={{ fontSize: 16, color: colors.muted }}>{children}</Text>
    </Pressable>
  )
}

export default function Onboarding() {
  const insets = useSafeAreaInsets()
  const settings = useSettings()
  const [picked, setPicked] = useState<LeagueId[]>(settings.leagues)
  const [step, setStep] = useState(0)
  const steps = picked.includes('nfl') ? 3 : 2
  const last = step === steps - 1
  const finish = () => setOnboarded(true)
  const next = () => {
    if (step === 0) setLeagues(picked)
    if (last) finish()
    else setStep(step + 1)
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, marginTop: insets.top + 8, paddingHorizontal: 20 }}>
        <View style={{ width: 60, alignItems: 'flex-start' }}>{step > 0 ? <TextButton onPress={() => setStep(step - 1)}>Back</TextButton> : null}</View>
        <Dots count={steps} index={step} />
        <View style={{ width: 60, alignItems: 'flex-end' }}>{step > 0 ? <TextButton onPress={next}>Skip</TextButton> : null}</View>
      </View>
      {step === 1 ? (
        <TeamsStep leagues={picked} />
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 24, paddingBottom: 24 }}>
          {step === 0 ? <LeagueStep picked={picked} onToggle={(l) => setPicked(LEAGUE_IDS.filter((x) => (x === l ? !picked.includes(x) : picked.includes(x))))} /> : <SleeperStep />}
        </ScrollView>
      )}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 16) }}>
        <Pressable
          onPress={next}
          disabled={step === 0 && !picked.length}
          style={{ height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fg, opacity: step === 0 && !picked.length ? 0.4 : 1 }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.bg }}>{last ? 'Get started' : 'Continue'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}
