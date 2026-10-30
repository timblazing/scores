import { Stack } from 'expo-router'
import { useState } from 'react'
import { ScrollView } from 'react-native'
import { TeamPicker } from '@/components/TeamPicker'
import { useSettings } from '@/lib/settings'

export default function SettingsTeamsScreen() {
  const { leagues } = useSettings()
  const [q, setQ] = useState('')
  return (
    <>
      <Stack.Title>Favorite Teams</Stack.Title>
      <Stack.SearchBar placement="automatic" placeholder="Search teams" autoCapitalize="none" onChangeText={(e) => setQ(e.nativeEvent.text)} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 60, gap: 12 }}>
        <TeamPicker leagues={leagues} query={q} />
      </ScrollView>
    </>
  )
}
