import { LinearGradient } from 'expo-linear-gradient'
import { Image } from 'expo-image'
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/** Height of the transparent native header: status bar inset plus the 44pt bar. */
export function useHeaderInset() {
  return useSafeAreaInsets().top + 44
}

/** Mix a color toward black. `amount` is the share of the original kept. */
export function shade(color: string, amount: number) {
  let r = 51, g = 51, b = 51
  const m = color.match(/\d+/g)
  if (color.startsWith('#')) {
    const n = parseInt(color.slice(1), 16)
    r = (n >> 16) & 255
    g = (n >> 8) & 255
    b = n & 255
  } else if (m && m.length >= 3) [r, g, b] = m.slice(0, 3).map(Number)
  return `rgb(${Math.round(r * amount)},${Math.round(g * amount)},${Math.round(b * amount)})`
}

/**
 * Full-bleed team-color gradient that runs under the transparent header and status bar.
 * Place it as the first child of a ScrollView with contentInsetAdjustmentBehavior="never".
 */
export function Hero({
  colors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  locations,
  watermarks = [],
  children,
  bottom = 20,
}: {
  colors: [string, string, ...string[]]
  start?: { x: number; y: number }
  end?: { x: number; y: number }
  locations?: [number, number, ...number[]]
  watermarks?: { src?: string; side: 'left' | 'right' }[]
  children: ReactNode
  bottom?: number
}) {
  const top = useHeaderInset()
  return (
    <View style={{ overflow: 'hidden', paddingTop: top, paddingBottom: bottom }}>
      <LinearGradient colors={colors} start={start} end={end} locations={locations} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      {watermarks.map((w, i) =>
        w.src ? (
          <Image
            key={i}
            source={w.src}
            contentFit="contain"
            pointerEvents="none"
            style={{ position: 'absolute', top: '50%', marginTop: -130, width: 260, height: 260, opacity: 0.09, [w.side]: -90 }}
          />
        ) : null,
      )}
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 60 }} pointerEvents="none" />
      {children}
    </View>
  )
}
