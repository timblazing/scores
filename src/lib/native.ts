import { Capacitor, registerPlugin } from '@capacitor/core'
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'

export const isNative = Capacitor.isNativePlatform()

/** Set by the iOS shell (ios/App/App/NativeTabs.swift) when it shows a system tab bar. */
export const hasNativeTabs = isNative && (window as { __NATIVE_TABS__?: boolean }).__NATIVE_TABS__ === true

const NativeTabs = registerPlugin<{
  select(o: { index: number }): Promise<void>
  setHidden(o: { hidden: boolean }): Promise<void>
}>('NativeTabs')

// Order must match `pages` in NativeTabs.swift.
const TABS = ['/', '/standings', '/teams', '/news']

export const setNativeTabsHidden = (hidden: boolean) => {
  if (hasNativeTabs) NativeTabs.setHidden({ hidden }).catch(() => {})
}

type TabEvent = CustomEvent<{ index?: number; reselect?: boolean; search?: boolean }>

/**
 * Keeps the native tab bar and the router in sync, iOS style: each tab remembers
 * where you were and its scroll position; tapping the current tab pops to its root,
 * or scrolls to the top when already there.
 */
export function useNativeTabs(onSearch: () => void) {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const active = useRef(0)
  const paths = useRef<string[]>([...TABS])
  const scroll = useRef<number[]>(TABS.map(() => 0))
  const restore = useRef<number | null>(null)

  useEffect(() => {
    if (!hasNativeTabs) return
    const root = TABS.indexOf(pathname)
    if (root >= 0 && root !== active.current) {
      active.current = root
      NativeTabs.select({ index: root }).catch(() => {})
    }
    paths.current[active.current] = pathname + search
    const y = restore.current
    restore.current = null
    window.scrollTo(0, y ?? 0)
    if (y) requestAnimationFrame(() => window.scrollTo(0, y))
  }, [pathname, search])

  useEffect(() => {
    if (!hasNativeTabs) return
    const onTab = (e: Event) => {
      const { index, reselect, search: openSearch } = (e as TabEvent).detail
      if (openSearch) return onSearch()
      if (index == null) return
      if (reselect) {
        if (pathname === TABS[index]) window.scrollTo({ top: 0, behavior: 'smooth' })
        else navigate(TABS[index])
        return
      }
      scroll.current[active.current] = window.scrollY
      active.current = index
      restore.current = scroll.current[index]
      // Replace, so Back on a detail page never jumps across tabs.
      navigate(paths.current[index], { replace: true })
    }
    window.addEventListener('nativetab', onTab)
    return () => window.removeEventListener('nativetab', onTab)
  }, [navigate, onSearch, pathname])
}
