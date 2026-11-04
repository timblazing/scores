export const colors = {
  bg: '#000000',
  surface: '#121212',
  raised: '#1c1c1c',
  line: 'rgba(255,255,255,0.08)',
  lineStrong: 'rgba(255,255,255,0.16)',
  fg: '#f5f5f5',
  muted: '#a1a1a1',
  faint: '#6b6b6b',
  live: '#ff453a',
  win: '#30d158',
  warn: '#fcba00',
}

/** Position badge colors, from sleeper-fantasy-dashboard's dark position tokens. */
export const positions: Record<string, { fg: string; bg: string }> = {
  QB: { fg: '#f5867c', bg: 'rgba(120,32,38,0.55)' },
  RB: { fg: '#74d69c', bg: 'rgba(22,84,52,0.55)' },
  WR: { fg: '#8db6f5', bg: 'rgba(28,58,116,0.55)' },
  TE: { fg: '#ecc35e', bg: 'rgba(96,72,18,0.55)' },
}

export const radius = 20

export const scoreFont = 'BarlowCondensed_600SemiBold'

export const card = { backgroundColor: colors.surface, borderRadius: radius, borderCurve: 'continuous' as const, overflow: 'hidden' as const }
