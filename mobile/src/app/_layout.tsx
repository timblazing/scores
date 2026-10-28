import { BarlowCondensed_600SemiBold, useFonts } from '@expo-google-fonts/barlow-condensed'
import { QueryClientProvider } from '@tanstack/react-query'
import { DarkTheme, ThemeProvider } from 'expo-router'
import { NativeTabs } from 'expo-router/native-tabs'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { queryClient, subscribeAppFocus } from '@/lib/query'
import { colors } from '@/theme'

SplashScreen.preventAutoHideAsync()

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, border: colors.line, primary: colors.fg, text: colors.fg },
}

export default function RootLayout() {
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
        {/* Screens set their own inset behavior; detail pages draw under the header with "never". */}
        <NativeTabs tintColor={colors.fg}>
          <NativeTabs.Trigger name="(home)" disableAutomaticContentInsets>
            <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf="house" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="(favorites)" disableAutomaticContentInsets>
            <NativeTabs.Trigger.Label>Favorites</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf="star" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="(search)" role="search" disableAutomaticContentInsets>
            <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        </NativeTabs>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
