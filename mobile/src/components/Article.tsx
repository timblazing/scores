import { Image } from 'expo-image'
import * as WebBrowser from 'expo-web-browser'
import { Pressable, View } from 'react-native'
import type { Article as A } from '@/lib/espn'
import { ago } from '@/lib/format'
import { Muted, Text } from './ui'
import { card, colors } from '@/theme'

export const openUrl = (url?: string) => url && WebBrowser.openBrowserAsync(url, { controlsColor: colors.fg })

export function Article({ a, lead }: { a: A; lead?: boolean }) {
  const meta = [ago(a.published), a.teams.slice(0, 2).join(', ')].filter(Boolean).join(' · ')
  return (
    <Pressable onPress={() => openUrl(a.url)} style={({ pressed }) => [card, pressed && { backgroundColor: colors.raised }, !lead && { flexDirection: 'row', gap: 12, padding: 12 }]}>
      {a.image ? (
        <Image
          source={a.image}
          cachePolicy="memory-disk"
          contentFit="cover"
          style={lead ? { width: '100%', aspectRatio: 16 / 9 } : { width: 96, height: 96, borderRadius: 14, borderCurve: 'continuous' }}
        />
      ) : null}
      <View style={lead ? { padding: 16 } : { flex: 1 }}>
        <Text style={{ fontWeight: '600', fontSize: lead ? 20 : 15, lineHeight: lead ? 26 : 20 }}>{a.headline}</Text>
        {a.description ? (
          <Muted numberOfLines={lead ? undefined : 2} style={{ fontSize: 13, lineHeight: 18, marginTop: 4 }}>
            {a.description}
          </Muted>
        ) : null}
        <Text style={{ fontSize: 12, color: colors.faint, marginTop: 8 }}>{meta}</Text>
      </View>
    </Pressable>
  )
}
