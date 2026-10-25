import clsx from 'clsx'
import { CalendarDays, ListOrdered, Newspaper, Shield } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { SearchDialog, SearchTrigger } from './Search'

const NAV = [
  { to: '/', label: 'Scores', icon: CalendarDays, end: true },
  { to: '/standings', label: 'Standings', icon: ListOrdered },
  { to: '/teams', label: 'Teams', icon: Shield },
  { to: '/news', label: 'News', icon: Newspaper },
]

export function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl lg:gap-8 lg:px-6">
      <div className="fixed inset-x-0 top-0 z-50 h-[env(safe-area-inset-top)] bg-bg" aria-hidden />
      <aside className="sticky top-0 hidden h-dvh w-52 shrink-0 flex-col py-6 lg:flex">
        <NavLink to="/" className="mb-8 flex items-center gap-2 px-3 text-lg font-bold tracking-tight">
          <img src="/icon.svg" alt="" className="size-7" />
          Scores
        </NavLink>
        <SearchTrigger shortcut label="Search" className="mb-4" />
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors',
                  isActive ? 'bg-surface text-fg' : 'text-muted hover:text-fg',
                )
              }
            >
              <Icon size={19} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 pt-safe pb-[calc(76px+env(safe-area-inset-bottom))] lg:pt-2 lg:pb-12">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/85 pb-safe backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx('flex flex-1 flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-medium', isActive ? 'text-fg' : 'text-faint')
              }
            >
              <Icon size={22} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      <SearchDialog />
    </div>
  )
}

export function Back({ className }: { className?: string }) {
  return (
    <button
      onClick={() => (history.length > 1 ? history.back() : (location.href = '/'))}
      className={clsx('grid size-9 place-items-center rounded-full bg-black/30 backdrop-blur', className)}
      aria-label="Back"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="m15 18-6-6 6-6" />
      </svg>
    </button>
  )
}
