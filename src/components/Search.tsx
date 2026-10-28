import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { Search as SearchIcon, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Headshot, Logo } from '@/components/ui'
import { getTeams, LEAGUE_IDS, LEAGUES, searchPlayers, teamLogo, type LeagueId, type TeamLite } from '@/lib/espn'
import { useFavorites } from '@/lib/favorites'
import { setNativeTabsHidden } from '@/lib/native'

const OPEN_EVENT = 'scores:search'

export const openSearch = () => window.dispatchEvent(new Event(OPEN_EVENT))

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** Field-styled button that opens the search dialog. */
export function SearchTrigger({ className, shortcut, label = 'Search teams and players' }: { className?: string; shortcut?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={openSearch}
      aria-haspopup="dialog"
      className={clsx(
        'flex w-full items-center gap-2.5 rounded-xl bg-surface px-3 py-2.5 text-left text-[15px] text-faint transition-colors hover:text-muted',
        className,
      )}
    >
      <SearchIcon size={17} strokeWidth={2} />
      <span className="flex-1 truncate">{label}</span>
      {shortcut && <kbd className="rounded-md border border-line-strong px-1.5 font-sans text-[11px] text-faint">{isMac ? '⌘K' : 'Ctrl K'}</kbd>}
    </button>
  )
}

type Item =
  | { kind: 'team'; key: string; league: LeagueId; id: string; abbr: string; name: string }
  | { kind: 'player'; key: string; league: LeagueId; id: string; name: string; meta: string; headshot?: string }

const href = (i: Item) => `/${i.league}/${i.kind}/${i.id}`

function scoreTeam(t: TeamLite, term: string) {
  const name = t.displayName.toLowerCase()
  if (t.abbr.toLowerCase() === term || t.name.toLowerCase() === term) return 3
  if (name.startsWith(term) || name.split(' ').some((w) => w.startsWith(term))) return 2
  return term.length >= 4 && name.includes(term) ? 1 : 0
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export function SearchDialog() {
  const ref = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const listId = useId()
  const { favs } = useFavorites()

  const show = () => {
    if (ref.current?.open) return
    ref.current?.showModal()
    setOpen(true)
    input.current?.focus()
  }
  const close = () => ref.current?.close()

  useEffect(() => setNativeTabsHidden(open), [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        show()
      }
    }
    window.addEventListener(OPEN_EVENT, show)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener(OPEN_EVENT, show)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  // Close when the route changes (e.g. browser back while open).
  useEffect(() => {
    close()
  }, [pathname])

  const term = q.trim().toLowerCase()
  const debounced = useDebounced(term, 200)

  const teams = useQueries({
    queries: LEAGUE_IDS.map((l) => ({ queryKey: ['teams', l], queryFn: () => getTeams(l), staleTime: Infinity, enabled: open })),
  })
  const players = useQuery({
    queryKey: ['search-players', debounced],
    queryFn: ({ signal }) => searchPlayers(debounced, signal),
    enabled: open && debounced.length >= 2,
    staleTime: 10 * 60_000,
    placeholderData: keepPreviousData,
  })

  const teamItems: Item[] = !term
    ? []
    : teams
      .flatMap((r) => r.data ?? [])
      .map((t) => ({ t, s: scoreTeam(t, term) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.t.displayName.localeCompare(b.t.displayName))
      .slice(0, 6)
        .map(({ t }) => ({ kind: 'team', key: `t-${t.league}-${t.id}`, league: t.league, id: t.id, abbr: t.abbr, name: t.displayName }))

  const playersFresh = term.length >= 2 && players.data && debounced === term
  const playerItems: Item[] =
    term.length >= 2 && players.data
      ? players.data.slice(0, 8).map((p) => ({
          kind: 'player',
          key: `p-${p.league}-${p.id}`,
          league: p.league,
          id: p.id,
          name: p.name,
          meta: [p.position, p.team ?? 'Free agent'].filter(Boolean).join(' · '),
          headshot: p.headshot,
        }))
      : []

  const favItems: Item[] = term
    ? []
    : favs.map((f) => ({ kind: 'team', key: `f-${f.league}-${f.id}`, league: f.league, id: f.id, abbr: f.abbr, name: f.name }))

  const items = term ? [...teamItems, ...playerItems] : favItems
  const searching = term.length >= 2 && (debounced !== term || players.isFetching)

  useEffect(() => {
    setActive(0)
  }, [term])

  const go = (i: Item | undefined) => {
    if (!i) return
    close()
    navigate(href(i))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!items.length) return
      const next = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
      setActive(next)
      document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(items[active])
    }
  }

  const option = (i: Item, idx: number) => (
    <div
      key={i.key}
      id={`${listId}-${idx}`}
      role="option"
      aria-selected={idx === active}
      onMouseMove={() => setActive(idx)}
      onClick={() => go(i)}
      className={clsx('flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2', idx === active && 'bg-raised')}
    >
      {i.kind === 'team' ? (
        <span className="grid size-9 place-items-center">
          <Logo src={teamLogo(i.league, i.abbr, 64, i.id)} alt="" size={28} />
        </span>
      ) : (
        <Headshot src={i.headshot} alt="" size={36} />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{i.name}</span>
        {i.kind === 'player' && <span className="block truncate text-[12px] text-muted">{i.meta}</span>}
      </span>
      <span className="text-[11px] font-semibold text-faint">{LEAGUES[i.league].name}</span>
    </div>
  )

  let idx = 0
  const section = (title: string, list: Item[], extra?: ReactNode) =>
    list.length > 0 && (
      <div role="group" aria-label={title} className="py-1">
        <div className="flex items-center justify-between px-3 pt-2 pb-1 text-[12px] font-semibold text-muted">
          {title}
          {extra}
        </div>
        {list.map((i) => option(i, idx++))}
      </div>
    )

  return (
    <dialog
      ref={ref}
      aria-label="Search teams and players"
      onClose={() => {
        setOpen(false)
        setQ('')
      }}
      onClick={(e) => {
        if (e.target === ref.current) close()
      }}
      className="m-0 h-dvh p-0 max-h-none w-full max-w-none bg-bg text-fg backdrop:bg-black/70 backdrop:backdrop-blur-sm lg:mx-auto lg:mt-[12vh] lg:h-fit lg:max-h-[70vh] lg:w-[560px] lg:overflow-hidden lg:rounded-card lg:border lg:border-line-strong lg:bg-surface"
    >
      <div className="flex h-full flex-col pt-safe lg:max-h-[70vh] lg:pt-0">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
          <label className="flex flex-1 items-center gap-2 rounded-xl bg-surface px-3 py-2 lg:bg-transparent lg:px-1">
            <SearchIcon size={17} className="shrink-0 text-faint" />
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Teams and players"
              className="w-full bg-transparent text-[16px] outline-none placeholder:text-faint"
              type="text"
              inputMode="search"
              enterKeyHint="go"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              role="combobox"
              aria-expanded={items.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={items.length ? `${listId}-${active}` : undefined}
            />
            {q && (
              <button type="button" onClick={() => (setQ(''), input.current?.focus())} aria-label="Clear search" className="text-faint hover:text-fg">
                <X size={16} />
              </button>
            )}
          </label>
          <button type="button" onClick={close} className="px-1 text-[15px] font-medium text-muted hover:text-fg lg:hidden">
            Cancel
          </button>
          <kbd className="hidden rounded-md border border-line-strong px-1.5 font-sans text-[11px] text-faint lg:block">esc</kbd>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          <div id={listId} role="listbox" aria-label="Results">
            {section('My Teams', favItems)}
            {section('Teams', teamItems)}
            {section('Players', playerItems, searching && <span className="font-normal text-faint">Searching…</span>)}
          </div>

          {!term && !favs.length && (
            <p className="px-3 py-6 text-center text-[14px] text-muted">Search for a team or player. Teams you star show up here.</p>
          )}
          {term.length === 1 && !teamItems.length && <p className="px-3 py-6 text-center text-[14px] text-muted">Keep typing to search players.</p>}
          {term.length >= 2 && !searching && playersFresh && !items.length && (
            <p className="px-3 py-6 text-center text-[14px] text-muted">No NFL or NBA teams or players match “{q.trim()}”.</p>
          )}
          {term.length >= 2 && !playerItems.length && searching && !teamItems.length && (
            <p className="px-3 py-6 text-center text-[14px] text-faint">Searching…</p>
          )}
          {players.isError && <p className="px-3 py-3 text-center text-[13px] text-muted">Player search is unavailable right now. Team results still work.</p>}
        </div>
      </div>
    </dialog>
  )
}
