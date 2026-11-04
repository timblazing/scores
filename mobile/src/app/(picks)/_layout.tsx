import { Stack } from 'expo-router'
import { colors } from '@/theme'

export default function PicksLayout() {
  return <Stack screenOptions={{ contentStyle: { backgroundColor: colors.bg }, headerTintColor: colors.fg }} />
}
