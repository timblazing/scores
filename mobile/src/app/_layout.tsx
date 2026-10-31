import { BarlowCondensed_600SemiBold, useFonts } from '@expo-google-fonts/barlow-condensed'
import { QueryClientProvider } from '@tanstack/react-query'
import { DarkTheme, ThemeProvider } from 'expo-router'
import { NativeTabs } from 'expo-router/native-tabs'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { queryClient, subscribeAppFocus } from '@/lib/query'
import Onboarding from '@/screens/Onboarding'
import { useSettings } from '@/lib/settings'
import { colors } from '@/theme'

SplashScreen.preventAutoHideAsync()

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, border: colors.line, primary: colors.fg, text: colors.fg },
}

export default function RootLayout() {
  const { onboarded } = useSettings()
  const [loaded, error] = useFonts({ BarlowCondensed_600SemiBold })
  useEffect(subscribeAppFocus, [])
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync()
  }, [loaded, error])
  if (!loaded && !error) return null

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        {onboarded ? (
          // Screens set their own inset behavior; detail pages draw under the header with "never".
          <NativeTabs tintColor={colors.fg}>
            <NativeTabs.Trigger name="(scores)" disableAutomaticContentInsets>
              <NativeTabs.Trigger.Label>Scores</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon sf="sportscourt" />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(fantasy)" disableAutomaticContentInsets>
              <NativeTabs.Trigger.Label>Fantasy</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon sf="football" />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(search)" role="search" disableAutomaticContentInsets>
              <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
          </NativeTabs>
        ) : (
          <Onboarding />
        )}
      </ThemeProvider>
    </QueryClientProvider>
  )
}
