import clsx from 'clsx'
import type { Article as A } from '@/lib/espn'
import { ago } from '@/lib/format'

export function Article({ a, lead }: { a: A; lead?: boolean }) {
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noreferrer"
      className={clsx('group overflow-hidden rounded-card bg-surface transition-colors hover:bg-raised', lead ? 'sm:col-span-2' : 'flex gap-3 p-3 sm:block sm:p-0')}
    >
      {a.image && (
        <img
          src={a.image}
          alt=""
          loading="lazy"
          className={clsx('object-cover', lead ? 'aspect-video w-full' : 'aspect-square w-24 shrink-0 rounded-xl sm:aspect-video sm:w-full sm:rounded-none')}
        />
      )}
      <div className={clsx(lead ? 'p-4' : 'min-w-0 sm:p-4')}>
        <h3 className={clsx('font-semibold leading-snug tracking-tight', lead ? 'text-xl' : 'text-[15px]')}>{a.headline}</h3>
        {a.description && <p className={clsx('mt-1 text-[13px] leading-snug text-muted', lead ? '' : 'line-clamp-2')}>{a.description}</p>}
        <p className="mt-2 text-[12px] text-faint">{[ago(a.published), a.teams.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}</p>
      </div>
    </a>
  )
}
