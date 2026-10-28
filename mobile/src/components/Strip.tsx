import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, View, type ScrollViewInstance } from 'react-native'
import { Text } from './ui'
import { colors } from '@/theme'

export interface StripItem {
  key: string
  top: string
  bottom: string
}

export const STRIP_HEIGHT = 52

/**
 * Horizontally scrolling date/week picker pinned under the header, styled like the web app: a full-width
 * dark bar with a hairline bottom edge and an underline on the selected item, which is kept centered.
 * `top` is the header height; the bar's background also covers the header area above it.
 */
export function Strip({ items, selected, onSelect, itemWidth = 76, top }: { items: StripItem[]; selected?: string; onSelect: (key: string) => void; itemWidth?: number; top: number }) {
  const ref = useRef<ScrollViewInstance>(null)
  const [width, setWidth] = useState(0)
  const idx = items.findIndex((i) => i.key === selected)
  const first = useRef(true)

  useEffect(() => {
    if (idx < 0 || !width) return
    const x = Math.max(0, idx * itemWidth - (width - itemWidth) / 2)
    ref.current?.scrollTo({ x, animated: !first.current })
    first.current = false
  }, [idx, width, itemWidth, items.length])

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, paddingTop: top, zIndex: 10 }}>
      <BlurView tint="dark" intensity={40} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)' }} />
      <View style={{ height: STRIP_HEIGHT, borderBottomWidth: 0.5, borderBottomColor: colors.line }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false}>
          {items.map((it) => {
            const on = it.key === selected
            return (
              <Pressable
                key={it.key}
                onPress={() => {
                  if (!on) Haptics.selectionAsync()
                  onSelect(it.key)
                }}
                style={{
                  width: itemWidth,
                  height: STRIP_HEIGHT,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottomWidth: 2,
                  borderBottomColor: on ? colors.fg : 'transparent',
                }}
              >
                <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: on ? colors.fg : colors.faint }}>
                  {it.top}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 11, color: on ? colors.fg : colors.faint }}>
                  {it.bottom}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>
    </View>
  )
}
