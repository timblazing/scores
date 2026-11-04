import { Stack } from 'expo-router'
import { colors } from '@/theme'

export const unstable_settings = { initialRouteName: 'settings/index' }

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.bg }, headerTintColor: colors.fg }}>
      <Stack.Screen name="settings/index" options={{ headerShown: false }} />
    </Stack>
  )
}
