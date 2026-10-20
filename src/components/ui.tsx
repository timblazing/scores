import clsx from 'clsx'
import { Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { toggleFavorite, useFavorites, type Favorite } from '@/lib/favorites'

export function Logo({ src, alt, size = 32, className }: { src?: string; alt: string; size?: number; className?: string }) {
  if (!src) return <div style={{ width: size, height: size }} className={clsx('rounded-full bg-raised', className)} />
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={clsx('shrink-0 object-contain', className)}
      style={{ width: size, height: size }}
    />
  )
}

export function Headshot({ src, alt, size = 40 }: { src?: string; alt: string; size?: number }) {
  return (
    <div className="shrink-0 overflow-hidden rounded-full bg-raised" style={{ width: size, height: size }}>
      {src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover object-top"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      )}
    </div>
  )
}

export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={clsx('rounded-card bg-surface', className)}>
      {title && (
        <header className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  className?: string
}) {
  return (
    <div role="tablist" className={clsx('flex rounded-full bg-raised p-1 text-sm', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 font-medium whitespace-nowrap transition-colors',
            value === o.value ? 'bg-fg text-bg' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Underlined text tabs for page sections. */
export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div role="tablist" className="no-scrollbar flex gap-5 overflow-x-auto border-b border-line px-4">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            '-mb-px border-b-2 py-3 text-[15px] font-medium whitespace-nowrap transition-colors',
            value === o.value ? 'border-fg text-fg' : 'border-transparent text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function FavButton({ fav, className, size = 18 }: { fav: Favorite; className?: string; size?: number }) {
  const { isFav } = useFavorites()
  const on = isFav(fav.league, fav.id)
  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleFavorite(fav)
      }}
      aria-pressed={on}
      aria-label={on ? `Unfollow ${fav.name}` : `Follow ${fav.name}`}
      className={clsx('grid place-items-center rounded-full p-2 transition-colors', on ? 'text-fg' : 'text-faint hover:text-muted', className)}
    >
      <Star size={size} fill={on ? 'currentColor' : 'none'} strokeWidth={1.75} />
    </button>
  )
}

export function LiveDot() {
  return <span className="live-dot inline-block size-1.5 rounded-full bg-live" aria-hidden />
}

export function Loading({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-card bg-surface" />
      ))}
    </div>
  )
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div className="rounded-card bg-surface p-6 text-center">
      <p className="font-medium">Couldn't load this from ESPN.</p>
      <p className="mt-1 text-sm text-muted">{error instanceof Error ? error.message : 'Check your connection and try again.'}</p>
      {retry && (
        <button onClick={retry} className="mt-4 rounded-full bg-raised px-4 py-2 text-sm font-medium hover:bg-line-strong">
          Try again
        </button>
      )}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-card bg-surface p-8 text-center text-sm text-muted">{children}</div>
}

export function PageHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 lg:px-0">
      <h1 className="text-[28px] font-bold tracking-tight">{title}</h1>
      {children}
    </div>
  )
}

/**
 * Oversized, low-opacity team logo for team-color gradient headers. Bleeds off the
 * given edge and fades toward the content so it never competes with text.
 * The parent must be `relative overflow-hidden`; content above it needs `relative`.
 */
export function Watermark({ src, side = 'right' }: { src?: string; side?: 'left' | 'right' }) {
  if (!src) return null
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      draggable={false}
      onError={(e) => (e.currentTarget.style.display = 'none')}
      className={clsx(
        'pointer-events-none absolute top-1/2 size-[240px] -translate-y-1/2 object-contain opacity-[0.09] select-none sm:size-[320px]',
        side === 'right' ? '-right-24 sm:-right-16' : '-left-24 sm:-left-16',
      )}
      style={{ maskImage: `linear-gradient(to ${side === 'right' ? 'left' : 'right'}, #000 30%, transparent 90%)` }}
    />
  )
}
