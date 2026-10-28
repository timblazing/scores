import type { ReactNode } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { Link } from 'expo-router'
import { Text } from './ui'
import { colors } from '@/theme'

export interface TableRow {
  key: string
  /** Fixed first column content. */
  left: ReactNode
  cells: (string | undefined)[]
  href?: string
  /** Replaces the cells with a single muted note. */
  note?: string
  bold?: boolean
  topBorder?: 'dashed' | 'strong'
}

const ROW_H = 40
const HEAD_H = 28

/**
 * Table with a fixed first column and horizontally scrolling stat columns.
 * Rows have a fixed height so both panes stay aligned.
 */
export function StatTable({
  headLeft,
  headers,
  rows,
  leftWidth = 128,
  boldCols = [],
  minCol = 38,
}: {
  headLeft?: ReactNode
  headers: string[]
  rows: TableRow[]
  leftWidth?: number
  boldCols?: number[]
  minCol?: number
}) {
  const widths = headers.map((h, i) => {
    const longest = Math.max(h.length, ...rows.map((r) => (r.cells[i] ?? '').length))
    return Math.max(minCol, longest * 8 + 18)
  })
  const wrap = (r: TableRow, child: ReactNode) =>
    r.href ? (
      <Link key={r.key} href={r.href} asChild>
        <Pressable>{child}</Pressable>
      </Link>
    ) : (
      <View key={r.key}>{child}</View>
    )
  const border = (r: TableRow, i: number) => ({
    borderTopWidth: i === 0 ? 0 : 0.5,
    borderTopColor: colors.lineStrong,
    ...(r.topBorder === 'dashed' ? { borderStyle: 'dashed' as const, borderTopWidth: 1 } : null),
  })

  return (
    <View style={{ flexDirection: 'row', paddingBottom: 6 }}>
      <View style={{ width: leftWidth, zIndex: 1 }}>
        <View style={{ height: HEAD_H, justifyContent: 'center', paddingLeft: 16 }}>
          {typeof headLeft === 'string' ? <Text style={{ fontSize: 11, color: colors.faint }}>{headLeft}</Text> : headLeft}
        </View>
        {rows.map((r, i) =>
          wrap(
            r,
            <View style={[{ height: ROW_H, justifyContent: 'center', paddingLeft: 16, paddingRight: 6, backgroundColor: colors.surface }, border(r, i)]}>{r.left}</View>,
          ),
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 12 }} style={{ flex: 1 }}>
        <View>
          <View style={{ flexDirection: 'row', height: HEAD_H, alignItems: 'center' }}>
            {headers.map((h, i) => (
              <Text key={i} numberOfLines={1} style={{ width: widths[i], textAlign: 'center', fontSize: 11, color: colors.faint }}>
                {h}
              </Text>
            ))}
          </View>
          {rows.map((r, i) =>
            wrap(
              r,
              <View style={[{ flexDirection: 'row', height: ROW_H, alignItems: 'center' }, border(r, i)]}>
                {r.note ? (
                  <Text numberOfLines={1} style={{ fontSize: 12, color: colors.faint, paddingLeft: 8 }}>
                    {r.note}
                  </Text>
                ) : (
                  headers.map((_, c) => (
                    <Text
                      key={c}
                      tnum
                      numberOfLines={1}
                      style={{ width: widths[c], textAlign: 'center', fontSize: 14, color: r.bold || boldCols.includes(c) ? colors.fg : colors.muted, fontWeight: r.bold || boldCols.includes(c) ? '600' : '400' }}
                    >
                      {r.cells[c] ?? '-'}
                    </Text>
                  ))
                )}
              </View>,
            ),
          )}
        </View>
      </ScrollView>
    </View>
  )
}
