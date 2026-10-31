import { Stack } from 'expo-router'
import { colors } from '@/theme'

export default function FantasyLayout() {
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.bg }, headerTintColor: colors.fg }}>
      <Stack.Screen name="matchup/[league]/[week]/[id]" options={{ headerBackButtonDisplayMode: 'minimal' }} />
      <Stack.Screen name="fplayer/[id]" options={{ headerBackButtonDisplayMode: 'minimal', title: '' }} />
    </Stack>
  )
}
