export const ymd = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`

export const fromYmd = (s: string) => new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)))

export const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export const todayYmd = () => ymd(new Date())

export function dayLabel(s: string) {
  const diff = Math.round((fromYmd(s).getTime() - fromYmd(todayYmd()).getTime()) / 864e5)
  if (diff === 0) return 'Today'
  if (diff === -1) return 'Yesterday'
  if (diff === 1) return 'Tomorrow'
  return fromYmd(s).toLocaleDateString(undefined, { weekday: 'short' })
}

export const shortDate = (s: string) => fromYmd(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export const time = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export const monthDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })

export function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 6e4)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Lift very dark team colors so they read on black. */
export function readable(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  if (lum > 0.18) return hex
  const mix = (c: number) => Math.round(c + (255 - c) * 0.35)
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`
}
