import { GlassView } from 'expo-glass-effect'
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

export const STRIP_HEIGHT = 56

/** Horizontally scrolling date/week picker on a glass bar; the selected item is kept centered. */
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
    <View style={{ position: 'absolute', left: 12, right: 12, top, height: STRIP_HEIGHT, zIndex: 10 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <GlassView glassEffectStyle="regular" style={{ flex: 1, borderRadius: STRIP_HEIGHT / 2, borderCurve: 'continuous', overflow: 'hidden' }}>
        <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 6 }}>
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
                  width: itemWidth - 4,
                  marginHorizontal: 2,
                  height: STRIP_HEIGHT - 12,
                  borderRadius: (STRIP_HEIGHT - 12) / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? 'rgba(255,255,255,0.18)' : 'transparent',
                }}
              >
                <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: on ? colors.fg : colors.muted }}>
                  {it.top}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 11, color: on ? colors.muted : colors.faint }}>
                  {it.bottom}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </GlassView>
    </View>
  )
}
