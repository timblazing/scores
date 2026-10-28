import { Host, Picker, Text as SUIText } from '@expo/ui/swift-ui'
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers'
import { Image } from 'expo-image'
import * as Haptics from 'expo-haptics'
import { SymbolView } from 'expo-symbols'
import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, Text as RNText, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { toggleFavorite, useFavorites, type Favorite } from '@/lib/favorites'
import { card, colors, radius } from '@/theme'
import { useState } from 'react'

/** Text with the app's default color. Use `tnum` for tabular numerals. */
export function Text({ style, tnum, ...rest }: TextProps & { tnum?: boolean }) {
  return <RNText {...rest} style={[{ color: colors.fg, fontSize: 15 }, tnum && { fontVariant: ['tabular-nums'] }, style]} />
}

export const Muted = ({ style, ...rest }: TextProps & { tnum?: boolean }) => <Text {...rest} style={[{ color: colors.muted }, style]} />

export function Logo({ src, size = 32, style }: { src?: string; size?: number; style?: StyleProp<ViewStyle> }) {
  if (!src) return <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.raised }, style]} />
  return <Image source={src} style={[{ width: size, height: size }, style as object]} contentFit="contain" cachePolicy="memory-disk" recyclingKey={src} />
}

export function Headshot({ src, size = 40 }: { src?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.raised, overflow: 'hidden' }}>
      {src ? <Image source={src} style={{ width: size, height: size }} contentFit="cover" contentPosition="top" cachePolicy="memory-disk" /> : null}
    </View>
  )
}

export function Card({ children, title, action, style }: { children: ReactNode; title?: ReactNode; action?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[card, style]}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
          <Text style={{ fontSize: 17, fontWeight: '600' }}>{title}</Text>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  )
}

export function Divider({ inset = 0 }: { inset?: number }) {
  return <View style={{ height: 0.5, backgroundColor: colors.lineStrong, marginLeft: inset }} />
}

/** Rows separated by hairlines. */
export function Rows({ children }: { children: ReactNode[] | ReactNode }) {
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean)
  return (
    <>
      {items.map((c, i) => (
        <View key={i}>
          {i > 0 && <Divider />}
          {c}
        </View>
      ))}
    </>
  )
}

export function SectionTitle({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontSize: 20, fontWeight: '700', marginBottom: 8, marginLeft: 4 }, style]}>{children}</Text>
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <View style={[card, { padding: 28, alignItems: 'center' }]}>
      <Muted style={{ fontSize: 14, textAlign: 'center' }}>{children}</Muted>
    </View>
  )
}

export function Loading() {
  return (
    <View style={{ paddingVertical: 48, alignItems: 'center' }}>
      <ActivityIndicator color={colors.muted} />
    </View>
  )
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <View style={[card, { padding: 24, alignItems: 'center', gap: 6 }]}>
      <Text style={{ fontWeight: '600' }}>Couldn’t load this from ESPN.</Text>
      <Muted style={{ fontSize: 13, textAlign: 'center' }}>{error instanceof Error ? error.message : 'Check your connection and try again.'}</Muted>
      {retry && (
        <Pressable onPress={retry} style={{ marginTop: 10, backgroundColor: colors.raised, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 100 }}>
          <Text style={{ fontSize: 14, fontWeight: '600' }}>Try again</Text>
        </Pressable>
      )}
    </View>
  )
}

/** Filled triangle beside a score, pointing at the team with the ball. `side` is which team it points at. */
export function Possession({ side, color = colors.fg }: { side: 'left' | 'right'; color?: string }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: '50%', marginTop: -4, [side === 'left' ? 'left' : 'right']: '100%', [side === 'left' ? 'marginLeft' : 'marginRight']: 5 }}>
      <Svg width={6} height={8} viewBox="0 0 6 8">
        <Path d={side === 'left' ? 'M0 4 6 0v8z' : 'M6 4 0 0v8z'} fill={color} />
      </Svg>
    </View>
  )
}

export function FavButton({ fav, size = 18, color }: { fav: Favorite; size?: number; color?: string }) {
  const { isFav } = useFavorites()
  const on = isFav(fav.league, fav.id)
  return (
    <Pressable
      hitSlop={10}
      onPress={() => {
        Haptics.selectionAsync()
        toggleFavorite(fav)
      }}
      accessibilityRole="button"
      accessibilityLabel={on ? `Unfollow ${fav.name}` : `Follow ${fav.name}`}
      style={{ padding: 4 }}
    >
      <SymbolView name={on ? 'star.fill' : 'star'} size={size} tintColor={on ? colors.warn : (color ?? colors.faint)} />
    </Pressable>
  )
}

/**
 * Native SwiftUI segmented control. Falls back to a menu picker when there are too many options to fit.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  maxSegments = 5,
  width,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  maxSegments?: number
  width?: number
}) {
  const menu = options.length > maxSegments
  return (
    <Host style={{ height: menu ? 36 : 34, width: width ?? (menu ? 180 : undefined), alignSelf: menu ? 'flex-start' : 'stretch' }}>
      <Picker
        modifiers={[pickerStyle(menu ? 'menu' : 'segmented')]}
        label=""
        selection={value}
        onSelectionChange={(v) => {
          Haptics.selectionAsync()
          onChange(v as T)
        }}
      >
        {options.map((o) => (
          <SUIText key={o.value} modifiers={[tag(o.value)]}>
            {o.label}
          </SUIText>
        ))}
      </Picker>
    </Host>
  )
}

/** Pull-to-refresh control wired to an async refetch (shows the spinner only for user-initiated refreshes). */
export function usePullRefresh(refetch: () => Promise<unknown> | unknown) {
  const [refreshing, setRefreshing] = useState(false)
  return (
    <RefreshControl
      refreshing={refreshing}
      tintColor={colors.muted}
      onRefresh={async () => {
        setRefreshing(true)
        try {
          await refetch()
        } finally {
          setRefreshing(false)
        }
      }}
    />
  )
}

export const pageStyle = { paddingHorizontal: 12, paddingBottom: 32, gap: 20 } as const
export { colors, radius }
