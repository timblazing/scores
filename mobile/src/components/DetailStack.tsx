import { Stack } from 'expo-router'
import { colors } from '@/theme'

/** Stack used by every tab. Detail routes (game, team, player) are shared across tabs. */
// Detail pages draw their team-color hero under the status bar, so the header has no background of its own.
const detail = {
  title: '',
  headerTransparent: true,
  headerStyle: { backgroundColor: 'transparent' },
  headerBackButtonDisplayMode: 'minimal',
  scrollEdgeEffects: { top: 'hidden' },
} as const

export function DetailStack() {
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.bg }, headerTintColor: colors.fg }}>
      <Stack.Screen name="game/[league]/[id]" options={detail} />
      <Stack.Screen name="team/[league]/[id]" options={detail} />
      <Stack.Screen name="player/[league]/[id]" options={detail} />
    </Stack>
  )
}
